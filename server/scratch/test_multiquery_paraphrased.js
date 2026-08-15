const { retrieve } = require("../rag/retriever");

async function runComparison() {
  const queries = [
    "did she work on breaking apart a monolith?",
    "did she do any computer vision safety system?"
  ];

  for (const q of queries) {
    console.log(`\n==================================================`);
    console.log(`TESTING PARAPHRASED QUERY: "${q}"`);
    console.log(`==================================================`);

    // 1. Without Multi-Query
    console.log(`\n--- Single Query (multiQuery: false) ---`);
    const singleResults = await retrieve(q, { multiQuery: false });
    console.log(`Chunks Retrieved: ${singleResults.length}`);
    singleResults.forEach((c, idx) => {
      console.log(` [${idx + 1}] Score: ${c.score.toFixed(4)} | Breadcrumb: ${c.breadcrumb || c.source}`);
    });

    // 2. With Multi-Query
    console.log(`\n--- Multi-Query Expansion (multiQuery: true) ---`);
    const multiResults = await retrieve(q, { multiQuery: true });
    console.log(`Chunks Retrieved: ${multiResults.length}`);
    multiResults.forEach((c, idx) => {
      console.log(` [${idx + 1}] Score: ${c.score.toFixed(4)} | MatchedQuery: "${c.matchedQuery}" | Breadcrumb: ${c.breadcrumb || c.source}`);
    });
  }
}

runComparison();
