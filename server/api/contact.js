// Vercel serverless function.
// Deploying this whole folder to Vercel automatically turns this file into
// a live endpoint at:  https://your-site.vercel.app/api/contact
// No extra config needed beyond setting the environment variables below
// in the Vercel dashboard (Project -> Settings -> Environment Variables).

const { sendContactEmail } = require("../lib/sendContactEmail");

// Best-effort rate limiting for this serverless function. It doesn't share
// the Express app's express-rate-limit instance (this file runs as its
// own isolated Vercel function), so this is a small self-contained
// sliding-window limiter instead. It's scoped to one warm function
// instance and resets on a cold start — a real limitation for serverless,
// but still meaningfully raises the bar against scripted spam of a form
// that sends a real email per submission, at effectively zero cost.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map(); // ip -> timestamps[]

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  hits.set(ip, timestamps);
  return timestamps.length > MAX_PER_WINDOW;
}

module.exports = async (req, res) => {
  // Basic CORS — safe to leave open since this endpoint only accepts a
  // contact-form payload and mails it to one fixed address.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed." });

  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ ok: false, error: "Too many requests. Please try again shortly." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const result = await sendContactEmail(body);
    return res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    console.error("contact form error:", err);
    const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    return res.status(500).json({
      ok: false,
      error: isProd
        ? "Something went wrong sending the email. Please try again shortly."
        : `Backend error: ${err.message}`
    });
  }
};
