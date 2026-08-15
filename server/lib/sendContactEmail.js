// ============================================================================
// Shared contact-form handler.
// Used by both api/contact.js (Vercel serverless function) and server.js
// (plain Express server) — so you only maintain the logic in one place.
//
// Requires these environment variables to be set wherever you deploy:
//   SMTP_HOST   e.g. smtp.gmail.com
//   SMTP_PORT   e.g. 587
//   SMTP_USER   the mailbox that sends the email (e.g. your Gmail address)
//   SMTP_PASS   an app password for that mailbox (NOT your normal password)
//   CONTACT_TO  where the message should land — usually the same as SMTP_USER
//
// See README.md -> "Making the contact form actually send email" for the
// step-by-step Gmail app-password setup and deploy instructions.
// ============================================================================

const nodemailer = require("nodemailer");

let cachedTransporter = null;
function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Missing SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS environment variables. " +
      "See README.md for setup instructions."
    );
  }
  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // true for port 465, false for 587/25
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  return cachedTransporter;
}

// Very small sanity check — not a substitute for a captcha, but stops the
// most obviously empty/garbage submissions and basic header injection via
// newlines in the subject line.
function validate({ name, email, message }) {
  const errors = [];
  if (!name || name.trim().length < 2) errors.push("Name is required.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("A valid email is required.");
  if (!message || message.trim().length < 5) errors.push("Message is too short.");
  return errors;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * @param {{name:string, email:string, subject?:string, message:string}} body
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
async function sendContactEmail(body) {
  const name = (body.name || "").trim();
  const email = (body.email || "").trim();
  const subject = (body.subject || "Portfolio contact form").trim().replace(/[\r\n]/g, " ");
  const message = (body.message || "").trim();

  const errors = validate({ name, email, message });
  if (errors.length) return { ok: false, error: errors.join(" ") };

  const to = process.env.CONTACT_TO || process.env.SMTP_USER;
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Portfolio Contact Form" <${process.env.SMTP_USER}>`,
    to,
    replyTo: `"${name}" <${email}>`,
    subject: `[Portfolio] ${subject}`,
    text: `From: ${name} <${email}>\n\n${message}`,
    html: `
      <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
    `
  });

  return { ok: true };
}

module.exports = { sendContactEmail };
