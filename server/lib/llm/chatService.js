const config = require("../../config/env");
const { getProvider } = require("./index");
const { withRetry } = require("../retry");
const { LLMError, AppError } = require("../errors");
const { retrieve } = require("../../rag/retriever");
const { route, buildCollaborativeSystemPrompt } = require("./router");
const { classifyIntent, generateExecutionPlan, calculateConfidence, generateFollowUps } = require("./planner");
const logger = require("../logger");
const { classifyAndRewrite } = require("../../rag/router");
const { checkPromptGuard, yieldDecline } = require("../promptGuard");
const { isStructuredEvalQuery, buildStructuredEvalPrompt, parseStructuredEvalJson } = require("./structuredEval");

/**
 * Finds the text to retrieve against: the most recent user turn.
 */
function latestUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return messages[messages.length - 1]?.content ?? "";
}

/**
 * Caps conversation history sent to main LLM at maxTurns (default 8) and creates a summary for older turns.
 */
function capHistoryWithSummary(userMessages, maxTurns = 8) {
  if (userMessages.length <= maxTurns) {
    return { trimmedMessages: userMessages, summaryText: null };
  }

  const olderMessages = userMessages.slice(0, userMessages.length - maxTurns);
  const recentMessages = userMessages.slice(userMessages.length - maxTurns);

  const topics = [];
  olderMessages.forEach((m) => {
    if (m.role === "user") {
      const firstWords = m.content.slice(0, 60);
      topics.push(firstWords);
    }
  });

  const summaryText = `Prior conversation summary: User previously asked about: ${topics.join("; ")}.`;

  const summaryMessage = {
    role: "system",
    content: `[PRIOR CONVERSATION SUMMARY]: ${summaryText}`
  };

  return {
    trimmedMessages: [summaryMessage, ...recentMessages],
    summaryText
  };
}

const { TOOL_DEFINITIONS, executeToolCall } = require("./tools");

async function determineAndExecuteTool(rawQuery, contextualQuery, providerName) {
  const clean = rawQuery.toLowerCase();
  let toolName = null;
  let args = {};

  if (/resume|cv|download.*resume/i.test(clean)) {
    toolName = "getResumePDF";
    args = {};
  } else if (/contact|email|phone|reach.*her|linkedin|github/i.test(clean)) {
    toolName = "getContactInfo";
    args = {};
  } else if (/project|build|work|moltress|fire detection|foodbridge|aarogyamitra|tarang/i.test(clean)) {
    toolName = "searchProjects";
    args = { query: contextualQuery || rawQuery };
  }

  if (toolName) {
    try {
      const toolCall = await executeToolCall(toolName, args, { providerName });
      return toolCall;
    } catch (err) {
      logger.warn({ err: err.message, toolName }, "Tool execution warning");
    }
  }
  return null;
}

