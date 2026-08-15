const { LLMError } = require("../../../lib/errors");

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

/**
 * Embeds a batch of texts via Gemini's `batchEmbedContents` endpoint (one
 * HTTP call for the whole batch, unlike looping `embedContent` per text).
 *
 * @param {{ texts: string[], model: string, apiKey: string, baseUrl: string }} params
 * @returns {Promise<number[][]>}
 */
async function embed({ texts, model, apiKey, baseUrl }) {
  if (!apiKey || apiKey.startsWith("REPLACE_")) {
    throw new LLMError("Gemini API key is not configured on the server.", {
      status: 500,
      code: "CONFIG_MISSING",
      retryable: false,
    });
  }

  const modelPath = model.startsWith("models/") ? model : `models/${model}`;

  let response;
  try {
    response = await fetch(`${baseUrl}/${modelPath}:batchEmbedContents?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: modelPath,
          content: { parts: [{ text }] },
        })),
      }),
    });
  } catch (err) {
    throw new LLMError(`Could not reach Gemini: ${err.message}`, {
      status: 502,
      code: "UPSTREAM_UNREACHABLE",
      retryable: true,
    });
  }

  if (!response.ok) {
    const body = await safeReadText(response);
    throw new LLMError(`Gemini embeddings request failed (${response.status}).`, {
      status: response.status,
      code: "UPSTREAM_ERROR",
      retryable: response.status === 429 || response.status >= 500,
      details: body.slice(0, 500),
    });
  }

  const json = await response.json();
  return json.embeddings.map((e) => e.values);
}

module.exports = { name: "gemini", embed };
