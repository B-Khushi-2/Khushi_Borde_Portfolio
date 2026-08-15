function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn`, retrying with exponential backoff + jitter on failure.
 *
 * Deliberately generic (no knowledge of HTTP/LLMs) — `shouldRetry` decides
 * what's worth retrying. Never retries an AbortError: that means the
 * caller (client disconnect, timeout) explicitly wants the operation to
 * stop, not restart.
 */
async function withRetry(fn, { retries = 2, baseDelayMs = 300, maxDelayMs = 4000, shouldRetry = () => true } = {}) {
  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;

      const isAbort = err?.name === "AbortError";
      const canRetry = attempt < retries && !isAbort && shouldRetry(err);
      if (!canRetry) throw err;

      const backoff = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const jitter = Math.random() * backoff * 0.3;
      await sleep(backoff + jitter);
      attempt += 1;
    }
  }

  throw lastError;
}

module.exports = { withRetry, sleep };
