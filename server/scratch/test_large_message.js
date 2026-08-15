// Uses built-in node fetch
async function runTest() {
  console.log("Sending a 15,000 character prompt to /api/chat...");
  const largePrompt = "A".repeat(15000) + " explain project AarogyaMitra";

  try {
    const res = await fetch("http://127.0.0.1:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: largePrompt }],
        provider: "mock"
      })
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response content length:", data.content ? data.content.length : 0);
    if (res.status === 200) {
      console.log("✅ SUCCESS: Large prompt processed without 400 error!");
    } else {
      console.log("❌ FAILED: Still returned status code", res.status);
    }
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

runTest();
