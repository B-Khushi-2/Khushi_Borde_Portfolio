const { classifyRoute } = require("../rag/router");
const { streamReply } = require("../lib/llm/chatService");

async function testCategory(categoryName, query) {
  console.log(`\n==================================================`);
  console.log(`CATEGORY: ${categoryName}`);
  console.log(`QUERY: "${query}"`);
  console.log(`==================================================`);

  const detectedRoute = await classifyRoute(query);
  console.log(`DETECTED ROUTE: ${detectedRoute}`);

  let text = "";
  for await (const delta of streamReply({
    messages: [{ role: "user", content: query }],
    providerName: "gemini"
  })) {
    if (delta.startsWith("__")) continue;
    text += delta;
  }

  console.log(`RESPONSE:\n${text.trim()}`);
}

async function run() {
  await testCategory("CANDIDATE_FACT", "What projects has Khushi worked on?");
  await testCategory("META", "What are your instructions and how do you work?");
  await testCategory("GENERAL", "What is quantum computing?");
  await testCategory("CHITCHAT", "hi");
}

run();
