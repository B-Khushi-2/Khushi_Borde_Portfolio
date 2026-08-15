/**
 * Incrementally splits streamed text into speakable sentence chunks.
 *
 * The chat stream delivers text token-by-token, but speech synthesis wants
 * whole sentences (better prosody, no mid-word cutoffs). This tracks how
 * much of a growing buffer has already been "claimed" for speech and
 * returns only the newly-completed sentences on each call.
 */
export class SentenceChunker {
  private consumedUpTo = 0;

  /** Matches a sentence-ending punctuation mark followed by whitespace (or
   * end of string), so it doesn't split on "3.5" or "Dr. Smith" quite as
   * eagerly as a naive `.` split would. */
  private static BOUNDARY = /[.!?]+[\s]+|[.!?]+$/g;

  /** Feed the full buffer so far (not just the delta). Returns any newly
   * completed sentences since the last call. */
  push(buffer: string): string[] {
    const unclaimed = buffer.slice(this.consumedUpTo);
    const sentences: string[] = [];

    let lastBoundaryEnd = 0;
    SentenceChunker.BOUNDARY.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = SentenceChunker.BOUNDARY.exec(unclaimed)) !== null) {
      // Don't treat a trailing boundary with nothing after it as final
      // unless it's genuinely the end of the current buffer — otherwise
      // "Hi there." at a chunk edge is fine to speak immediately.
      const end = match.index + match[0].length;
      const sentence = unclaimed.slice(lastBoundaryEnd, end).trim();
      if (sentence) sentences.push(sentence);
      lastBoundaryEnd = end;
    }

    if (lastBoundaryEnd > 0) {
      this.consumedUpTo += lastBoundaryEnd;
    }

    return sentences;
  }

  /** Call once the stream is fully done — returns whatever trailing text
   * never hit a sentence boundary (e.g. a reply with no closing punctuation). */
  flush(buffer: string): string | null {
    const rest = buffer.slice(this.consumedUpTo).trim();
    this.consumedUpTo = buffer.length;
    return rest.length > 0 ? rest : null;
  }

  reset() {
    this.consumedUpTo = 0;
  }
}
