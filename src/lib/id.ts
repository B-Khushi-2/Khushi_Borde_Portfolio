/** Generates a short, sufficiently-unique id for client-side-only list keys
 * (chat messages, transient UI state, etc). Not intended for anything that
 * needs cryptographic uniqueness or server-side persistence. */
export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
