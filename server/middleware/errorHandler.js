const config = require("../config/env");

function notFoundHandler(req, res) {
  res.status(404).json({
    error: { message: "Not found.", code: "NOT_FOUND", requestId: req.id },
  });
}

/** Final Express error middleware. Every thrown AppError/LLMError already
 * carries a safe, user-facing message and code; anything else is an
 * unexpected bug, so its details are logged but never echoed to the
 * client in production. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Streaming routes may have already written to the response (SSE) before
  // failing — headers are sent, so falling through to Express's default
  // handler (which just destroys the connection) is the right move.
  if (res.headersSent) return next(err);

  const status = err.status || 500;
  const isServerFault = status >= 500;

  (req.log || console).error({ err, status, code: err.code }, "request failed");

  res.status(status).json({
    error: {
      message: isServerFault && config.isProd ? "Something went wrong. Please try again shortly." : err.message,
      code: err.code || "INTERNAL_ERROR",
      requestId: req.id,
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
