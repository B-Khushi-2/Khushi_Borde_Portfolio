const { randomUUID } = require("crypto");
const pinoHttp = require("pino-http");
const logger = require("../lib/logger");

/** Assigns each request a short-lived id (echoed back as X-Request-Id) and
 * logs method/path/status/duration through the shared pino logger. Chat
 * message content is never included here — only shape/size, via the route
 * handler's own log lines. */
const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = req.headers["x-request-id"] || randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req(req) {
      return { id: req.id, method: req.method, url: req.url };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
});

module.exports = requestLogger;
