const express = require("express");
const config = require("../config/env");
const { streamReply } = require("../lib/llm/chatService");
const { AppError } = require("../lib/errors");
const { chatLimiter } = require("../middleware/rateLimiter");
const { getSession, appendTurn, clearSession } = require("../lib/sessionStore");

const router = express.Router();

const ROLES = new Set(["user", "assistant"]);
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/** Validates + normalizes an incoming chat request body. Throws AppError
 * (caught by the route and forwarded to the error middleware) on anything
 * malformed, so bad input never reaches a provider call.
 *
 * Session-aware mode: if `sessionId` is provided in the body, `messages` only
 * needs to contain the single new user message — the server will merge in the
 * stored history.  The legacy mode (sending the full `messages` array without a
 * sessionId) continues to work unchanged for backward compatibility.
 */
function parseChatBody(body) {
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw new AppError('`messages` must be a non-empty array of { role, content }.', {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }

  if (body.messages.length > config.CHAT_MAX_MESSAGES) {
    throw new AppError(`Too many messages (max ${config.CHAT_MAX_MESSAGES}).`, {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }

  const messages = body.messages.map((m, i) => {
    if (!m || !ROLES.has(m.role) || typeof m.content !== "string") {
      throw new AppError(`Invalid message at index ${i}: expected { role: "user" | "assistant", content: string }.`, {
        status: 400,
        code: "VALIDATION_ERROR",
      });
    }
    const content = m.content.trim().replace(CONTROL_CHARS, "");
    if (!content) {
      throw new AppError(`Message at index ${i} is empty.`, { status: 400, code: "VALIDATION_ERROR" });
    }
    if (content.length > config.CHAT_MAX_MESSAGE_CHARS) {
      throw new AppError(`Message at index ${i} exceeds ${config.CHAT_MAX_MESSAGE_CHARS} characters.`, {
        status: 400,
        code: "VALIDATION_ERROR",
      });
    }
    return { role: m.role, content };
  });

  const provider = body.provider ?? config.DEFAULT_PROVIDER;
  if (typeof provider !== "string") {
    throw new AppError("`provider` must be a string.", { status: 400, code: "VALIDATION_ERROR" });
  }

  // Optional session ID — must be a safe alphanumeric/hyphen string if present.
  const sessionId = body.sessionId ?? null;
  if (sessionId !== null && (typeof sessionId !== "string" || !/^[\w-]+$/.test(sessionId) || sessionId.length > 128)) {
    throw new AppError("`sessionId` must be a non-empty alphanumeric/hyphen string (max 128 chars).", {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }

  return { messages, provider, sessionId };
}

/** Wires up an AbortController that fires on client disconnect or a
 * server-side max-duration timeout, whichever comes first — the one
 * signal both providers watch. */
function createRequestAbortController(req) {
  const controller = new AbortController();
  req.on("close", () => controller.abort());
  const timeout = setTimeout(() => controller.abort(), config.LLM_STREAM_TIMEOUT_MS);
  return { controller, clear: () => clearTimeout(timeout) };
}

function writeSseEvent(res, event, data) {
  if (res.writableEnded || res.destroyed) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`);
}

// POST /api/chat/stream — Server-Sent Events. Emits `delta` events as
// tokens arrive, then a final `done` event, or an `error` event if the
// reply fails before/during streaming.
//
// Session-aware: if the body includes a `sessionId`, the server merges
// the stored session history with the single new user message to build
// the full conversation context — the client no longer needs to re-send
// the entire message thread on every turn.
router.post("/stream", chatLimiter, async (req, res, next) => {
  let parsed;
  try {
    parsed = parseChatBody(req.body);
  } catch (err) {
    return next(err);
  }

  // ── Session history merge ──────────────────────────────────────────────
  // When a sessionId is supplied the client only sends the new user turn.
  // We retrieve the stored prior turns from the session store and prepend
  // them so the LLM sees the full conversation context.
  const { sessionId } = parsed;
  let messagesForLLM = parsed.messages;
  let userTurnContent = null;

  if (sessionId) {
    const storedTurns = getSession(sessionId);
    // The incoming `messages` array is exactly the new user turn (length 1).
    // Prepend stored history, but guard against the client accidentally
    // sending more than one turn in session mode.
    const newUserTurn = parsed.messages[parsed.messages.length - 1];
    userTurnContent = newUserTurn.content;
    messagesForLLM = [...storedTurns, newUserTurn];
    req.log.debug(
      { sessionId, storedTurns: storedTurns.length, totalTurns: messagesForLLM.length },
      "session: merged stored history with new user turn"
    );
  }
  // ──────────────────────────────────────────────────────────────────────

  const { controller, clear } = createRequestAbortController(req);
  const startedAt = Date.now();

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // disable reverse-proxy buffering (nginx etc.)
  });
  res.flushHeaders?.();

  // A write can still land after the client has disconnected (the socket
  // tears down asynchronously) — without a listener here, Node treats an
  // emitted 'error' on the response as uncaught and crashes the whole
  // process, taking every other in-flight request down with it. Logging
  // and swallowing it here is what keeps one dropped connection from
  // becoming a full outage.
  res.on("error", (err) => {
    req.log.warn({ err }, "chat stream response errored after send (client likely disconnected)");
  });

  // Keeps the connection alive through proxies/load balancers that kill
  // idle connections, without the client having to interpret it as data.
  // Guarded + cleared on disconnect so it can never fire a write against
  // an already-closed socket (see res.on("error") above for why that
  // matters).
  const heartbeat = setInterval(() => {
    if (res.writableEnded || res.destroyed) {
      clearInterval(heartbeat);
      return;
    }
    res.write(": ping\n\n");
  }, 15000);
  req.on("close", () => clearInterval(heartbeat));

  let sentAnyToken = false;
  let actualProvider = parsed.provider;
  let accumulatedAssistantReply = "";

  try {
    for await (const delta of streamReply({
      messages: messagesForLLM,
      providerName: parsed.provider,
      signal: controller.signal,
      ip: req.ip,
    })) {
      if (delta.startsWith("__ROUTE__:")) {
        try {
          const route = delta.slice(10);
          writeSseEvent(res, "route-classification", { route });
        } catch (e) {}
        continue;
      }
      if (delta.startsWith("__STRUCTURED_EVAL__:")) {
        try {
          const structuredEval = JSON.parse(delta.slice(20));
          writeSseEvent(res, "structured-eval", { structuredEval });
        } catch (e) {}
        continue;
      }
      if (delta.startsWith("__TOPICS__:")) {
        try {
          const topics = JSON.parse(delta.slice(11));
          writeSseEvent(res, "topic-tags", { topics });
        } catch (e) {}
        continue;
      }
      if (delta.startsWith("__PROVIDER__:")) {
        try {
          actualProvider = delta.slice(13);
          writeSseEvent(res, "provider", { provider: actualProvider });
        } catch (e) {}
        continue;
      }
      if (delta.startsWith("__AGENTS__:")) {
        try {
          const agents = JSON.parse(delta.slice(11));
          writeSseEvent(res, "agent-routing", { agents });
        } catch (e) {}
        continue;
      }
      if (delta.startsWith("__PLAN__:")) {
        try {
          const plan = JSON.parse(delta.slice(9));
          writeSseEvent(res, "execution-plan", { plan });
        } catch (e) {}
        continue;
      }
      if (delta.startsWith("__RAG_METRICS__:")) {
        try {
          const ragMetrics = JSON.parse(delta.slice(16));
          writeSseEvent(res, "rag-metrics", { ragMetrics });
        } catch (e) {}
        continue;
      }
      if (delta.startsWith("__TOOL_CALL__:")) {
        try {
          const toolCall = JSON.parse(delta.slice(14));
          writeSseEvent(res, "tool-call", { toolCall });
        } catch (e) {}
        continue;
      }
      if (delta.startsWith("__FOLLOW_UPS__:")) {
        try {
          const followUps = JSON.parse(delta.slice(15));
          writeSseEvent(res, "follow-ups", { followUps });
        } catch (e) {}
        continue;
      }
      sentAnyToken = true;
      accumulatedAssistantReply += delta;
      writeSseEvent(res, "delta", { text: delta });
    }

    // ── Persist completed turns to session store ───────────────────────
    if (sessionId && userTurnContent && accumulatedAssistantReply) {
      appendTurn(sessionId, "user", userTurnContent);
      appendTurn(sessionId, "assistant", accumulatedAssistantReply);
    }
    // ──────────────────────────────────────────────────────────────────

    writeSseEvent(res, "done", "[DONE]");
    req.log.info({ provider: actualProvider, ms: Date.now() - startedAt }, "chat stream completed");
  } catch (err) {
    req.log.error({ err: err.message, code: err?.code, name: err?.name }, "chat stream failed or aborted");
    if (sentAnyToken && accumulatedAssistantReply.trim().length > 0) {
      if (sessionId && userTurnContent) {
        appendTurn(sessionId, "user", userTurnContent);
        appendTurn(sessionId, "assistant", accumulatedAssistantReply);
      }
      writeSseEvent(res, "done", "[DONE]");
      req.log.info({ provider: actualProvider, ms: Date.now() - startedAt }, "chat stream completed gracefully after partial tokens");
    } else {
      writeSseEvent(res, "error", {
        message: err instanceof AppError
          ? err.message
          : err?.name === "AbortError"
            ? "Request timed out or was cancelled."
            : "The assistant hit an error generating a reply.",
        code: err?.name === "AbortError" ? "TIMEOUT" : err?.code || "STREAM_ERROR",
      });
    }
  } finally {
    clear();
    clearInterval(heartbeat);
    res.end();
  }
});

// DELETE /api/sessions/:sessionId — clears both the server session store and
// is the signal for the client to also wipe its localStorage copy.
// Called by the "Clear chat" action in the UI.
router.delete("/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  clearSession(sessionId);
  req.log.info({ sessionId }, "session cleared");
  res.status(204).end();
});

// POST /api/chat — same validation + provider abstraction as /stream, just
// buffered into a single JSON response for callers that don't want SSE.
router.post("/", chatLimiter, async (req, res, next) => {
  let parsed;
  try {
    parsed = parseChatBody(req.body);
  } catch (err) {
    return next(err);
  }

  const { controller, clear } = createRequestAbortController(req);

  try {
    let content = "";
    let agents = [];
    let plan = [];
    let followUps = [];
    let actualProvider = parsed.provider;

    for await (const delta of streamReply({
      messages: parsed.messages,
      providerName: parsed.provider,
      signal: controller.signal,
    })) {
      if (delta.startsWith("__")) {
        if (delta.startsWith("__PROVIDER__:")) {
          actualProvider = delta.slice(13);
        } else if (delta.startsWith("__AGENTS__:")) {
          try {
            agents = JSON.parse(delta.slice(11));
          } catch (e) {}
        } else if (delta.startsWith("__PLAN__:")) {
          try {
            plan = JSON.parse(delta.slice(9));
          } catch (e) {}
        } else if (delta.startsWith("__FOLLOW_UPS__:")) {
          try {
            followUps = JSON.parse(delta.slice(15));
          } catch (e) {}
        }
        continue;
      }
      content += delta;
    }
    res.json({ role: "assistant", content, provider: actualProvider, agents, plan, followUps });
  } catch (err) {
    next(err);
  } finally {
    clear();
  }
});

module.exports = router;
