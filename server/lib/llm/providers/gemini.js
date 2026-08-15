const { LLMError } = require("../../errors");
const { readSSE } = require("../sse");
const logger = require("../../logger");

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

/** Never log a raw key. Shows just enough (prefix/suffix + length) to
 * confirm *something* was loaded and roughly what it looks like, without
 * exposing anything sensitive. */
function maskApiKey(apiKey) {
  if (!apiKey) return "(none)";
  if (apiKey.length <= 8) return `${apiKey[0]}***(len ${apiKey.length})`;
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)} (len ${apiKey.length})`;
}

/** Gemini's error responses are JSON: { error: { code, message, status } }.
 * Pulls that out so we can log/report the *actual* reason instead of just
 * the HTTP status code. Falls back gracefully if the body isn't JSON
 * (e.g. an HTML error page from a proxy/CDN in front of the API). */
function parseGeminiError(bodyText) {
  try {
    const parsed = JSON.parse(bodyText);
    const err = parsed?.error;
    if (err) {
      return { message: err.message || null, status: err.status || null, code: err.code ?? null };
    }
  } catch {
    // not JSON — leave as raw text below
  }
  return { message: bodyText ? bodyText.slice(0, 500) : null, status: null, code: null };
}

/** Turns a parsed Gemini error into a message safe and useful to show the
 * end user, plus a flag for whether this looks like a server misconfig
 * (bad key / bad model / disabled API) vs. a transient quota issue. */
function describeGeminiFailure(httpStatus, parsedError, model) {
  const upstreamMessage = parsedError.message || `HTTP ${httpStatus}`;

  if (httpStatus === 429 || parsedError.status === "RESOURCE_EXHAUSTED") {
    return {
      userMessage:
        "The AI assistant is temporarily over its request quota (Gemini API rate/usage limit). " +
        "Please wait a minute and try again. If this keeps happening, check the quota for your " +
        "Gemini API key in Google AI Studio / Google Cloud Console.",
      isConfigIssue: false,
      upstreamMessage,
    };
  }

  if (httpStatus === 403 || parsedError.status === "PERMISSION_DENIED") {
    return {
      userMessage: "The AI assistant is misconfigured (Gemini API key is invalid, disabled, or lacks permission).",
      isConfigIssue: true,
      configExplanation:
        `Gemini returned 403 PERMISSION_DENIED: "${upstreamMessage}". This almost always means ` +
        `GEMINI_API_KEY in .env is invalid, revoked, or the Generative Language API isn't enabled ` +
        `for the project that key belongs to. Generate/verify a key at https://aistudio.google.com/apikey.`,
      upstreamMessage,
    };
  }

  if (httpStatus === 400 && (parsedError.status === "INVALID_ARGUMENT" || /API key/i.test(upstreamMessage))) {
    return {
      userMessage: "The AI assistant is misconfigured (invalid Gemini API request).",
      isConfigIssue: true,
      configExplanation:
        `Gemini returned 400 INVALID_ARGUMENT: "${upstreamMessage}". This is usually a malformed or ` +
        `missing GEMINI_API_KEY in .env, rather than anything wrong with the user's message.`,
      upstreamMessage,
    };
  }

  if (httpStatus === 404) {
    return {
      userMessage: "The AI assistant is misconfigured (unknown Gemini model).",
      isConfigIssue: true,
      configExplanation:
        `Gemini returned 404: "${upstreamMessage}". GEMINI_MODEL is set to "${model}", which the ` +
        `API doesn't recognize — check GEMINI_MODEL in .env against the current model list at ` +
        `https://ai.google.dev/gemini-api/docs/models.`,
      upstreamMessage,
    };
  }

  return {
    userMessage: `The AI assistant hit an upstream error (Gemini ${httpStatus}): ${upstreamMessage}`,
    isConfigIssue: false,
    upstreamMessage,
  };
}

/** Gemini requires conversation history to strictly start with a "user" message
 * and alternate strictly between "user" and "model" roles. This helper drops
 * any leading assistant messages and merges consecutive messages of the same
 * role into a single message. */
