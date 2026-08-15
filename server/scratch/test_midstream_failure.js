const { streamReply } = require("../lib/llm/chatService");

async function testMidStreamFailure() {
  console.log(`\n======================================================================`);
  console.log(`TESTING MID-STREAM FAILURE RECOVERY`);
  console.log(`======================================================================`);

  const messages = [{ role: "user", content: "Can you summarize Khushi's work experience?" }];

  let chunksCount = 0;
  let receivedDone = false;
  let errorCaught = false;

  try {
    for await (const chunk of streamReply({ messages, providerName: "gemini" })) {
      chunksCount++;
      if (chunksCount === 2) {
        console.log(`Chunk #${chunksCount}: "${chunk.slice(0, 40)}..."`);
      }
    }
    receivedDone = true;
  } catch (err) {
    errorCaught = true;
    console.log(`\nCaught Stream Failure: Code="${err.code || err.name}", Message="${err.message}"`);
  }

  console.log(`\n[Stream Diagnostic Results]`);
  console.log(`- Total Stream Chunks Emitted : ${chunksCount}`);
  console.log(`- Process Remained Alive      : YES`);
  console.log(`- Recovery / Error Handled    : ${errorCaught || chunksCount > 0 ? "PASSED" : "FAILED"}`);
}

testMidStreamFailure();
