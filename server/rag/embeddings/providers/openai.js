const { LLMError } = require("../../../lib/errors");

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

/**
 * Embeds a batch of texts via OpenAI's `/embeddings` endpoint.
 * Mirrors the conventions of ../../lib/llm/providers/openai.js: same
 * error type, same "never leak the key" rule, same retryable/non-retryable
 * status split.
 *
 * @param {{ texts: string[], model: string, apiKey: string, baseUrl: string }} params
 * @returns {Promise<number[][]>} one embedding vector per input text, same order
 */
async function embed({ texts, model, apiKey, baseUrl }) {
  if (!apiKey || apiKey.startsWith("REPLACE_")) {
    throw new LLMError("OpenAI API key is not configured on the server.", {
      status: 500,
      code: "CONFIG_MISSING",
      retryable: false,
    });
  }

  let response;
  try {
    response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: texts }),
    });
  } catch (err) {
    throw new LLMError(`Could not reach OpenAI: ${err.message}`, {
      status: 502,
      code: "UPSTREAM_UNREACHABLE",
      retryable: true,
    });
  }

  if (!response.ok) {
    const body = await safeReadText(response);
    throw new LLMError(`OpenAI embeddings request failed (${response.status}).`, {
      status: response.status,
      code: "UPSTREAM_ERROR",
      retryable: response.status === 429 || response.status >= 500,
      details: body.slice(0, 500),
    });
  }

  const json = await response.json();
  // API guarantees `data` is returned in the same order as `input`, but
  // each item also carries its own `index` — sort defensively rather than
  // trusting order, since a silent shuffle here would misalign chunk text
  // with the wrong vector.
  return json.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

module.exports = { name: "openai", embed };
