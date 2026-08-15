const { streamReply } = require("../lib/llm/chatService");

async function runTest(label, userQuestion) {
  console.log(`\n==================================================`);
  console.log(`TEST: ${label}`);
  console.log(`QUESTION: "${userQuestion}"`);
  console.log(`==================================================`);

  let text = "";
  try {
    for await (const delta of streamReply({
      messages: [{ role: "user", content: userQuestion }],
      providerName: "gemini",
    })) {
      if (delta.startsWith("__PROVIDER__:") || delta.startsWith("__AGENTS__:") || delta.startsWith("__PLAN__:") || delta.startsWith("__FOLLOW_UPS__:")) {
        continue;
      }
      text += delta;
    }
    console.log(`RESPONSE:\n${text}`);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
  }
}

async function main() {
  await runTest("(1) Candidate-specific factual question", "What projects has Khushi worked on?");
  await runTest("(2) General knowledge question unrelated to candidate", "What is quantum computing?");
  await runTest("(3) Plain greeting", "hi");
}

main();
