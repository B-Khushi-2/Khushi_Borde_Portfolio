const { retrieve } = require("../rag/retriever");

async function runQueryComparison() {
  console.log(`\n======================================================================`);
  console.log(`RAG RETRIEVAL SCORES & QUALITY VERIFICATION`);
  console.log(`======================================================================`);

  const testQueries = [
    "Can you summarize Khushi work experience?",
    "How can I contact her?",
    "What are her skills?",
    "Tell me about her education",
    "What is her CGPA?",
    "tell me a joke"
  ];

  for (let i = 0; i < testQueries.length; i++) {
    const q = testQueries[i];
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`Query #${i + 1}: "${q}"`);
    console.log(`----------------------------------------------------------------------`);

    try {
      const results = await retrieve(q);
      console.log(`Chunks Retrieved: ${results.length}`);
      if (results.length === 0) {
        console.log(`  (No chunks met the minScore floor)`);
      } else {
        results.forEach((c, idx) => {
          const hybrid = (c.score ?? 0).toFixed(3);
          const vec = (c.vectorScore ?? c.cosineScore ?? 0).toFixed(3);
          const bm25 = (c.bm25Score ?? 0).toFixed(3);
          console.log(`  #${idx + 1} Score: Hybrid=${hybrid} (Vector=${vec}, BM25=${bm25}) | ${c.breadcrumb || c.source}`);
        });
      }
    } catch (err) {
      console.log(`  Retrieval Notice: ${err.message}`);
    }
  }
}

runQueryComparison();