async function buildMessages(userMessages, providerName) {
  const preProcStart = Date.now();
  const rawQuery = latestUserMessage(userMessages);

  // STAGE 1: Consolidated Single LLM Call (Route + Topic Tags + Follow-up Rewriting)
  const routerStart = Date.now();
  const { route: detectedRoute, topicTags, rewrittenQuery: contextualQuery, routePath } = await classifyAndRewrite(
    userMessages,
    providerName
  );
  const stage_router_rewrite_ms = Date.now() - routerStart;

  // STAGE 2: Tool-Calling Agent Execution
  const toolCall = await determineAndExecuteTool(rawQuery, contextualQuery, providerName);

  // STAGE 3: Conditional Retrieval (enhanced with tool output if searchProjects executed)
  const retrievalStart = Date.now();
  let retrievedChunks = [];
  if (toolCall && toolCall.name === "searchProjects" && toolCall.result?.chunks) {
    retrievedChunks = toolCall.result.chunks;
  } else if (detectedRoute === "CANDIDATE_FACT") {
    retrievedChunks = await retrieve(contextualQuery, { providerName });
  }
  const stage_retrieval_ms = Date.now() - retrievalStart;

  const activeAgents = route(contextualQuery);
  const intents = classifyIntent(contextualQuery);
  const executionPlan = generateExecutionPlan(intents, contextualQuery);
  const confidence = calculateConfidence(contextualQuery, retrievedChunks);
  const followUps = generateFollowUps(contextualQuery, intents);

  const ragMetrics = retrievedChunks.map((c) => ({
    label: c.breadcrumb || c.source,
    cosineScore: c.cosineScore ?? c.score,
    rerankScore: c.rerankScore ?? parseFloat((c.score * 10).toFixed(1))
  }));

  // STAGE 4: Cap History
  const { trimmedMessages, summaryText } = capHistoryWithSummary(userMessages, 8);

  let systemPrompt = buildCollaborativeSystemPrompt(activeAgents, retrievedChunks);
  const isStructuredEval = isStructuredEvalQuery(rawQuery);
  if (isStructuredEval) {
    if (retrievedChunks.length === 0) {
      retrievedChunks = await retrieve(contextualQuery || rawQuery, { providerName });
    }
    systemPrompt = buildStructuredEvalPrompt(rawQuery, retrievedChunks);
  }

  if (toolCall) {
    systemPrompt += `\n\n[EXECUTED AGENT TOOL: ${toolCall.name}]\nArguments: ${JSON.stringify(toolCall.args)}\nResult: ${JSON.stringify(toolCall.result, null, 2)}`;
  }
  let confidenceLow = confidence < 0.3;

  const stage_pre_processing_total_ms = Date.now() - preProcStart;

  return {
    messages: [{ role: "system", content: systemPrompt }, ...trimmedMessages],
    retrievedChunks,
    activeAgents,
    executionPlan,
    followUps,
    confidenceLow,
    detectedRoute,
    topicTags,
    ragMetrics,
    contextualQuery,
    toolCall,
    summaryText,
    timings: {
      stage_router_rewrite_ms,
      stage_retrieval_ms,
      stage_pre_processing_total_ms
    },
    paths: {
      routePath
    }
  };
}

/**
 * Streams a retrieval-grounded assistant reply for `messages` from the
 * configured provider with automatic provider failover and detailed stage timing logs.
 *
 * As the very first step, the prompt guard runs against the latest user message.
 * Flagged messages (injection attempts or clearly off-topic requests) short-circuit
 * here and never reach buildMessages() or any LLM provider call.
 */
