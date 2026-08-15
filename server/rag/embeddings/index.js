const openai = require("./providers/openai");
const gemini = require("./providers/gemini");
const local = require("./providers/local");
const { AppError } = require("../../lib/errors");
const { withRetry } = require("../../lib/retry");

// Same shape as ../../lib/llm/index.js's provider registry — deliberately
// consistent so "add a third embeddings provider" is the same one-file,
// one-line-registration exercise as adding a third chat provider.
const PROVIDERS = { openai, gemini, local };

// Providers in this set need no API key and make no network call — used
// to skip the "missing API key" startup warning for them.
const NO_KEY_REQUIRED = new Set(["local"]);

const BATCH_SIZE = 100; // stay well under either provider's per-request item cap

function getProvider(name) {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new AppError(`Unknown embedding provider "${name}". Supported: ${Object.keys(PROVIDERS).join(", ")}.`, {
      status: 400,
      code: "INVALID_PROVIDER",
    });
  }
  return provider;
}

/**
 * Embeds an arbitrary number of texts, batching requests and retrying
 * transient failures. Used both by the index-build script (many chunks at
 * once) and by the retriever at query time (a single text).
 *
 * @param {string[]} texts
 * @param {{ providerName: string, model: string, apiKey: string, baseUrl: string }} config
 * @returns {Promise<number[][]>}
 */
async function embedTexts(texts, config) {
  const provider = getProvider(config.providerName);
  const batches = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    batches.push(texts.slice(i, i + BATCH_SIZE));
  }

  const results = [];
  for (const batch of batches) {
    const vectors = await withRetry(() => provider.embed({ texts: batch, ...config }), {
      retries: 2,
      baseDelayMs: 400,
      shouldRetry: (err) => err?.retryable === true,
    });
    results.push(...vectors);
  }
  return results;
}

module.exports = { embedTexts, getProvider, PROVIDERS, NO_KEY_REQUIRED };
