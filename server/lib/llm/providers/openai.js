const { LLMError } = require("../../errors");
const { readSSE } = require("../sse");

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

/**
 * Streams a chat completion from OpenAI's `/chat/completions` endpoint.
 * Yields plain text deltas as they arrive. Throws LLMError (with
 * `.retryable`) on any upstream failure — never leaks the API key in the
 * thrown message.
 *
 * @param {{ messages: {role: string, content: string}[], model: string,
 *           apiKey: string, signal?: AbortSignal, temperature?: number,
 *           maxTokens?: number, baseUrl: string }} params
 */
async function* streamChat({ messages, model, apiKey, signal, temperature, maxTokens, baseUrl }) {
  if (!apiKey || apiKey.startsWith("REPLACE_")) {
    throw new LLMError("OpenAI API key is not configured on the server.", {
      status: 500,
      code: "CONFIG_MISSING",
      retryable: false,
    });
  }

  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature,
        max_tokens: maxTokens,
      }),
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new LLMError(`Could not reach OpenAI: ${err.message}`, {
      status: 502,
      code: "UPSTREAM_UNREACHABLE",
      retryable: true,
    });
  }

  if (!response.ok) {
    const body = await safeReadText(response);
    throw new LLMError(`OpenAI request failed (${response.status}).`, {
      status: response.status,
      code: "UPSTREAM_ERROR",
      retryable: response.status === 429 || response.status >= 500,
      details: body.slice(0, 500),
    });
  }

  for await (const payload of readSSE(response, signal)) {
    if (payload === "[DONE]") return;

    let json;
    try {
      json = JSON.parse(payload);
    } catch {
      continue; // ignore any malformed/partial line
    }

    const delta = json?.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}

module.exports = { name: "openai", streamChat };
