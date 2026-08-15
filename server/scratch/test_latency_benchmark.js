const { buildMessages, streamReply } = require("../lib/llm/chatService");

async function runBenchmark() {
  console.log(`\n======================================================================`);
  console.log(`RAG LATENCY & STAGE TIMING BENCHMARK`);
  console.log(`======================================================================`);

  const testCases = [
    {
      name: "1. First-turn Candidate-Fact (Strong Keyword Matches)",
      messages: [{ role: "user", content: "What projects has Khushi built with React?" }]
    },
    {
      name: "2. Vague / Paraphrased Question",
      messages: [{ role: "user", content: "did she work on breaking apart a monolith?" }]
    },
    {
      name: "3. Pronoun-based Follow-up Question",
      messages: [
        { role: "user", content: "Tell me about Khushi's Fire Detection project" },
        { role: "assistant", content: "Fire Detection is a deep-learning app built with a custom 18-layer CNN in TensorFlow." },
        { role: "user", content: "How accurate is it?" }
      ]
    },
    {
      name: "4. General Knowledge Question",
      messages: [{ role: "user", content: "What is quantum computing?" }]
    }
  ];

  for (const tc of testCases) {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`TEST CASE: ${tc.name}`);
    console.log(`Input Query: "${tc.messages[tc.messages.length - 1].content}"`);
    console.log(`----------------------------------------------------------------------`);

    const startedAt = Date.now();
    const built = await buildMessages(tc.messages, "gemini");
    const preProcMs = Date.now() - startedAt;

    console.log(`\n[Stage Breakdown]`);
    console.log(`  - Router & Follow-up Rewrite Stage : ${built.timings.stage_router_rewrite_ms} ms`);
    console.log(`  - Vector Retrieval & Scoring Stage : ${built.timings.stage_retrieval_ms} ms`);
    console.log(`  - Total Pre-processing Latency    : ${built.timings.stage_pre_processing_total_ms} ms`);

    console.log(`\n[Results]`);
    console.log(`  - Detected Route: ${built.detectedRoute}`);
    console.log(`  - Topic Tags: [${built.topicTags.join(", ")}]`);
    console.log(`  - Rewritten Contextual Query: "${built.contextualQuery}"`);
    console.log(`  - Chunks Retrieved: ${built.retrievedChunks.length}`);

    if (built.retrievedChunks.length > 0) {
      built.retrievedChunks.forEach((c, idx) => {
        console.log(`      Chunk #${idx + 1}: Cosine=${c.cosineScore.toFixed(3)}, Rerank=${c.rerankScore.toFixed(1)} | ${c.breadcrumb || c.source}`);
      });
    }

    // Stream first token to measure exact TTFT
    const streamStart = Date.now();
    let ttftMs = null;
    for await (const delta of streamReply({ messages: tc.messages, providerName: "gemini" })) {
      if (!delta.startsWith("__") && ttftMs === null) {
        ttftMs = Date.now() - streamStart;
        break;
      }
    }

    console.log(`\n  ⚡ TIME TO FIRST TOKEN (TTFT): ${ttftMs !== null ? ttftMs : preProcMs} ms`);
  }
}

runBenchmark();