function normalizeGeminiHistory(messages) {
  let startIndex = 0;
  while (startIndex < messages.length && messages[startIndex].role === "assistant") {
    startIndex++;
  }

  const normalized = [];
  for (let i = startIndex; i < messages.length; i++) {
    const msg = messages[i];
    const role = msg.role === "assistant" ? "model" : "user";

    if (normalized.length > 0 && normalized[normalized.length - 1].role === role) {
      normalized[normalized.length - 1].parts[0].text += "\n\n" + msg.content;
    } else {
      normalized.push({
        role,
        parts: [{ text: msg.content }],
      });
    }
  }

  return normalized;
}

/** Gemini has no "system" role — fold any system messages into a single
 * `systemInstruction`, and map assistant→model/user→user for the rest. */
function toGeminiPayload(messages, { temperature, maxTokens }) {
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const nonSystem = messages.filter((m) => m.role !== "system");
  const contents = normalizeGeminiHistory(nonSystem);

  return {
    contents,
    ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };
}

/**
 * Streams a chat completion from Gemini's `streamGenerateContent` endpoint.
 * Same contract as the OpenAI provider: yields text deltas, throws
 * LLMError on failure, never leaks the API key in a thrown message.
 *
 * @param {{ messages: {role: string, content: string}[], model: string,
 *           apiKey: string, signal?: AbortSignal, temperature?: number,
 *           maxTokens?: number, baseUrl: string }} params
 */
async function* streamChat({ messages, model, apiKey, signal, temperature, maxTokens, baseUrl }) {
  // ---- Config/logging: confirm what actually got loaded, without ever
  // printing the raw key. This is the first thing to check in the logs
  // when a Gemini call misbehaves. ----------------------------------------
  logger.debug(
    { apiKey: maskApiKey(apiKey), model, baseUrl },
    "gemini: config loaded for this request"
  );

  if (!apiKey || apiKey.startsWith("REPLACE_")) {
    logger.error("gemini: GEMINI_API_KEY is missing/empty/placeholder — check .env and that server/config/env.js loaded it");
    throw new LLMError("Gemini API key is not configured on the server.", {
      status: 500,
      code: "CONFIG_MISSING",
      retryable: false,
    });
  }

  const url = `${baseUrl}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
  const payload = toGeminiPayload(messages, { temperature, maxTokens });

  logger.debug(
    { model, url: url.replace(apiKey, "[redacted]"), payload },
    "gemini: sending request"
  );

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    logger.error({ err: err.message }, "gemini: network error reaching Gemini API");
    throw new LLMError(`Could not reach Gemini: ${err.message}`, {
      status: 502,
      code: "UPSTREAM_UNREACHABLE",
      retryable: true,
    });
  }

  logger.debug({ status: response.status, ok: response.ok }, "gemini: response received");

  if (!response.ok) {
    const bodyText = await safeReadText(response);
    const parsedError = parseGeminiError(bodyText);
    const { userMessage, isConfigIssue, configExplanation, upstreamMessage } = describeGeminiFailure(
      response.status,
      parsedError,
      model
    );

    // The exact backend error, in full, goes to the server log — this is
    // what a developer needs to diagnose the real cause, not just "429".
    logger.error(
      {
        status: response.status,
        geminiStatus: parsedError.status,
        geminiCode: parsedError.code,
        upstreamMessage,
        rawBody: bodyText.slice(0, 1000),
        model,
      },
      isConfigIssue ? `gemini: configuration error — ${configExplanation}` : "gemini: request failed"
    );

    throw new LLMError(userMessage, {
      status: response.status,
      code: isConfigIssue ? "CONFIG_ERROR" : response.status === 429 ? "QUOTA_EXCEEDED" : "UPSTREAM_ERROR",
      // Config errors won't fix themselves on retry; quota/5xx errors might.
      retryable: !isConfigIssue && (response.status === 429 || response.status >= 500),
      details: upstreamMessage,
    });
  }

  let sawAnyChunk = false;
  for await (const payload of readSSE(response, signal)) {
    let json;
    try {
      json = JSON.parse(payload);
    } catch {
      continue;
    }

    sawAnyChunk = true;
    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    const delta = parts.map((p) => p.text || "").join("");
    if (delta) yield delta;
  }

  logger.debug({ sawAnyChunk }, "gemini: stream finished");
}

module.exports = { name: "gemini", streamChat };
