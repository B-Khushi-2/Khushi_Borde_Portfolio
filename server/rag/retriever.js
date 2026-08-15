// ============================================================================
// STEP 4 of the RAG pipeline: "Retriever"
// ----------------------------------------------------------------------------
// Ties embeddings + vector store together into the function the chat
// service calls: retrieve(query) -> ranked, scored chunks.
//
// Optimizations & Explicit Path Logging:
// 1. Conditional Multi-Query Expansion: Skipped when initial single-query search
//    yields >= 3 candidates with top cosine score >= 0.28.
// 2. Conditional LLM Re-Ranking: Skipped when candidate pool count <= 4.
// 3. Stage Timing & Path Logs: Explicit logging of exact execution path taken.
// ============================================================================

const path = require("path");
const fsSync = require("fs");

const config = require("../config/env");
const { embedTexts } = require("./embeddings");
const vectorStore = require("./vectorStore");
const { AppError } = require("../lib/errors");
const { getProvider } = require("../lib/llm");
const logger = require("../lib/logger");
const { retrievalCache } = require("../lib/cache");

const STORE_PATH = path.resolve(__dirname, "../data/index/store.json");

let cachedStore = null;
let cachedMtimeMs = null;

function getStore() {
  const exists = fsSync.existsSync(STORE_PATH);
  if (!exists) {
    throw new AppError(
      "The knowledge base index hasn't been built yet. Run `npm run kb:build` in server/ first.",
      { status: 500, code: "KB_NOT_BUILT" }
    );
  }

  const { mtimeMs } = fsSync.statSync(STORE_PATH);
  if (!cachedStore || mtimeMs !== cachedMtimeMs) {
    cachedStore = vectorStore.load(STORE_PATH);
    cachedMtimeMs = mtimeMs;
  }
  return cachedStore;
}

function getHeuristicRewrites(query) {
  const clean = query.toLowerCase();
  const rewrites = [];

  if (clean.includes("monolith") || clean.includes("breaking apart")) {
    rewrites.push("microservices architecture backend refactoring decoupling");
    rewrites.push("system design modular components scalability");
  }
  if (clean.includes("fire") || clean.includes("safety") || clean.includes("visual")) {
    rewrites.push("Fire Detection 18-layer CNN TensorFlow image classification");
    rewrites.push("computer vision real-time camera feed safety alert");
  }
  if (clean.includes("health") || clean.includes("symptom") || clean.includes("doctor")) {
    rewrites.push("AarogyaMitra n8n WhatsApp API symptom triage Claude");
  }
  if (clean.includes("ocean") || clean.includes("disaster") || clean.includes("hazard")) {
    rewrites.push("Tarang Smart India Hackathon ocean hazard report classification");
  }
  if (clean.includes("intern") || clean.includes("internship") || clean.includes("experience")) {
    rewrites.push("Infosys Springboard AI ML Intern Vishwakarma University AI Data Science Intern experience");
  }
  if (clean.includes("projects") || clean.includes("work")) {
    rewrites.push("AarogyaMitra Fire Detection FoodBridge Tarang hackathons");
  }

  return rewrites;
}

/**
 * Expands user query into 2-3 alternate phrasings when RAG_MULTI_QUERY is enabled.
 */
async function generateQueryRewrites(query, opts = {}) {
  const isEnabled = opts.multiQuery !== undefined ? opts.multiQuery : config.RAG_MULTI_QUERY;
  if (!isEnabled) {
    return { queries: [query], path: "query-expansion: skipped (disabled)" };
  }

  const queries = [query];
  const providerName = opts.providerName || config.DEFAULT_PROVIDER;
  const apiKey = config.PROVIDER_API_KEYS[providerName];

  if (!apiKey && providerName !== "mock") {
    const heuristicRewrites = getHeuristicRewrites(query);
    return {
      queries: Array.from(new Set([query, ...heuristicRewrites])),
      path: "query-expansion: heuristic (no API key)"
    };
  }

  try {
    const provider = getProvider(providerName);
    const systemPrompt = `You are a query expansion assistant for an AI search retriever.
Given a user query about a software engineer candidate's portfolio/resume, generate 2 to 3 alternate phrasings or synonym-rich search queries.
Include domain terms, rephrasings (e.g. statement vs question, monolith vs microservices, deep learning vs CNN), and technical synonyms.
Respond with ONLY the alternate queries, one per line. Do NOT number them or add markdown.`;

    let responseText = "";
    for await (const chunk of provider.streamChat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      maxTokens: 100,
      temperature: 0.7
    })) {
      if (!chunk.startsWith("__")) {
        responseText += chunk;
      }
    }

    const lines = responseText
      .split("\n")
      .map(l => l.trim().replace(/^[-*\d.\s]+/, ""))
      .filter(l => l.length > 0 && l.toLowerCase() !== query.toLowerCase());

    for (const line of lines.slice(0, 3)) {
      queries.push(line);
    }
  } catch (err) {
    logger.debug({ err: err.message, query }, "LLM query expansion failed, using heuristic rewrites");
    const heuristicRewrites = getHeuristicRewrites(query);
    for (const alt of heuristicRewrites) {
      queries.push(alt);
    }
  }

  return { queries: Array.from(new Set(queries)), path: "query-expansion: LLM" };
}

