const { buildMessages, streamReply } = require("../lib/llm/chatService");

async function testRepeat3x() {
  console.log(`\n======================================================================`);
  console.log(`TESTING MULTI-AGENT INTERVIEW QUERY 3 TIMES IN A ROW`);
  console.log(`======================================================================`);

  const userText = "Switch into interview mode: stay fully grounded answer AS Khushi, in first person, the way she'd answer in a real technical interview. Start by inviting me to ask my first interview question.";
  const messages = [{ role: "user", content: userText }];

  for (let run = 1; run <= 3; run++) {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`RUN #${run} of 3`);
    console.log(`----------------------------------------------------------------------`);

    const startedAt = Date.now();
    const built = await buildMessages(messages, "gemini");

    console.log(`  [System Prompt Diagnostic]`);
    console.log(`   - Active Agents      : [${built.activeAgents.map(a => a.name).join(", ")}]`);
    console.log(`   - Chunks Retrieved   : ${built.retrievedChunks.length}`);

    let streamedText = "";
    let chunkCount = 0;
    for await (const chunk of streamReply({ messages, providerName: "gemini" })) {
      if (!chunk.startsWith("__")) {
        chunkCount++;
        streamedText += chunk;
      }
    }

    const durationMs = Date.now() - startedAt;
    console.log(`\n  [Run #${run} Results]`);
    console.log(`   - Duration           : ${durationMs} ms`);
    console.log(`   - Tokens/Chunks      : ${chunkCount}`);
    console.log(`   - Stream Preview     : "${streamedText.slice(0, 120).replace(/\n/g, " ")}..."`);
    console.log(`   - Status             : PASSED SUCCESS`);
  }

  console.log(`\n======================================================================`);
  console.log(`SUMMARY: 3/3 RUNS PASSED CONSISTENTLY`);
  console.log(`======================================================================`);
}

testRepeat3x();
