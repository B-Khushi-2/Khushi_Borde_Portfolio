const rateLimit = require("express-rate-limit");
const config = require("../config/env");

function jsonRateLimitHandler(req, res) {
  res.status(429).json({
    error: {
      message: "Too many requests. Please slow down and try again shortly.",
      code: "RATE_LIMITED",
      requestId: req.id,
    },
  });
}

// Applied to every route — a generous ceiling that only exists to blunt
// obvious abuse/scripted hammering, not to constrain normal browsing.
const globalLimiter = rateLimit({
  windowMs: config.GLOBAL_RATE_LIMIT_WINDOW_MS,
  max: config.GLOBAL_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// Tighter limit specifically for /api/chat*, since each request there
// costs real LLM-provider tokens/money, unlike a static asset request.
const chatLimiter = rateLimit({
  windowMs: config.CHAT_RATE_LIMIT_WINDOW_MS,
  max: config.CHAT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// A contact form is a common target for spam/abuse bots — the generous
// globalLimiter alone isn't tuned for that, so give /api/contact its own
// tighter ceiling (a real visitor never needs more than a handful of
// submissions per window; each one also sends a real email).
const contactLimiter = rateLimit({
  windowMs: config.CONTACT_RATE_LIMIT_WINDOW_MS,
  max: config.CONTACT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

module.exports = { globalLimiter, chatLimiter, contactLimiter };