/**
 * Re-ranks candidate chunks using a single LLM call on a 0-10 scale.
 */
async function rerankChunksWithLLM(query, candidates, opts = {}) {
  if (!candidates || candidates.length === 0) {
    return { candidates, path: "rerank: skipped (empty candidates)" };
  }

  const providerName = opts.providerName || config.DEFAULT_PROVIDER;
  const apiKey = config.PROVIDER_API_KEYS[providerName];

  candidates.forEach(c => {
    c.cosineScore = c.score;
    c.rerankScore = parseFloat((c.score * 10).toFixed(1));
  });

  if (!apiKey && providerName !== "mock") {
    candidates.forEach(c => {
      const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      const textLower = c.text.toLowerCase();
      let termMatches = 0;
      queryTerms.forEach(t => { if (textLower.includes(t)) termMatches++; });
      const boost = Math.min(termMatches * 1.5, 4.0);
      c.rerankScore = Math.min(parseFloat((c.cosineScore * 10 + boost).toFixed(1)), 10.0);
    });
    return { candidates, path: "rerank: heuristic (no API key)" };
  }

  try {
    const provider = getProvider(providerName);
    const candidateFormatted = candidates.map((c, i) =>
      `[${i + 1}] (${c.breadcrumb || c.source})\n${c.text.slice(0, 300)}`
    ).join("\n\n");

    const systemPrompt = `You are a search relevance scoring engine.
Rate how relevant each candidate chunk is to answering the user query on a 0 to 10 scale (0 = completely irrelevant, 10 = perfect answer).
Output ONLY a JSON array of objects with "index" (1-based) and "score" (number 0-10). Do not include markdown codeblocks or explanation.
Example output: [{"index":1,"score":8.5},{"index":2,"score":9.0}]`;

    const userPrompt = `Query: "${query}"\n\nCandidates:\n${candidateFormatted}`;

    let responseText = "";
    const startedAt = Date.now();

    for await (const chunk of provider.streamChat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      maxTokens: 150,
      temperature: 0
    })) {
      if (!chunk.startsWith("__")) {
        responseText += chunk;
      }
    }

    const durationMs = Date.now() - startedAt;
    logger.info({ durationMs, query }, "LLM re-ranking completed");

    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      const scores = JSON.parse(jsonMatch[0]);
      scores.forEach(item => {
        const idx = item.index - 1;
        if (candidates[idx]) {
          candidates[idx].rerankScore = Math.min(Math.max(parseFloat(item.score), 0), 10);
        }
      });
    }
  } catch (err) {
    logger.warn({ err: err.message, query }, "LLM re-ranking failed, using default scores");
  }

  return { candidates, path: "rerank: LLM" };
}

/**
 * Optimized retrieve:
 * 1. Single-query vector search first-pass.
 * 2. Multi-query expansion ONLY if first pass < 3 candidates OR top cosine score < 0.28.
 * 3. LLM re-ranking ONLY if candidate pool count > 4.
 * Explicit logging of exact execution path taken for each stage.
 */
