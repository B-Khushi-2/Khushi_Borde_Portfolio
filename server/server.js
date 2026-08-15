// Express server for the portfolio site + its two backend features:
//   - POST /api/contact         (existing) — sends the contact form by email
//   - POST /api/chat, /stream   (new)      — AI Recruiter Copilot backend
//
//   npm install
//   cp .env.example .env   (fill in SMTP + at least one LLM provider key)
//   npm start
//
// Visit http://localhost:3000

const path = require("path");
const fs = require("fs");
const express = require("express");
const compression = require("compression");

const config = require("./config/env");
const logger = require("./lib/logger");
const requestLogger = require("./middleware/requestLogger");
const { applySecurity } = require("./middleware/security");
const { globalLimiter, contactLimiter } = require("./middleware/rateLimiter");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const { sendContactEmail } = require("./lib/sendContactEmail");
const chatRouter = require("./api/chat");
const healthRouter = require("./api/health");

const app = express();

// Last line of defense: an uncaught exception or unhandled promise
// rejection anywhere (a timer callback, a stray write to a closed socket,
// a bug in a dependency) would otherwise crash this entire process,
// taking every in-flight and future request down with it until it's
// manually restarted — the exact failure mode that caused the chat
// stream's heartbeat bug to surface as a full outage rather than one
// failed request. Logging and staying up is the correct behavior for a
// server handling many independent, unrelated requests.
process.on("uncaughtException", (err) => {
  logger.error({ err }, "uncaughtException (process kept alive)");
});
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandledRejection (process kept alive)");
});

// Needed for correct req.ip / rate limiting when deployed behind a reverse
// proxy or load balancer (Render, Railway, Fly, nginx, etc.).
app.set("trust proxy", 1);

applySecurity(app);
// Gzip/Brotli-negotiated compression for every response this process
// sends (JSON API replies and any static assets it serves) — one of the
// cheapest, highest-leverage wins for transfer size / Lighthouse
// performance score. SSE responses (text/event-stream) are excluded since
// buffering to compress would defeat token-by-token streaming.
app.use(
  compression({
    filter: (req, res) => {
      if (res.getHeader("Content-Type")?.toString().includes("text/event-stream")) return false;
      return compression.filter(req, res);
    },
  })
);
app.use(express.json({ limit: "128kb" })); // increased limit to support larger hiring report prompts
app.use(requestLogger);
app.use(globalLimiter);
const distPath = path.join(__dirname, "../dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.use(
  express.static(__dirname, {
    // Static, content-hashed build assets (e.g. Vite's /assets/*.js|css)
    // can be cached by the browser for a long time since a new deploy
    // ships new filenames; HTML is excluded below since it must always
    // be revalidated so visitors get the latest deploy's asset links.
    maxAge: "1y",
    immutable: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
); // serves index.html, style.css, main.js, etc.

const recruiterRouter = require("./api/recruiter");

app.use("/api/health", healthRouter);
app.use("/api/chat", chatRouter);
app.use("/api/recruiter", recruiterRouter);

app.post("/api/contact", contactLimiter, async (req, res, next) => {
  try {
    const result = await sendContactEmail(req.body || {});
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    next(err);
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

// ---- Startup diagnostics ---------------------------------------------------
(function checkEnvSetup() {
  config.validateStartup(logger);
})();

app.listen(config.PORT, () => {
  logger.info(`Server running at http://localhost:${config.PORT}`);
});
