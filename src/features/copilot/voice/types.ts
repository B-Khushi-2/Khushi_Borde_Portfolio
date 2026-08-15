/** High-level state machine for a voice call. */
export type CallState =
  | "idle" // overlay open, nothing happening yet (about to start listening)
  | "listening" // capturing mic audio / speech recognition active
  | "thinking" // user turn committed, waiting for the assistant's reply to start
  | "speaking" // assistant reply is being read aloud
  | "paused"; // call is active but muted/paused by the user

export type VoiceModeError =
  | { kind: "unsupported"; message: string }
  | { kind: "permission-denied"; message: string }
  | { kind: "recognition-error"; message: string }
  | { kind: "synthesis-error"; message: string };

export interface VoiceTranscriptTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Live turns (still being captured/streamed) render with a subtler style. */
  final: boolean;
}

export interface VoiceOptionSummary {
  voiceURI: string;
  name: string;
  lang: string;
}
