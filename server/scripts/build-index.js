// ============================================================================
// Ties together chunking + embeddings + vector store into one command:
//   Markdown knowledge (server/data/knowledge/*.md)
//     -> chunk (rag/chunker.js)
//     -> embed (rag/embeddings)
//     -> store (rag/vectorStore.js -> server/data/index/store.json)
//
// Run: node server/scripts/build-index.js
// (or: npm run kb:build, from server/)
//
// Requires an API key for whichever provider EMBEDDING_PROVIDER points at
// (see server/.env.example) — this makes real network calls to generate
// embeddings, so it costs a small amount and needs the key configured.
// ============================================================================

const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const config = require("../config/env");
const { chunkFiles } = require("../rag/chunker");
const { embedTexts } = require("../rag/embeddings");
const vectorStore = require("../rag/vectorStore");
const { STORE_PATH } = require("../rag/retriever");

const KNOWLEDGE_DIR = path.resolve(__dirname, "../data/knowledge");

function loadKnowledgeFiles() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    throw new Error(
      `No knowledge directory at ${KNOWLEDGE_DIR}. Run "npm run kb:generate" first to create the Markdown knowledge base.`
    );
  }
  const filenames = fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".md"));
  if (filenames.length === 0) {
    throw new Error(`No .md files found in ${KNOWLEDGE_DIR}. Run "npm run kb:generate" first.`);
  }
  return filenames.map((filename) => ({
    filename,
    content: fs.readFileSync(path.join(KNOWLEDGE_DIR, filename), "utf8"),
  }));
}

async function main() {
  const { NO_KEY_REQUIRED } = require("../rag/embeddings");
  const providerName = config.EMBEDDING_PROVIDER;
  const model = config.EMBEDDING_MODELS[providerName];
  const apiKey = config.PROVIDER_API_KEYS[providerName];
  const baseUrl = providerName === "gemini" ? config.GEMINI_BASE_URL : config.OPENAI_BASE_URL;

  if (!apiKey && !NO_KEY_REQUIRED.has(providerName)) {
    const envVar = providerName === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
    console.error(
      `No API key configured for embedding provider "${providerName}". Set ${envVar} in server/.env and try again.`
    );
    process.exit(1);
  }

  console.log(`Loading knowledge files from ${path.relative(process.cwd(), KNOWLEDGE_DIR)}/ ...`);
  const files = loadKnowledgeFiles();
  console.log(`Loaded ${files.length} file(s): ${files.map((f) => f.filename).join(", ")}`);

  console.log(`Chunking (chunkSize=${config.RAG_CHUNK_SIZE}, overlap=${config.RAG_CHUNK_OVERLAP}) ...`);
  const chunks = chunkFiles(files, { chunkSize: config.RAG_CHUNK_SIZE, chunkOverlap: config.RAG_CHUNK_OVERLAP });
  console.log(`Produced ${chunks.length} chunk(s).`);

  console.log(`Embedding ${chunks.length} chunk(s) via ${providerName} (${model}) ...`);
  const vectors = await embedTexts(
    chunks.map((c) => c.text),
    { providerName, model, apiKey, baseUrl }
  );

  const store = vectorStore.buildStore({
    chunks,
    vectors,
    embeddingProvider: providerName,
    embeddingModel: model,
  });

  vectorStore.save(STORE_PATH, store);
  console.log(`Wrote vector store to ${path.relative(process.cwd(), STORE_PATH)}`);

  const stats = vectorStore.stats(store);
  console.log("\nIndex summary:");
  console.log(`  total chunks: ${stats.totalChunks}`);
  for (const [source, count] of Object.entries(stats.bySource)) {
    console.log(`    ${source}: ${count}`);
  }
}

main().catch((err) => {
  console.error("Failed to build index:", err.message);
  process.exit(1);
});
