const { buildMessages } = require("../lib/llm/chatService");

async function testExactQuery() {
  const query = "What projects has Khushi worked on?";

  console.log(`\n======================================================================`);
  console.log(`TESTING EXACT QUERY: "${query}"`);
  console.log(`======================================================================`);

  const messages = [{ role: "user", content: query }];
  const result = await buildMessages(messages, "gemini");

  console.log(`\nParsed Route: ${result.detectedRoute}`);
  console.log(`Contextual Query: "${result.contextualQuery}"`);
  console.log(`Chunks Retrieved Count: ${result.retrievedChunks.length}`);
  console.log(`Was retrieve() called?: ${result.detectedRoute === "CANDIDATE_FACT" ? "YES" : "NO"}`);
}

testExactQuery();
