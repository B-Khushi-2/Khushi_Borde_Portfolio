// ============================================================================
// STEP 3 of the RAG pipeline: "Vector database"
// ----------------------------------------------------------------------------
// A minimal, dependency-free vector store: chunk vectors + metadata
// persisted as one JSON file, loaded into memory, searched by cosine
// similarity. For a knowledge base this size (a portfolio's worth of
// projects/experience/skills — tens of chunks, not millions), an in-memory
// linear scan is genuinely the right tool: no server to run, nothing to
// provision, sub-millisecond search, and it fits in a single file that's
// trivial to inspect, diff, or delete-and-rebuild.
//
// The store exposes the same shape a "real" vector DB client would
// (load / search / stats) — if the knowledge base ever grows enough to
// need approximate nearest-neighbor search or a managed service, swapping
// this module for a Pinecone/Chroma/pgvector client means changing this
// one file; retriever.js and everything above it is unaffected.
// ============================================================================

const fs = require("fs");

const STORE_VERSION = 1;

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * @param {{ chunks: {id, source, breadcrumb, text}[], vectors: number[][],
 *           embeddingProvider: string, embeddingModel: string }} params
 */
function buildStore({ chunks, vectors, embeddingProvider, embeddingModel }) {
  if (chunks.length !== vectors.length) {
    throw new Error(`chunk/vector count mismatch: ${chunks.length} chunks vs ${vectors.length} vectors`);
  }
  return {
    version: STORE_VERSION,
    embeddingProvider,
    embeddingModel,
    builtAt: new Date().toISOString(),
    records: chunks.map((chunk, i) => ({ ...chunk, embedding: vectors[i] })),
  };
}

function save(storePath, store) {
  fs.mkdirSync(require("path").dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(store), "utf8");
}

function load(storePath) {
  if (!fs.existsSync(storePath)) return null;
  const raw = fs.readFileSync(storePath, "utf8");
  const store = JSON.parse(raw);
  if (store.version !== STORE_VERSION) {
    throw new Error(
      `Vector store at ${storePath} was built with an incompatible version (${store.version}). Rebuild it with npm run kb:build.`
    );
  }
  return store;
}

const config = require("../config/env");
const { scoreBM25 } = require("./bm25");

/**
 * Hybrid Cosine-Similarity + BM25 Keyword Search over every record in the store.
 * @param {object} store
 * @param {number[]} queryVector
 * @param {{ topK?: number, minScore?: number, queryText?: string, vectorWeight?: number, bm25Weight?: number }} [opts]
 * @returns {{ id, source, breadcrumb, text, score, vectorScore, bm25Score }[]} sorted, highest score first
 */
function search(store, queryVector, opts = {}) {
  const topK = opts.topK ?? 4;
  const minScore = opts.minScore ?? 0;
  const queryText = opts.queryText || "";

  const vectorWeight = opts.vectorWeight ?? config.RAG_VECTOR_WEIGHT ?? 0.6;
  const bm25Weight = opts.bm25Weight ?? config.RAG_BM25_WEIGHT ?? 0.4;

  const bm25Scores = queryText ? scoreBM25(store.records, queryText) : store.records.map(() => 0);

  const scored = store.records.map((record, i) => {
    const vScore = cosineSimilarity(queryVector, record.embedding);
    const bScore = bm25Scores[i] || 0;
    const hybridScore = queryText
      ? (vectorWeight * vScore) + (bm25Weight * bScore)
      : vScore;

    return {
      id: record.id,
      source: record.source,
      breadcrumb: record.breadcrumb,
      text: record.text,
      score: parseFloat(hybridScore.toFixed(4)),
      vectorScore: parseFloat(vScore.toFixed(4)),
      bm25Score: parseFloat(bScore.toFixed(4)),
    };
  });

  return scored
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function stats(store) {
  const bySource = {};
  for (const r of store.records) bySource[r.source] = (bySource[r.source] || 0) + 1;
  return {
    totalChunks: store.records.length,
    bySource,
    embeddingProvider: store.embeddingProvider,
    embeddingModel: store.embeddingModel,
    builtAt: store.builtAt,
  };
}

module.exports = { buildStore, save, load, search, stats, cosineSimilarity, STORE_VERSION };
