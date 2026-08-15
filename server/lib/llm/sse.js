/**
 * Reads a fetch() Response body as Server-Sent Events and yields each
 * event's raw `data:` payload as a string. Both OpenAI and Gemini's
 * streaming endpoints speak SSE, so this one reader backs both providers —
 * they just differ in how they parse the JSON payload once it's yielded.
 */
async function* readSSE(response, signal) {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) return;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // last (possibly incomplete) line stays buffered

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith(":")) continue; // blank line / heartbeat comment
        if (line.startsWith("data:")) {
          yield line.slice(5).trim();
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

module.exports = { readSSE };
