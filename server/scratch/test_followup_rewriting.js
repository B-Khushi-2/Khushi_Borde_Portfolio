const { buildMessages, streamReply } = require("../lib/llm/chatService");

async function testFollowUpConversation() {
  console.log(`\n==================================================`);
  console.log(`TESTING 3-TURN CONVERSATION WITH PRONOUN FOLLOW-UP`);
  console.log(`==================================================`);

  const messages = [
    { role: "user", content: "Tell me about Khushi's Fire Detection project" },
    { role: "assistant", content: "Fire Detection is a deep learning web application built using a custom 18-layer CNN in TensorFlow with 94% accuracy." },
    { role: "user", content: "What framework did she use for its model?" },
    { role: "assistant", content: "She used TensorFlow and Keras to construct the 18-layer CNN model." },
    { role: "user", content: "How accurate is it?" } // Pronoun follow-up turn!
  ];

  console.log(`Latest turn (Turn 3): "${messages[messages.length - 1].content}"`);

  const built = await buildMessages(messages, "gemini");

  console.log(`\nContextual Rewritten Query for Retrieval: "${built.contextualQuery}"`);
  console.log(`Detected Route: ${built.detectedRoute}`);
  console.log(`Chunks Retrieved: ${built.retrievedChunks.length}`);

  built.retrievedChunks.forEach((c, idx) => {
    console.log(` [${idx + 1}] Score: ${c.score.toFixed(4)} | Breadcrumb: ${c.breadcrumb || c.source}`);
  });

  console.log(`\n--- Streaming Assistant Response ---`);
  let text = "";
  for await (const delta of streamReply({ messages, providerName: "gemini" })) {
    if (delta.startsWith("__")) continue;
    text += delta;
  }
  console.log(`RESPONSE:\n${text.trim()}`);
}

testFollowUpConversation();
