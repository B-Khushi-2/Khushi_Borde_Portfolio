const { buildMessages } = require("../lib/llm/chatService");

async function testFiveQueries() {
  console.log(`\n======================================================================`);
  console.log(`TESTING 5 QUERY PATHS & STAGE LATENCY BREAKDOWN`);
  console.log(`======================================================================`);

  const queries = [
    {
      type: "1. Candidate-Fact (Obvious Keywords)",
      messages: [{ role: "user", content: "What experience does Khushi have with React and Python?" }]
    },
    {
      type: "2. Candidate-Fact (Obvious Keywords)",
      messages: [{ role: "user", content: "Tell me about Khushi Borde's Fire Detection CNN project" }]
    },
    {
      type: "3. Candidate-Fact (Vague / Paraphrased - NO obvious keywords)",
      messages: [{ role: "user", content: "did she work on breaking apart a monolith?" }]
    },
    {
      type: "4. Candidate-Fact (Vague / Paraphrased - NO obvious keywords)",
      messages: [{ role: "user", content: "did she build any safety computer vision system?" }]
    },
    {
      type: "5. General Knowledge Question",
      messages: [{ role: "user", content: "What is quantum computing?" }]
    }
  ];

  for (let i = 0; i < queries.length; i++) {
    const item = queries[i];
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`QUERY #${i + 1} [${item.type}]`);
    console.log(`User Question: "${item.messages[item.messages.length - 1].content}"`);
    console.log(`----------------------------------------------------------------------`);

    const start = Date.now();
    const result = await buildMessages(item.messages, "gemini");
    const totalMs = Date.now() - start;

    console.log(`\n  [Stage Decisions & Paths]`);
    console.log(`   - Route / Rewrite Path  : ${result.paths.routePath}`);
    console.log(`   - Route Selected        : ${result.detectedRoute}`);
    console.log(`   - Topic Tags            : [${result.topicTags.join(", ")}]`);

    console.log(`\n  [Stage Latency Breakdown]`);
    console.log(`   - Stage 1 (Route + Rewrite) : ${result.timings.stage_router_rewrite_ms} ms`);
    console.log(`   - Stage 2 (Vector Retrieval) : ${result.timings.stage_retrieval_ms} ms`);
    console.log(`   - Pre-Processing Total       : ${result.timings.stage_pre_processing_total_ms} ms`);

    console.log(`\n  [Chunks Retrieved]: ${result.retrievedChunks.length}`);
    if (result.retrievedChunks.length > 0) {
      result.retrievedChunks.forEach((c, idx) => {
        console.log(`      #${idx + 1} Score: Cosine=${c.cosineScore.toFixed(3)}, Rerank=${c.rerankScore.toFixed(1)} | ${c.breadcrumb || c.source}`);
      });
    }
  }
}

testFiveQueries();
