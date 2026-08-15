const { buildMessages } = require("../lib/llm/chatService");

async function testExactQueryLLM() {
  const query = "What projects has Khushi worked on?";

  console.log(`\n======================================================================`);
  console.log(`TESTING EXACT QUERY WITH MOCK LLM: "${query}"`);
  console.log(`======================================================================`);

  const messages = [{ role: "user", content: query }];
  const result = await buildMessages(messages, "mock");

  console.log(`\nParsed Route: ${result.detectedRoute}`);
  console.log(`Contextual Query: "${result.contextualQuery}"`);
  console.log(`Chunks Retrieved Count: ${result.retrievedChunks.length}`);
  console.log(`Was retrieve() called?: ${result.detectedRoute === "CANDIDATE_FACT" ? "YES" : "NO"}`);
}

testExactQueryLLM();
