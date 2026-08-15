async function test() {
  // Test the streaming endpoint (this is what the frontend actually uses)
  const questions = [
    "Tell me about Khushi's projects",
    "What dataset was used for Fire Detection?",
    "What is her CGPA?",
    "hello",
    "What are her skills?"
  ];

  for (const q of questions) {
    console.log(`\n--- Q: "${q}" ---`);
    try {
      // Use the streaming endpoint like the frontend does
      const res = await fetch("http://127.0.0.1:3000/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: q }] })
      });
      console.log("Status:", res.status);
      const text = await res.text();
      // Extract just the text content from SSE
      const content = text.split('\n')
        .filter(line => line.startsWith('data: '))
        .map(line => {
          try { return JSON.parse(line.slice(6)); } catch { return null; }
        })
        .filter(d => d && d.token)
        .map(d => d.token)
        .join('');
      console.log("Reply (first 200 chars):", content.slice(0, 200));
    } catch (err) {
      console.error("Fetch failed:", err.message);
    }
  }
}
test();
