const { streamReply } = require("../lib/llm/chatService");

async function testToolCallingAgent() {
  console.log(`\n======================================================================`);
  console.log(`LLM TOOL-CALLING AGENT VERIFICATION SUITE`);
  console.log(`======================================================================`);

  const testQueries = [
    "What projects has Khushi built with React?",
    "How can I contact her?",
    "Where can I download her resume PDF?"
  ];

  for (let i = 0; i < testQueries.length; i++) {
    const q = testQueries[i];
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`Test Query #${i + 1}: "${q}"`);
    console.log(`----------------------------------------------------------------------`);

    let toolCallEmitted = null;
    let fullResponse = "";

    const stream = streamReply({
      messages: [{ role: "user", content: q }],
      providerName: "mock"
    });

    for await (const chunk of stream) {
      if (chunk.startsWith("__TOOL_CALL__:")) {
        toolCallEmitted = JSON.parse(chunk.slice(14));
        console.log(`  [TOOL CALL EMITTED]: ${toolCallEmitted.name}(${JSON.stringify(toolCallEmitted.args)})`);
      } else if (!chunk.startsWith("__")) {
        fullResponse += chunk;
      }
    }

    console.log(`  [TOOL RESULT RETURNED]:`, toolCallEmitted ? "SUCCESS" : "NONE");
    console.log(`  [RESPONSE PREVIEW]: ${fullResponse.slice(0, 150).trim()}...`);
  }
}

testToolCallingAgent();
