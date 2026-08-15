/** Base class for any error we want the error-handler middleware to turn
 * into a clean, predictable JSON response (as opposed to an unexpected
 * internal exception). Carries an HTTP status and a machine-readable code
 * so the frontend can branch on `error.code` instead of parsing text. */
class AppError extends Error {
  constructor(message, { status = 500, code = "INTERNAL_ERROR", details } = {}) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Thrown by an LLM provider when the upstream call fails. `retryable`
 * tells the retry helper whether it's worth trying again (network blip,
 * 429, 5xx) or not (bad API key, invalid request — retrying won't help). */
class LLMError extends AppError {
  constructor(message, { status = 502, code = "UPSTREAM_ERROR", retryable = false, details } = {}) {
    super(message, { status, code, details });
    this.name = "LLMError";
    this.retryable = retryable;
  }
}

module.exports = { AppError, LLMError };
