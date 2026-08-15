// server/scripts/test-structured-eval.js
process.chdir(__dirname + "/..");
const { isStructuredEvalQuery, parseStructuredEvalJson } = require("../lib/llm/structuredEval");
const { getProvider } = require("../lib/llm");
const mockProvider = getProvider("mock");

const queries = [
  "does she know Python",
  "rate her fit for a senior React role",
  "is she suitable for an AI Engineer role",
  "summarize her work experience"
];

async function test() {
  console.log("=== Testing Structured Evaluation Query Path ===\n");
  for (const q of queries) {
    const isEval = isStructuredEvalQuery(q);
    console.log(`Query: "${q}"`);
    console.log(`  isStructuredEvalQuery: ${isEval}`);
    if (isEval) {
      let reply = "";
      for await (const chunk of mockProvider.streamChat({ messages: [{ role: "user", content: q }] })) {
        reply += chunk;
      }
      console.log(`  Streamed Reply: ${reply}`);
      const parsed = parseStructuredEvalJson(reply);
      console.log(`  Parsed JSON:`, parsed);
    }
    console.log();
  }
}

test();
