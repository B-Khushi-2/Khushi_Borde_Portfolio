async function test() {
  const res = await fetch("http://127.0.0.1:3000/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "What is her CGPA?" }] })
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Raw SSE response (first 1500 chars):");
  console.log(text.slice(0, 1500));
}
test();
