const { buildMessages, streamReply } = require("../lib/llm/chatService");
const { classifyRoute } = require("../rag/router");

async function runTests() {
  console.log(`\n==================================================`);
  console.log(`TESTING TASKS 5A, 5B, 5C, 5D`);
  console.log(`==================================================`);

  // 1. Task 5C: Topic Tag Extraction
  console.log(`\n--- TASK 5C: TOPIC TAG EXTRACTION ---`);
  const query = "What experience does Khushi Borde have with React, Python, and Deep Learning?";
  const routeResult = await classifyRoute(query);
  console.log(`Query: "${query}"`);
  console.log(`Route: ${routeResult.route}`);
  console.log(`Topic Tags: [${routeResult.topicTags.join(", ")}]`);

  // 2. Task 5D: Follow-up Suggestions Generation
  console.log(`\n--- TASK 5D: FOLLOW-UP QUESTION SUGGESTIONS ---`);
  const messages = [{ role: "user", content: query }];
  const built = await buildMessages(messages, "gemini");
  console.log(`Generated Follow-Up Suggestions:`);
  built.followUps.forEach((f, i) => console.log(`  [${i + 1}] "${f}"`));

  // 3. Task 5B: Automatic Provider Failover (testing fallback when primary fails)
  console.log(`\n--- TASK 5B: AUTOMATIC PROVIDER FAILOVER ---`);
  let actualProviderEncountered = "";
  for await (const delta of streamReply({ messages, providerName: "openai" })) {
    if (delta.startsWith("__PROVIDER__:")) {
      actualProviderEncountered = delta.slice(13);
    }
  }
  console.log(`Requested Provider: "openai"`);
  console.log(`Actual Serving Provider (after failover): "${actualProviderEncountered}"`);
}

runTests();
