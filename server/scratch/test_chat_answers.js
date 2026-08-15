async function test() {
  const questions = [
    "What dataset was used for Fire Detection?",
    "Tell me about Khushi's projects",
    "What is her CGPA?",
    "hello"
  ];

  for (const q of questions) {
    console.log(`\n--- Q: "${q}" ---`);
    try {
      const res = await fetch("http://127.0.0.1:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: q }] })
      });
      console.log("Status:", res.status);
      const data = await res.json();
      console.log("Provider:", data.provider);
      console.log("Confidence:", data.confidence);
      console.log("Reply (first 300 chars):", (data.content || "").slice(0, 300));
      if (data.error) console.log("ERROR:", JSON.stringify(data.error));
    } catch (err) {
      console.error("Fetch failed:", err.message);
    }
  }
}
test();
