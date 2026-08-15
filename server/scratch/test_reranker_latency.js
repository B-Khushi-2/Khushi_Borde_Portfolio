const { retrieve } = require("../rag/retriever");

async function testReranker() {
  const query = "What projects has Khushi built and what is her experience with React and AI models?";

  console.log(`\n==================================================`);
  console.log(`TESTING RERANKER & LATENCY`);
  console.log(`QUERY: "${query}"`);
  console.log(`==================================================`);

  const startedAt = Date.now();
  const chunks = await retrieve(query, { candidatePoolSize: 10, topK: 4 });
  const elapsedMs = Date.now() - startedAt;

  console.log(`\nRetrieval & Re-ranking Completed in: ${elapsedMs}ms`);
  console.log(`Target Latency: < 1500ms`);
  console.log(`Latency Compliance: ${elapsedMs <= 1500 ? "PASSED (Under 1.5s)" : "FAILED (Exceeds 1.5s)"}`);

  console.log(`\nRetrieved Chunks Breakdown:`);
  chunks.forEach((c, idx) => {
    console.log(`\n [${idx + 1}] ${c.breadcrumb || c.source}`);
    console.log(`     - Cosine Score: ${c.cosineScore ? c.cosineScore.toFixed(4) : c.score.toFixed(4)}`);
    console.log(`     - Re-ranked Score (0-10): ${c.rerankScore !== undefined ? c.rerankScore.toFixed(1) : "N/A"}/10`);
    console.log(`     - Content snippet: "${c.text.slice(0, 100).replace(/\n/g, " ")}..."`);
  });
}

testReranker();
