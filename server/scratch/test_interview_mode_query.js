const { buildMessages, streamReply } = require("../lib/llm/chatService");

async function testInterviewModeQuery() {
  const userText = "Switch into interview mode: stay fully grounded answer AS Khushi, in first person, the way she'd answer in a real technical interview. Start by inviting me to ask my first interview question.";

  console.log(`\n======================================================================`);
  console.log(`TESTING USER PROMPT: "${userText}"`);
  console.log(`======================================================================`);

  const messages = [{ role: "user", content: userText }];

  try {
    const built = await buildMessages(messages, "gemini");
    console.log(`\n[Pre-Processing Results]`);
    console.log(`- Detected Route     : ${built.detectedRoute}`);
    console.log(`- Topic Tags         : [${built.topicTags.join(", ")}]`);
    console.log(`- Contextual Query   : "${built.contextualQuery}"`);
    console.log(`- Chunks Retrieved   : ${built.retrievedChunks.length}`);

    console.log(`\n[Streaming Test Output]`);
    let streamedText = "";
    for await (const chunk of streamReply({ messages, providerName: "gemini" })) {
      if (!chunk.startsWith("__")) {
        streamedText += chunk;
      }
    }
    console.log(`\nResponse Stream Received:\n"${streamedText.slice(0, 300)}..."`);
  } catch (err) {
    console.error(`\nFAILED WITH ERROR: ${err.stack || err.message}`);
  }
}

testInterviewModeQuery();
