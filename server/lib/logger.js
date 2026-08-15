const pino = require("pino");
const config = require("../config/env");

const logger = pino({
  level: config.LOG_LEVEL,
  // Pretty, colorized logs locally; plain JSON lines in production so log
  // aggregators (Render/Railway logs, Datadog, etc.) can parse them.
  transport: config.isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
  // Never let API keys or auth headers end up in a log line, even by accident.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.apiKey",
      "*.OPENAI_API_KEY",
      "*.GEMINI_API_KEY",
    ],
    censor: "[redacted]",
  },
});

module.exports = logger;
