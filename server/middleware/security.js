const helmet = require("helmet");
const cors = require("cors");
const config = require("../config/env");
const { AppError } = require("../lib/errors");

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser clients (curl, server-to-server, same-origin) which
    // send no Origin header at all, then check browser origins against the
    // configured allowlist.
    if (
      !origin ||
      config.ALLOWED_ORIGINS.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      origin.endsWith(".onrender.com")
    ) {
      callback(null, true);
    } else {
      callback(new AppError("This origin is not allowed to call this API.", { status: 403, code: "CORS_NOT_ALLOWED" }));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

// The one inline <script> the built index.html ships (the anti-FOUC theme
// setter that must run before first paint, so it can't be an external
// file without a render-blocking network request). Allow-listed by exact
// SHA-256 hash rather than 'unsafe-inline', so the CSP still blocks any
// *other* inline/injected script. Recompute this if that script's exact
// text ever changes (see index.html).
const THEME_SCRIPT_HASH = "'sha256-br6XnhCF7u1ZUD3ydFkqiT9F5zLS5MaNaSA4h+Odk/M='";

/** Applies helmet (security headers, including a real CSP scoped to what
 * this static site + API actually needs) and a CORS allowlist. Kept as
 * one function so server.js has a single, obvious "security goes here" line. */
function applySecurity(app) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", THEME_SCRIPT_HASH],
          // React inline `style={{...}}` renders as style *attributes*,
          // which style-src (not just script-src) governs — 'unsafe-inline'
          // here is what that requires; it does not relax script execution.
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:"],
          mediaSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(cors(corsOptions));
}

module.exports = { applySecurity, corsOptions };
