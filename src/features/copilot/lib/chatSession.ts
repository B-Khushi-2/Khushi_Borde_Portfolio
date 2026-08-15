/**
 * src/features/copilot/lib/chatSession.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin localStorage wrapper that persists and restores the Copilot message
 * thread across page reloads.
 *
 * Storage layout (both keys live in localStorage):
 *   copilot-session-id          → the current session UUID string
 *   copilot-session:{id}        → JSON-serialised PersistedSession object
 *
 * Only messages with status === "complete" are persisted so a page refresh
 * after a mid-stream abort never restores a broken / half-filled bubble.
 */

import type { ChatMessage } from "@/features/copilot/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersistedSession {
  /** Schema version so we can gracefully migrate if the shape changes. */
  v: 1;
  id: string;
  messages: ChatMessage[];
  savedAt: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSION_ID_KEY = "copilot-session-id";
const SESSION_DATA_KEY_PREFIX = "copilot-session:";

/** Sessions older than this are treated as stale and discarded on load.
 *  Keep it generous (7 days) so returning visitors still get their history. */
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// ── Session ID helpers ────────────────────────────────────────────────────────

/** Generates a UUID-like session ID. Uses crypto.randomUUID() when available
 *  (all modern browsers) with a timestamp+random fallback. */
export function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + 4 random segments
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** Returns the persisted session ID, or generates and stores a new one. */
export function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
  } catch {
    // localStorage unavailable (private browsing, quota exceeded, etc.)
  }
  const id = generateSessionId();
  try {
    localStorage.setItem(SESSION_ID_KEY, id);
  } catch {
    // Best-effort — the rest of the feature still works without persistence.
  }
  return id;
}

/** Replaces the stored session ID with a fresh one (called on "Clear chat"). */
export function renewSessionId(): string {
  const id = generateSessionId();
  try {
    localStorage.setItem(SESSION_ID_KEY, id);
  } catch {}
  return id;
}

// ── Session data helpers ──────────────────────────────────────────────────────

function dataKey(id: string): string {
  return `${SESSION_DATA_KEY_PREFIX}${id}`;
}

/**
 * Loads a previously persisted session from localStorage.
 * Returns `null` if nothing is stored, the data is corrupt, or the session is
 * older than SESSION_MAX_AGE_MS.
 */
export function loadSession(id: string): ChatMessage[] | null {
  try {
    const raw = localStorage.getItem(dataKey(id));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (parsed.v !== 1 || !Array.isArray(parsed.messages)) return null;
    if (Date.now() - (parsed.savedAt ?? 0) > SESSION_MAX_AGE_MS) {
      // Stale — clean up and return null so a fresh session starts.
      localStorage.removeItem(dataKey(id));
      return null;
    }

    // Restore all messages; any that were streaming/thinking at save time were
    // filtered out already, so they all come back as "complete".
    return parsed.messages.map((m) => ({ ...m, status: "complete" as const }));
  } catch {
    return null;
  }
}

/**
 * Persists the current message thread to localStorage.
 * Only "complete" messages are stored — streaming/thinking bubbles are excluded
 * so a reload never shows a broken partial reply.
 */
export function saveSession(id: string, messages: ChatMessage[]): void {
  try {
    const toStore = messages.filter(
      (m) => m.status === "complete" && m.content.trim().length > 0
    );
    const session: PersistedSession = {
      v: 1,
      id,
      messages: toStore,
      savedAt: Date.now(),
    };
    localStorage.setItem(dataKey(id), JSON.stringify(session));
  } catch {
    // Quota exceeded or unavailable — silently skip.
  }
}

/**
 * Removes the localStorage entry for a session.
 * Called when the user clicks "Clear chat" — `renewSessionId()` should be
 * called immediately after to start a fresh session.
 */
export function clearLocalSession(id: string): void {
  try {
    localStorage.removeItem(dataKey(id));
  } catch {}
}
