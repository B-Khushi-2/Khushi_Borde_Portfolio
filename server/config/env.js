// ============================================================================
// Centralized environment configuration.
// Every other module reads config from here rather than touching
// process.env directly — one place to see every variable the server uses,
// one place to change a default.
// ============================================================================
require("dotenv").config();

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

function toInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toFloat(value, fallback) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function toList(value, fallback) {
  if (!value) return fallback;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

const config = {
  NODE_ENV,
  isProd,
  PORT: toInt(process.env.PORT, 3000),
  LOG_LEVEL: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),

  // Comma-separated list of origins allowed to call this API from a browser.
  ALLOWED_ORIGINS: toList(process.env.ALLOWED_ORIGINS, [
    "http://localhost:5173",
    "http://localhost:3000",
  ]),

  // ---- LLM provider abstraction --------------------------------------
  // Defaults to the built-in "mock" provider (no API key, no network call,
  // answers from the RAG-retrieved context directly) so the whole pipeline
  // works out of the box with zero setup. Set LLM_PROVIDER=openai or
  // =gemini (with the matching API key below) to get real AI-generated
  // answers instead.
  DEFAULT_PROVIDER: process.env.LLM_PROVIDER || "mock",

  PROVIDER_MODELS: {
    openai: process.env.OPENAI_MODEL || "gpt-4o-mini",
    gemini: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  },
  PROVIDER_API_KEYS: {
    openai: process.env.OPENAI_API_KEY || "",
    gemini: process.env.GEMINI_API_KEY || "",
  },
  // Configurable base URLs (not just hardcoded) so this can point at an
  // Azure OpenAI-compatible proxy, a self-hosted gateway, etc. without
  // touching provider code.
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  GEMINI_BASE_URL: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",

  LLM_TEMPERATURE: toFloat(process.env.LLM_TEMPERATURE, 0.6),
  LLM_MAX_OUTPUT_TOKENS: toInt(process.env.LLM_MAX_OUTPUT_TOKENS, 600),
  LLM_MAX_RETRIES: toInt(process.env.LLM_MAX_RETRIES, 2),
  LLM_RETRY_BASE_MS: toInt(process.env.LLM_RETRY_BASE_MS, 400),
  // Hard ceiling on how long a single reply may take to generate, covering
  // both "thinking" and streaming time. Aborts the upstream call past this.
  LLM_STREAM_TIMEOUT_MS: toInt(process.env.LLM_STREAM_TIMEOUT_MS, 30000),

  // ---- RAG: embeddings provider ----------------------------------------
  // Which provider builds/queries the vector index. Deliberately reuses
  // PROVIDER_API_KEYS (openai/gemini) below rather than a separate key set —
  // one key per provider covers both chat and embeddings for that provider.
  // Defaults to the built-in "local" provider (no API key, no network
  // call, dependency-free hashing-trick vectors) so `npm run kb:build`
  // and retrieval both work with zero setup. Set to "openai" or "gemini"
  // (with the matching API key above) for stronger semantic embeddings —
  // just remember to re-run `npm run kb:build` after switching, since the
  // index must be built with whichever provider will query it.
  EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER || "local",
  EMBEDDING_MODELS: {
    openai: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    gemini: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
    local: "local-hashing-v1",
  },

  // ---- RAG: chunking + retrieval ----------------------------------------
  RAG_MULTI_QUERY: process.env.RAG_MULTI_QUERY ? process.env.RAG_MULTI_QUERY === "true" || process.env.RAG_MULTI_QUERY === "1" : true,
  RAG_CHUNK_SIZE: toInt(process.env.RAG_CHUNK_SIZE, 900),
  RAG_CHUNK_OVERLAP: toInt(process.env.RAG_CHUNK_OVERLAP, 150),
  RAG_TOP_K: toInt(process.env.RAG_TOP_K, 4),
  // Cosine-similarity floor below which a chunk is dropped rather than
  // handed to the model — this is the second line of defense (alongside
  // the prompt rules) against answering from weak/irrelevant matches.
  //
  // NOTE ON THIS DEFAULT: the built-in "local" (bag-of-words hashing)
  // embedding provider produces much lower absolute cosine scores than a
  // real semantic embedder — even a strong, on-topic match usually lands
  // in the 0.15-0.4 range, not 0.7+. The previous default of 0.2 sat
  // right in the middle of that range and was silently dropping most
  // genuine matches (retrieve() would return zero chunks for perfectly
  // answerable questions, which is why the bot kept saying "I don't have
  // that information"). 0.08 was chosen empirically against this
  // knowledge base: low enough that on-topic questions reliably surface
  // the right chunk, high enough to still drop near-zero-overlap noise.
  // If you switch EMBEDDING_PROVIDER to "openai" or "gemini", real
  // semantic scores run much higher (0.7+ for a good match) and you can
  // safely raise this back up for stricter guardrails.
  RAG_MIN_SCORE: toFloat(process.env.RAG_MIN_SCORE, 0.08),

  // ---- RAG: hybrid search weights ------------------------------------
  RAG_VECTOR_WEIGHT: toFloat(process.env.RAG_VECTOR_WEIGHT, 0.6),
  RAG_BM25_WEIGHT: toFloat(process.env.RAG_BM25_WEIGHT, 0.4),

  // ---- Request validation ---------------------------------------------
  CHAT_MAX_MESSAGES: toInt(process.env.CHAT_MAX_MESSAGES, 30),
  CHAT_MAX_MESSAGE_CHARS: toInt(process.env.CHAT_MAX_MESSAGE_CHARS, 50000),

  // ---- Rate limiting -----------------------------------------------------
  CHAT_RATE_LIMIT_WINDOW_MS: toInt(process.env.CHAT_RATE_LIMIT_WINDOW_MS, 5 * 60 * 1000),
  CHAT_RATE_LIMIT_MAX: toInt(process.env.CHAT_RATE_LIMIT_MAX, 20),
  GLOBAL_RATE_LIMIT_WINDOW_MS: toInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  GLOBAL_RATE_LIMIT_MAX: toInt(process.env.GLOBAL_RATE_LIMIT_MAX, 100),
  // A genuine visitor submits the contact form once, maybe twice if they
  // made a typo — this only needs to be generous enough to allow that.
  CONTACT_RATE_LIMIT_WINDOW_MS: toInt(process.env.CONTACT_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  CONTACT_RATE_LIMIT_MAX: toInt(process.env.CONTACT_RATE_LIMIT_MAX, 5),
};

/**
 * Runs once at boot. Never throws — a missing LLM key shouldn't take down
 * the whole server (the contact-form API should keep working) — but it
 * should be loud about what's misconfigured, in plain language, the same
 * way the existing SMTP check in server.js already behaves.
 */
function validateStartup(logger) {
  const { NO_KEY_REQUIRED: CHAT_NO_KEY_REQUIRED } = require("../lib/llm");
  const { NO_KEY_REQUIRED: EMBEDDING_NO_KEY_REQUIRED } = require("../rag/embeddings");

  if (CHAT_NO_KEY_REQUIRED.has(config.DEFAULT_PROVIDER)) {
    logger.info(
      `LLM provider ready: ${config.DEFAULT_PROVIDER} (no API key needed — answers are composed ` +
        `directly from retrieved context, not model-generated). Set LLM_PROVIDER=openai or ` +
        `=gemini with a real API key in .env for AI-generated answers.`
    );
  } else {
    const activeKey = config.PROVIDER_API_KEYS[config.DEFAULT_PROVIDER];
    if (!activeKey || activeKey.startsWith("REPLACE_")) {
      const envVar = config.DEFAULT_PROVIDER === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
      logger.warn(
        `No valid API key set for the active LLM provider ("${config.DEFAULT_PROVIDER}"). ` +
          `/api/chat will fall back to mock provider until ${envVar} is set. ` +
          `Copy .env.example to .env and fill it in, then restart.`
      );
    } else {
      logger.info(`LLM provider ready: ${config.DEFAULT_PROVIDER} (${config.PROVIDER_MODELS[config.DEFAULT_PROVIDER]})`);
    }
  }

  if (EMBEDDING_NO_KEY_REQUIRED.has(config.EMBEDDING_PROVIDER)) {
    logger.info(`Embedding provider ready: ${config.EMBEDDING_PROVIDER} (no API key needed).`);
  } else {
    const embeddingKey = config.PROVIDER_API_KEYS[config.EMBEDDING_PROVIDER];
    if (!embeddingKey || embeddingKey.startsWith("REPLACE_")) {
      logger.warn(
        `No valid API key set for the embedding provider ("${config.EMBEDDING_PROVIDER}"). ` +
          `Building/querying the RAG knowledge base index will fail until it's set.`
      );
    }
  }

  const fs = require("fs");
  const storePath = require("path").resolve(__dirname, "../data/index/store.json");
  if (!fs.existsSync(storePath)) {
    logger.warn(
      `No knowledge-base index found at ${storePath}. Run "npm run kb:generate && npm run kb:build" ` +
        `so the Recruiter Copilot has something to retrieve from.`
    );
  }
}

module.exports = { ...config, validateStartup };
