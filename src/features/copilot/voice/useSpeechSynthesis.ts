import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VoiceOptionSummary } from "@/features/copilot/voice/types";

export const isSpeechSynthesisSupported = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

const PREFERRED_VOICE_NAME_HINTS = [
  "Google US English",
  "Samantha",
  "Aria",
  "Jenny",
  "Natural",
];

function pickDefaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  for (const hint of PREFERRED_VOICE_NAME_HINTS) {
    const match = voices.find((v) => v.name.includes(hint));
    if (match) return match;
  }
  const englishLocal = voices.find((v) => v.lang.startsWith("en") && v.localService);
  if (englishLocal) return englishLocal;
  const english = voices.find((v) => v.lang.startsWith("en"));
  return english ?? voices[0];
}

interface UseSpeechSynthesisOptions {
  onSpeakStart?: () => void;
  /** Fires once the whole queued turn (all sentences) has finished speaking. */
  onQueueEmpty?: () => void;
}

/**
 * Queues sentence-sized chunks of text and speaks them back-to-back so a
 * streaming reply can start being read aloud before the full message has
 * arrived. Supports pause/resume, a hard interrupt (clears the queue), and
 * replaying the last completed turn.
 */
export function useSpeechSynthesis({ onSpeakStart, onQueueEmpty }: UseSpeechSynthesisOptions = {}) {
  const supported = isSpeechSynthesisSupported();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const queueRef = useRef<string[]>([]);
  const lastTurnRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const stoppedRef = useRef(false);

  const onSpeakStartRef = useRef(onSpeakStart);
  const onQueueEmptyRef = useRef(onQueueEmpty);
  useEffect(() => {
    onSpeakStartRef.current = onSpeakStart;
    onQueueEmptyRef.current = onQueueEmpty;
  }, [onSpeakStart, onQueueEmpty]);

  // Voice list loads asynchronously in most browsers.
  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [supported]);

  useEffect(() => {
    if (selectedVoiceURI || voices.length === 0) return;
    const def = pickDefaultVoice(voices);
    if (def) setSelectedVoiceURI(def.voiceURI);
  }, [voices, selectedVoiceURI]);

  const selectedVoice = useMemo(
    () => voices.find((v) => v.voiceURI === selectedVoiceURI) ?? null,
    [voices, selectedVoiceURI]
  );

  const voiceOptions: VoiceOptionSummary[] = useMemo(
    () => voices.map((v) => ({ voiceURI: v.voiceURI, name: v.name, lang: v.lang })),
    [voices]
  );

  const speakNext = useCallback(() => {
    if (stoppedRef.current) return;
    
    // Check if sound is muted by user via header controls
    if (typeof window !== "undefined" && localStorage.getItem("copilot-muted") === "true") {
      queueRef.current = [];
      speakingRef.current = false;
      setIsSpeaking(false);
      onQueueEmptyRef.current?.();
      return;
    }

    const next = queueRef.current.shift();
    if (!next) {
      speakingRef.current = false;
      setIsSpeaking(false);
      onQueueEmptyRef.current?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(next);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 1.02;
    utterance.pitch = 1;

    utterance.onstart = () => {
      if (!speakingRef.current) {
        speakingRef.current = true;
        setIsSpeaking(true);
        onSpeakStartRef.current?.();
      }
    };
    utterance.onend = () => {
      if (stoppedRef.current) return;
      speakNext();
    };
    utterance.onerror = (e) => {
      // "interrupted"/"canceled" are expected from our own cancel() calls.
      if (e.error === "interrupted" || e.error === "canceled") return;
      speakNext();
    };

    window.speechSynthesis.speak(utterance);
  }, [selectedVoice]);

  /** Queue a chunk of text (usually one sentence) to be spoken, starting
   * immediately if nothing else is currently playing. */
  const enqueue = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      stoppedRef.current = false;
      queueRef.current.push(text);
      lastTurnRef.current.push(text);
      if (!speakingRef.current) {
        speakNext();
      }
    },
    [supported, speakNext]
  );

  /** Clears the queue and stops speech immediately — used on interrupt. */
  const stop = useCallback(() => {
    stoppedRef.current = true;
    queueRef.current = [];
    speakingRef.current = false;
    setIsSpeaking(false);
    setIsPaused(false);
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const pause = useCallback(() => {
    if (!supported || !speakingRef.current) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [supported]);

  /** Starts a fresh turn — clears what "replay" would repeat. Call this at
   * the beginning of every new assistant reply, not just once per call. */
  const beginTurn = useCallback(() => {
    lastTurnRef.current = [];
  }, []);

  /** Re-speaks the most recently completed turn from the start. */
  const replay = useCallback(() => {
    if (!supported || lastTurnRef.current.length === 0) return;
    stop();
    stoppedRef.current = false;
    const turn = [...lastTurnRef.current];
    queueRef.current = turn;
    lastTurnRef.current = turn;
    speakNext();
  }, [supported, stop, speakNext]);

  useEffect(() => () => stop(), [stop]);

  return {
    supported,
    isSpeaking,
    isPaused,
    voiceOptions,
    selectedVoiceURI,
    setSelectedVoiceURI,
    enqueue,
    stop,
    pause,
    resume,
    beginTurn,
    replay,
  };
}
