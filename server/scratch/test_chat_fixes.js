// Uses built-in node fetch

async function runTests() {
  console.log("==========================================");
  console.log("RUNNING CHAT FIXES VERIFICATION TESTS...");
  console.log("==========================================");

  // Test 1: "hello there" (in-phrase greeting check)
  console.log("\n[TEST 1] Sending greeting: 'hello there'...");
  try {
    const res1 = await fetch("http://127.0.0.1:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "hello there" }],
        provider: "mock"
      })
    });
    const data1 = await res1.json();
    console.log("Response:", JSON.stringify(data1, null, 2));
    if (data1.content.includes("Recruiter Copilot") && data1.provider === "mock") {
      console.log("✅ TEST 1 PASSED: Greeting correctly handled by mock composeReply!");
    } else {
      console.log("❌ TEST 1 FAILED: Unexpected response content or provider.");
    }
  } catch (err) {
    console.error("Test 1 error:", err.message);
  }

  // Test 2: Off-topic question (should trigger low-confidence fallback)
  console.log("\n[TEST 2] Sending off-topic question: 'What is the capital of France?'...");
  try {
    const res2 = await fetch("http://127.0.0.1:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "What is the capital of France?" }],
        provider: "mock"
      })
    });
    const data2 = await res2.json();
    console.log("Response:", JSON.stringify(data2, null, 2));
    if (data2.content.includes("clarifying follow-up") || data2.content.toLowerCase().includes("does not contain sufficient") || data2.content.includes("I don't have that information")) {
      console.log("✅ TEST 2 PASSED: Low confidence fallback successfully triggered!");
    } else {
      console.log("❌ TEST 2 FAILED: Response did not trigger fallback.");
    }
  } catch (err) {
    console.error("Test 2 error:", err.message);
  }

  // Test 3: Provider fallback (asking Gemini when key is missing/placeholder -> fallback to mock, should report provider 'mock')
  console.log("\n[TEST 3] Sending question to gemini (expecting fallback to mock)...");
  try {
    const res3 = await fetch("http://127.0.0.1:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "What is Khushi's education background?" }],
        provider: "gemini"
      })
    });
    const data3 = await res3.json();
    console.log("Response:", JSON.stringify(data3, null, 2));
    if (data3.provider === "mock") {
      console.log("✅ TEST 3 PASSED: Response successfully reported provider as 'mock'!");
    } else {
      console.log("❌ TEST 3 FAILED: Provider was not reported as 'mock' during fallback.");
    }
  } catch (err) {
    console.error("Test 3 error:", err.message);
  }
}

runTests();
