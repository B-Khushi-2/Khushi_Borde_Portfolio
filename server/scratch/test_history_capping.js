const { capHistoryWithSummary } = require("../lib/llm/chatService");

function testHistoryCapping() {
  console.log(`\n==================================================`);
  console.log(`TESTING HISTORY CAPPING (Max 8 turns)`);
  console.log(`==================================================`);

  const longHistory = [
    { role: "user", content: "Turn 1: Tell me about Khushi Borde's education" },
    { role: "assistant", content: "She studies CSE at JNEC (CGPA 9.15)..." },
    { role: "user", content: "Turn 2: What about her hackathons?" },
    { role: "assistant", content: "She won SIH Top 5..." },
    { role: "user", content: "Turn 3: What about AarogyaMitra?" },
    { role: "assistant", content: "It uses n8n webhooks..." },
    { role: "user", content: "Turn 4: What about Fire Detection?" },
    { role: "assistant", content: "It uses 18-layer CNN..." },
    { role: "user", content: "Turn 5: What about FoodBridge?" },
    { role: "assistant", content: "Food redistribution..." },
    { role: "user", content: "Turn 6: What about Tarang?" },
    { role: "assistant", content: "Ocean hazard alerts..." },
    { role: "user", content: "Turn 7: What skills does she have?" },
    { role: "assistant", content: "Python, React, Node..." },
    { role: "user", content: "Turn 8: Is she open for internships?" },
    { role: "assistant", content: "Yes..." },
    { role: "user", content: "Turn 9: How to contact her?" },
    { role: "assistant", content: "khushiborde2@gmail.com" },
    { role: "user", content: "Turn 10: Can she join immediately?" }
  ];

  console.log(`Total Input Turns: ${longHistory.length}`);

  const { trimmedMessages, summaryText } = capHistoryWithSummary(longHistory, 8);

  console.log(`\nTrimmed Messages Sent to LLM: ${trimmedMessages.length}`);
  console.log(`Summary Attached: "${summaryText}"`);
  console.log(`\nMessages Payload Structure:`);
  trimmedMessages.forEach((m, idx) => {
    console.log(` [${idx + 1}] Role: ${m.role} | Content: "${m.content.slice(0, 80)}..."`);
  });
}

testHistoryCapping();
