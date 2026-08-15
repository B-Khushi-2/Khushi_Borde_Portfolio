import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API's SpeechRecognition isn't in TS's lib.dom.d.ts yet,
// so a minimal local shape covers what's actually used here.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const isSpeechRecognitionSupported = () => getSpeechRecognitionCtor() !== null;

export type MicPermissionState = "unknown" | "granted" | "denied";

interface UseSpeechRecognitionOptions {
  /** Called with the live (interim) transcript as the user talks. */
  onInterim: (text: string) => void;
  /** Called once a chunk of speech is finalized (silence detected / stop()). */
  onFinal: (text: string) => void;
  onError: (error: { code: string; message: string }) => void;
  continuous?: boolean;
}

/**
 * Thin wrapper around the browser's SpeechRecognition API, exposing a
 * simple start/stop control surface plus interim + final transcript
 * callbacks. Restarts are the caller's responsibility (recognition here
 * runs one "turn" at a time rather than continuous background listening,
 * which matches a push-to-talk-by-silence voice-call UX better).
 */
export function useSpeechRecognition({
  onInterim,
  onFinal,
  onError,
  continuous = false,
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [permission, setPermission] = useState<MicPermissionState>("unknown");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const intentionalStopRef = useRef(false);

  // Keep latest callbacks in refs so the recognition instance (created once)
  // never closes over stale versions.
  const onInterimRef = useRef(onInterim);
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onInterimRef.current = onInterim;
    onFinalRef.current = onFinal;
    onErrorRef.current = onError;
  }, [onInterim, onFinal, onError]);

  const supported = isSpeechRecognitionSupported();

  const ensureRecognition = useCallback((): SpeechRecognitionLike | null => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return null;

    const recognition = new Ctor();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onstart = () => {
      setPermission("granted");
      setIsListening(true);
    };

    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscriptRef.current += transcript;
        } else {
          interim += transcript;
        }
      }
      onInterimRef.current(finalTranscriptRef.current + interim);
    };

    recognition.onerror = (e) => {
      if (e.error === "aborted") return; // We caused this ourselves — not a real error.
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        setPermission("denied");
        onErrorRef.current({ code: "permission-denied", message: "Microphone access was denied." });
      } else if (e.error === "no-speech") {
        // Not fatal — just means the mic timed out with no input. onend will follow.
      } else {
        onErrorRef.current({ code: e.error, message: `Speech recognition error: ${e.error}` });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      const finalText = finalTranscriptRef.current.trim();
      finalTranscriptRef.current = "";
      if (!intentionalStopRef.current || finalText) {
        // Report whatever was captured, even on an unexpected end (browser
        // auto-stop after a long pause), so the turn isn't silently lost.
        if (finalText) onFinalRef.current(finalText);
      }
      intentionalStopRef.current = false;
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [continuous]);

  const start = useCallback((lang?: string) => {
    const recognition = ensureRecognition();
    if (!recognition) {
      onErrorRef.current({ code: "unsupported", message: "Speech recognition isn't supported in this browser." });
      return;
    }
    if (lang) {
      recognition.lang = lang;
    }
    finalTranscriptRef.current = "";
    intentionalStopRef.current = false;
    try {
      recognition.start();
    } catch (err) {
      // start() throws InvalidStateError if recognition is already running —
      // harmless, safe to ignore. Anything else (e.g. insecure context,
      // no mic device, browser-specific start failures) must be surfaced,
      // otherwise the UI is left showing "Listening…" forever with no
      // audio ever captured and no indication anything went wrong.
      const name = (err as { name?: string } | undefined)?.name;
      if (name !== "InvalidStateError") {
        setIsListening(false);
        onErrorRef.current({
          code: "start-failed",
          message: `Couldn't start the microphone: ${(err as Error)?.message || "unknown error"}.`,
        });
      }
    }
  }, [ensureRecognition]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  const abort = useCallback(() => {
    intentionalStopRef.current = true;
    finalTranscriptRef.current = "";
    recognitionRef.current?.abort();
  }, []);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, isListening, permission, start, stop, abort };
}
