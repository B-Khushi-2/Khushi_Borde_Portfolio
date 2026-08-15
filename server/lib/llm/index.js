const openai = require("./providers/openai");
const gemini = require("./providers/gemini");
const mock = require("./providers/mock");
const { AppError } = require("../errors");

// Every provider implements the same shape:
//   { name: string, streamChat({ messages, model, apiKey, signal, temperature, maxTokens, baseUrl }) -> AsyncGenerator<string> }
// Adding a new provider means writing one file matching that contract and
// registering it here — nothing else in the app knows which one is active.
const PROVIDERS = {
  openai,
  gemini,
  mock,
};

// Providers in this set need no API key and make no network call — used
// to skip the "missing API key" startup warning for them.
const NO_KEY_REQUIRED = new Set(["mock"]);

function getProvider(name) {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new AppError(`Unknown LLM provider "${name}". Supported: ${Object.keys(PROVIDERS).join(", ")}.`, {
      status: 400,
      code: "INVALID_PROVIDER",
    });
  }
  return provider;
}

module.exports = { getProvider, PROVIDERS, NO_KEY_REQUIRED };
