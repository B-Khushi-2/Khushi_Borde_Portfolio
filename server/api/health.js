const express = require("express");
const config = require("../config/env");
const { NO_KEY_REQUIRED } = require("../lib/llm");

const router = express.Router();

router.get("/", (req, res) => {
  const noKeyNeeded = NO_KEY_REQUIRED.has(config.DEFAULT_PROVIDER);
  res.json({
    ok: true,
    uptimeSeconds: Math.round(process.uptime()),
    provider: config.DEFAULT_PROVIDER,
    providerConfigured: noKeyNeeded || Boolean(config.PROVIDER_API_KEYS[config.DEFAULT_PROVIDER]),
    mode: noKeyNeeded ? "mock (no API key — built-in retrieval-only answers)" : "ai (real model calls)",
  });
});

module.exports = router;