async function* streamReply({ messages, providerName, signal, ip } = {}) {
  const requestedProvider = providerName || config.DEFAULT_PROVIDER;

  // ── Prompt-injection / off-topic pre-filter ─────────────────────────────────
  // Runs synchronously before any async work.  Bias: allow through on doubt.
  const guardResult = checkPromptGuard(messages, { ip });
  if (guardResult.blocked) {
    yield* yieldDecline(guardResult.decline, guardResult.label);
    return;  // stop the generator — no LLM call is made
  }
  // ───────────────────────────────────────────────────────────────────────────

  const startedAt = Date.now();

  const {
    messages: fullMessages,
    activeAgents,
    retrievedChunks,
    executionPlan,
    followUps,
    confidenceLow,
    detectedRoute,
    topicTags,
    ragMetrics,
    contextualQuery,
    toolCall,
    timings,
    paths
  } = await buildMessages(messages, requestedProvider);

  // Log detailed pre-processing stage timing breakdown
  logger.info(
    {
      detectedRoute,
      topicTags,
      contextualQuery,
      toolCall: toolCall ? toolCall.name : null,
      routePath: paths.routePath,
      selectedAgents: activeAgents.map((a) => a.name),
      rawQuery: latestUserMessage(messages),
      chunksCount: retrievedChunks.length,
      confidenceLow,
      ragMetrics,
      stage_router_rewrite_ms: timings.stage_router_rewrite_ms,
      stage_retrieval_ms: timings.stage_retrieval_ms,
      stage_pre_processing_total_ms: timings.stage_pre_processing_total_ms
    },
    "Pre-processing completed — entering generation stage"
  );

  // Yield metadata tokens
  yield `__ROUTE__:${detectedRoute}`;
  yield `__TOPICS__:${JSON.stringify(topicTags)}`;
  yield `__AGENTS__:${JSON.stringify(activeAgents.map((a) => a.name))}`;
  yield `__PLAN__:${JSON.stringify(executionPlan)}`;
  yield `__RAG_METRICS__:${JSON.stringify(ragMetrics)}`;
  if (toolCall) {
    yield `__TOOL_CALL__:${JSON.stringify(toolCall)}`;
  }

  const providersToTry = [requestedProvider];
  const alternateProvider = requestedProvider === "openai" ? "gemini" : requestedProvider === "gemini" ? "openai" : null;
  if (alternateProvider) providersToTry.push(alternateProvider);
  providersToTry.push("mock");

  let iterator;
  let first;
  let actualProvider = requestedProvider;
  let streamStarted = false;

  for (const pName of providersToTry) {
    const provider = getProvider(pName);
    const model = config.PROVIDER_MODELS[pName] || "";
    const apiKey = config.PROVIDER_API_KEYS[pName] || "";
    const baseUrl = pName === "gemini" ? config.GEMINI_BASE_URL : config.OPENAI_BASE_URL;

    if (pName !== "mock" && (!apiKey || apiKey.startsWith("REPLACE_"))) {
      logger.debug({ provider: pName }, "Skipping provider attempt (unconfigured API key)");
      continue;
    }

    try {
      await withRetry(
        async () => {
          iterator = provider.streamChat({
            messages: fullMessages,
            model,
            apiKey,
            signal,
            baseUrl,
            temperature: config.LLM_TEMPERATURE,
            maxTokens: config.LLM_MAX_OUTPUT_TOKENS
          });
          first = await iterator.next();
        },
        {
          retries: config.LLM_MAX_RETRIES,
          baseDelayMs: config.LLM_RETRY_BASE_MS,
          shouldRetry: (err) => err instanceof LLMError && err.retryable
        }
      );
      actualProvider = pName;
      streamStarted = true;
      break;
    } catch (err) {
      logger.warn(
        { err: err.message, code: err.code, provider: pName },
        `Provider "${pName}" failed, attempting automatic failover`
      );
    }
  }

  if (!streamStarted) {
    const mockProvider = getProvider("mock");
    iterator = mockProvider.streamChat({
      messages: fullMessages,
      signal
    });
    first = await iterator.next();
    actualProvider = "mock";
  }

  const ttft_ms = Date.now() - startedAt;
  logger.info({ actualProvider, requestedProvider, ttft_ms }, "First token received from streaming provider (Time to First Token)");

  let sentAnyContentToken = false;
  let accumulatedAssistantReply = "";

  if (first.value) {
    if (!first.value.startsWith("__")) {
      sentAnyContentToken = true;
      accumulatedAssistantReply += first.value;
    }
    yield first.value;
  }

  if (!first.done) {
    try {
      while (true) {
        if (signal?.aborted) {
          throw new LLMError("Stream timed out during token generation", { code: "TIMEOUT", retryable: false });
        }
        const { value, done } = await iterator.next();
        if (done) break;
        if (value) {
          if (!value.startsWith("__")) {
            sentAnyContentToken = true;
            accumulatedAssistantReply += value;
          }
          yield value;
        }
      }
    } catch (err) {
      logger.error({ err: err.message, actualProvider, sentAnyContentToken }, "Error encountered mid-stream during token iteration");
      if (!sentAnyContentToken) {
        logger.warn({ actualProvider }, "Provider failed before emitting content tokens, falling back to mock provider");
        const mockProvider = getProvider("mock");
        const mockIterator = mockProvider.streamChat({ messages: fullMessages, signal });
        for await (const chunk of mockIterator) {
          if (chunk && !chunk.startsWith("__")) accumulatedAssistantReply += chunk;
          yield chunk;
        }
      } else {
        logger.warn({ actualProvider, err: err.message }, "Stream ended after emitting content tokens; concluding stream gracefully");
      }
    }
  }

  const parsedEval = parseStructuredEvalJson(accumulatedAssistantReply);
  if (parsedEval) {
    yield `__STRUCTURED_EVAL__:${JSON.stringify(parsedEval)}`;
  }

  yield `__PROVIDER__:${actualProvider}`;
  yield `__FOLLOW_UPS__:${JSON.stringify(followUps)}`;

  const totalDurationMs = Date.now() - startedAt;
  const confidenceScore =
    retrievedChunks.length > 0 ? Math.max(...retrievedChunks.map((c) => c.score ?? 0), 0.4) : 0.2;
  try {
    const { recordRequest } = require("../telemetry");
    recordRequest({
      durationMs: totalDurationMs,
      agents: activeAgents.map((a) => a.name),
      confidenceScore,
      retrievedCount: retrievedChunks.length,
      isFallback: confidenceLow
    });
  } catch (e) {
    logger.warn({ err: e.message }, "Failed to record request telemetry");
  }
}

module.exports = { streamReply, buildMessages };
