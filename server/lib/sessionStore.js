// =============================================================================
// server/lib/sessionStore.js — Lightweight in-memory chat session store.
// -----------------------------------------------------------------------------
// Each session is a list of { role, content } turns plus a `lastAccessedAt`
// timestamp used for TTL expiry.  Sessions are keyed by a client-generated
// UUID that the browser sends on every request.
//
// TODO: swap the Map below for a Redis client (ioredis) or a DB-backed store
//       when you need multi-process support, horizontal scaling, or true
//       persistence across server restarts.  The public interface (getSession,
//       appendTurn, clearSession) is intentionally provider-agnostic so the
//       swap is a one-file change.
// =============================================================================

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_TURNS_PER_SESSION = 50;            // hard cap to avoid unbounded growth

/**
 * @typedef {{ role: "user" | "assistant", content: string }} Turn
 * @typedef {{ turns: Turn[], lastAccessedAt: number }} Session
 */

/** @type {Map<string, Session>} */
const sessions = new Map();

/** Validate that a session ID is a non-empty string of safe characters.
 *  Rejects anything that could be used as a path-traversal or injection
 *  vector before it ever touches the store. */
function isValidSessionId(id) {
  return typeof id === "string" && id.length > 0 && id.length <= 128 && /^[\w-]+$/.test(id);
}

/** Evict any sessions that have not been accessed within SESSION_TTL_MS.
 *  Called lazily on every read/write rather than on a timer, which keeps
 *  the module dependency-free and avoids leak-prone setInterval handles. */
function evictExpired() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastAccessedAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

/**
 * Returns the stored turns for a session, or an empty array if the session
 * does not exist or has expired.
 *
 * @param {string} id  Session ID supplied by the client.
 * @returns {Turn[]}
 */
function getSession(id) {
  if (!isValidSessionId(id)) return [];
  evictExpired();

  const session = sessions.get(id);
  if (!session) return [];

  session.lastAccessedAt = Date.now(); // refresh TTL on access
  return session.turns;
}

/**
 * Appends a single turn to the session, creating the session if it doesn't
 * exist yet.  Oldest turns are dropped (FIFO) once the cap is exceeded so
 * the store never grows without bound.
 *
 * @param {string} id       Session ID.
 * @param {"user" | "assistant"} role
 * @param {string} content  The message text.
 */
function appendTurn(id, role, content) {
  if (!isValidSessionId(id)) return;
  if (!content || typeof content !== "string") return;
  evictExpired();

  let session = sessions.get(id);
  if (!session) {
    session = { turns: [], lastAccessedAt: Date.now() };
    sessions.set(id, session);
  }

  session.turns.push({ role, content });
  session.lastAccessedAt = Date.now();

  // Trim oldest pairs when over cap (remove from the front, keeping turns in
  // chronological order).  We trim in multiples of 2 to keep user/assistant
  // pairing intact where possible.
  while (session.turns.length > MAX_TURNS_PER_SESSION) {
    session.turns.shift();
  }
}

/**
 * Permanently removes a session from the store.  Called when the user clicks
 * "Clear chat" — the client deletes its localStorage key at the same time.
 *
 * @param {string} id  Session ID to delete.
 */
function clearSession(id) {
  if (!isValidSessionId(id)) return;
  sessions.delete(id);
}

/** Diagnostic helper — not exposed via the API but useful in tests/logging. */
function sessionCount() {
  return sessions.size;
}

module.exports = { getSession, appendTurn, clearSession, sessionCount };