async function retrieve(query, opts = {}) {
  const retrievalStart = Date.now();
  const enableMultiQuery = opts.multiQuery !== undefined ? opts.multiQuery : config.RAG_MULTI_QUERY;
  const cacheKey = `${query}_mq:${enableMultiQuery}_${opts.topK ?? config.RAG_TOP_K}_${opts.minScore ?? config.RAG_MIN_SCORE}`;
  const cached = retrievalCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const store = getStore();

  if (store.embeddingProvider !== config.EMBEDDING_PROVIDER) {
    throw new AppError(
      `Index was built with embedding provider "${store.embeddingProvider}" but the server is ` +
        `configured for "${config.EMBEDDING_PROVIDER}". Rebuild the index (npm run kb:build) or ` +
        `align EMBEDDING_PROVIDER in .env.`,
      { status: 500, code: "KB_PROVIDER_MISMATCH" }
    );
  }

  const topK = opts.topK ?? config.RAG_TOP_K;
  const minScore = opts.minScore ?? config.RAG_MIN_SCORE;
  const candidatePoolSize = opts.candidatePoolSize ?? 10;

  // STAGE A: First pass embedding & vector search with raw query
  const embedStart = Date.now();
  const [singleVector] = await embedTexts([query], {
    providerName: config.EMBEDDING_PROVIDER,
    model: config.EMBEDDING_MODELS[config.EMBEDDING_PROVIDER],
    apiKey: config.PROVIDER_API_KEYS[config.EMBEDDING_PROVIDER],
    baseUrl: config.EMBEDDING_PROVIDER === "gemini" ? config.GEMINI_BASE_URL : config.OPENAI_BASE_URL,
  });

  const firstPassResults = vectorStore.search(store, singleVector, {
    topK: candidatePoolSize,
    minScore,
    queryText: query,
  });
  const embedDurationMs = Date.now() - embedStart;

  const firstPassCount = firstPassResults.length;
  const topFirstPassScore = firstPassCount > 0 ? firstPassResults[0].score : 0;

  // Condition 1: Check if first-pass search is confident (>= 3 candidates AND top score >= 0.28)
  const CONFIDENT_SCORE_THRESHOLD = 0.28;
  const isConfidentFirstPass = firstPassCount >= 3 && topFirstPassScore >= CONFIDENT_SCORE_THRESHOLD;

  let candidateChunks = [];
  let queryExpansionPath = "";
  let expansionDurationMs = 0;

  if (isConfidentFirstPass || !enableMultiQuery) {
    queryExpansionPath = isConfidentFirstPass
      ? "query-expansion: skipped (strong initial match)"
      : "query-expansion: skipped (disabled)";
    candidateChunks = firstPassResults.map(item => ({ ...item, matchedQuery: query }));
    logger.info({
      query,
      firstPassCount,
      topFirstPassScore,
      queryExpansionPath
    }, "retriever stage path decision");
  } else {
    const expansionStart = Date.now();
    const expansionRes = await generateQueryRewrites(query, opts);
    expansionDurationMs = Date.now() - expansionStart;
    queryExpansionPath = expansionRes.path;

    logger.info({ originalQuery: query, expandedQueries: expansionRes.queries, expansionDurationMs, queryExpansionPath }, "retriever stage path decision");

    const queryVectors = await embedTexts(expansionRes.queries, {
      providerName: config.EMBEDDING_PROVIDER,
      model: config.EMBEDDING_MODELS[config.EMBEDDING_PROVIDER],
      apiKey: config.PROVIDER_API_KEYS[config.EMBEDDING_PROVIDER],
      baseUrl: config.EMBEDDING_PROVIDER === "gemini" ? config.GEMINI_BASE_URL : config.OPENAI_BASE_URL,
    });

    const chunkMap = new Map();
    for (let i = 0; i < queryVectors.length; i++) {
      const searchResults = vectorStore.search(store, queryVectors[i], {
        topK: candidatePoolSize,
        minScore: 0,
        queryText: expansionRes.queries[i],
      });

      for (const item of searchResults) {
        const key = item.id || item.text;
        if (!chunkMap.has(key)) {
          chunkMap.set(key, { ...item, matchedQuery: expansionRes.queries[i] });
        } else {
          const existing = chunkMap.get(key);
          if (item.score > existing.score) {
            existing.score = item.score;
            existing.matchedQuery = expansionRes.queries[i];
          }
        }
      }
    }

    candidateChunks = Array.from(chunkMap.values())
      .filter((chunk) => chunk.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, candidatePoolSize);
  }

  // Condition 2: LLM Re-ranking ONLY if candidate pool count > 4
  let rerankPath = "";
  let rerankDurationMs = 0;

  if (candidateChunks.length <= 4) {
    rerankPath = "rerank: skipped (<= 4 candidates)";
    candidateChunks.forEach(c => {
      c.cosineScore = c.score;
      c.rerankScore = parseFloat((c.score * 10).toFixed(1));
    });
    logger.info({ candidateCount: candidateChunks.length, rerankPath }, "retriever stage path decision");
  } else {
    const rerankStart = Date.now();
    const rerankRes = await rerankChunksWithLLM(query, candidateChunks, opts);
    candidateChunks = rerankRes.candidates;
    rerankPath = rerankRes.path;
    rerankDurationMs = Date.now() - rerankStart;
  }

  // Final topK selection
  const finalResults = candidateChunks
    .sort((a, b) => (b.rerankScore ?? 0) - (a.rerankScore ?? 0))
    .slice(0, topK);

  const retrievalTotalMs = Date.now() - retrievalStart;

  logger.info({
    query,
    retrievalTotalMs,
    stage_retrieval_embedding_ms: embedDurationMs,
    stage_retrieval_expansion_ms: expansionDurationMs,
    stage_retrieval_rerank_ms: rerankDurationMs,
    queryExpansionPath,
    rerankPath,
    chunkScores: finalResults.map(c => ({
      label: c.breadcrumb || c.source,
      cosineScore: c.cosineScore,
      rerankScore: c.rerankScore
    }))
  }, "RAG retrieval stage timing & path summary");

  retrievalCache.set(cacheKey, finalResults);
  return finalResults;
}

/** Exposed for /api/health-style diagnostics and the build script's own summary */
function getIndexStats() {
  return vectorStore.stats(getStore());
}

module.exports = { retrieve, getIndexStats, generateQueryRewrites, rerankChunksWithLLM, STORE_PATH };
