import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/features/copilot/types";
import type { CallState, VoiceModeError, VoiceTranscriptTurn } from "@/features/copilot/voice/types";
import { SentenceChunker } from "@/features/copilot/voice/sentenceChunk";
import {
  isSpeechRecognitionSupported,
  useSpeechRecognition,
} from "@/features/copilot/voice/useSpeechRecognition";
import { isSpeechSynthesisSupported, useSpeechSynthesis } from "@/features/copilot/voice/useSpeechSynthesis";
import { useMicLevel } from "@/features/copilot/voice/useMicLevel";
import { generateId } from "@/lib/id";

interface UseVoiceModeOptions {
  /** Whether the overlay is currently mounted/open — gates all mic/speech activity. */
  active: boolean;
  messages: ChatMessage[];
  sendMessage: (text: string) => string | null;
  stopGenerating: () => void;
}

type ResumeTarget = "listening" | "speaking" | null;

export function useVoiceMode({ active, messages, sendMessage, stopGenerating }: UseVoiceModeOptions) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [micMuted, setMicMuted] = useState(false);
  const [interim, setInterim] = useState("");
  const [transcript, setTranscript] = useState<VoiceTranscriptTurn[]>([]);
  const [error, setError] = useState<VoiceModeError | null>(null);

  const currentAssistantIdRef = useRef<string | null>(null);
  const currentAssistantTurnIdRef = useRef<string | null>(null);
  const chunkerRef = useRef(new SentenceChunker());
  const flushedRef = useRef(false);
  const everQueuedRef = useRef(false);
  const resumeTargetRef = useRef<ResumeTarget>(null);

  const micLevel = useMicLevel();

  const synthesis = useSpeechSynthesis({
    onSpeakStart: () => {
      if (resumeTargetRef.current !== null) return; // don't fight a pause that raced in
      setCallState("speaking");
    },
    onQueueEmpty: () => {
      // Only auto-advance if the assistant message this turn belongs to has
      // actually finished streaming — otherwise wait, more sentences are coming.
      const assistantId = currentAssistantIdRef.current;
      const msg = assistantId ? messages.find((m) => m.id === assistantId) : null;
      const stillStreaming = msg && (msg.status === "streaming" || msg.status === "thinking");
      if (stillStreaming) return;

      currentAssistantIdRef.current = null;
      currentAssistantTurnIdRef.current = null;
      if (resumeTargetRef.current !== null) return; // paused mid-flight
      beginListeningRef.current();
    },
  });

  const recognition = useSpeechRecognition({
    onInterim: (text) => setInterim(text),
    onFinal: (text) => handleFinalTranscriptRef.current(text),
    onError: (err) => {
      if (err.code === "permission-denied") {
        setError({ kind: "permission-denied", message: err.message });
      } else if (err.code === "unsupported") {
        setError({ kind: "unsupported", message: err.message });
      } else {
        setError({ kind: "recognition-error", message: err.message });
      }
      setCallState("idle");
    },
    continuous: false,
  });

  // Keep mic-level metering in lockstep with actual recognition activity,
  // rather than starting/stopping it in every call site.
  useEffect(() => {
    if (recognition.isListening) {
      micLevel.start().catch(() => {
        // Non-fatal — the waveform just won't animate; transcription still works.
      });
    } else {
      micLevel.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recognition.isListening]);

  const beginListening = useCallback(() => {
    if (!active || micMuted || resumeTargetRef.current !== null) return;
    if (!recognition.supported) {
      setError({ kind: "unsupported", message: "Speech recognition isn't supported in this browser." });
      return;
    }
    setInterim("");
    setCallState("listening");
    const selectedVoiceOption = synthesis.voiceOptions.find((v) => v.voiceURI === synthesis.selectedVoiceURI);
    recognition.start(selectedVoiceOption?.lang);
  }, [active, micMuted, recognition, synthesis]);

  // Refs so callbacks created once (in useSpeechSynthesis/useSpeechRecognition
  // above) always call the latest version of these without re-subscribing.
  const beginListeningRef = useRef(beginListening);
  useEffect(() => {
    beginListeningRef.current = beginListening;
  }, [beginListening]);

  const handleFinalTranscript = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      setInterim("");
      if (!trimmed) {
        beginListening();
        return;
      }

      setTranscript((prev) => [...prev, { id: generateId(), role: "user", text: trimmed, final: true }]);
      setCallState("thinking");

      const assistantId = sendMessage(trimmed);
      if (!assistantId) {
        beginListening();
        return;
      }

      currentAssistantIdRef.current = assistantId;
      chunkerRef.current.reset();
      flushedRef.current = false;
      everQueuedRef.current = false;
      synthesis.beginTurn();

      const turnId = generateId();
      currentAssistantTurnIdRef.current = turnId;
      setTranscript((prev) => [...prev, { id: turnId, role: "assistant", text: "", final: false }]);
    },
    [sendMessage, synthesis, beginListening]
  );

  const handleFinalTranscriptRef = useRef(handleFinalTranscript);
  useEffect(() => {
    handleFinalTranscriptRef.current = handleFinalTranscript;
  }, [handleFinalTranscript]);

  // Watches the tracked assistant message as it streams in, feeding
  // newly-completed sentences to the TTS queue and mirroring live text
  // into the call transcript.
  useEffect(() => {
    const assistantId = currentAssistantIdRef.current;
    if (!assistantId) return;
    const msg = messages.find((m) => m.id === assistantId);
    if (!msg) return;

    const turnId = currentAssistantTurnIdRef.current;
    if (turnId) {
      setTranscript((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, text: msg.content } : t))
      );
    }

    if (msg.status === "streaming" || msg.status === "complete") {
      const newSentences = chunkerRef.current.push(msg.content);
      for (const sentence of newSentences) {
        synthesis.enqueue(sentence);
        everQueuedRef.current = true;
      }
    }

    if ((msg.status === "complete" || msg.status === "error") && !flushedRef.current) {
      flushedRef.current = true;
      const rest = chunkerRef.current.flush(msg.content);
      if (rest) {
        synthesis.enqueue(rest);
        everQueuedRef.current = true;
      }
      if (turnId) setTranscript((prev) => prev.map((t) => (t.id === turnId ? { ...t, final: true } : t)));

      // Nothing was ever queued for this turn (e.g. TTS unsupported, or an
      // empty/errored reply) — the onQueueEmpty callback will never fire,
      // so advance back to listening directly.
      if (!synthesis.supported || !everQueuedRef.current) {
        currentAssistantIdRef.current = null;
        currentAssistantTurnIdRef.current = null;
        if (resumeTargetRef.current === null) beginListening();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const interrupt = useCallback(() => {
    stopGenerating();
    synthesis.stop();
    resumeTargetRef.current = null;
    const turnId = currentAssistantTurnIdRef.current;
    if (turnId) setTranscript((prev) => prev.map((t) => (t.id === turnId ? { ...t, final: true } : t)));
    currentAssistantIdRef.current = null;
    currentAssistantTurnIdRef.current = null;
    beginListening();
  }, [stopGenerating, synthesis, beginListening]);

  const togglePause = useCallback(() => {
    if (callState === "paused") {
      const target = resumeTargetRef.current;
      resumeTargetRef.current = null;
      if (target === "speaking") {
        synthesis.resume();
        setCallState("speaking");
      } else {
        beginListening();
      }
      return;
    }

    if (callState === "listening") {
      resumeTargetRef.current = "listening";
      recognition.stop();
      setCallState("paused");
    } else if (callState === "speaking") {
      resumeTargetRef.current = "speaking";
      synthesis.pause();
      setCallState("paused");
    }
  }, [callState, recognition, synthesis, beginListening]);

  const toggleMic = useCallback(() => {
    setMicMuted((wasMuted) => {
      const next = !wasMuted;
      if (next && recognition.isListening) {
        recognition.abort();
        setCallState("idle");
      } else if (!next && callState === "idle" && resumeTargetRef.current === null) {
        beginListening();
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recognition, callState, beginListening]);

  const replay = useCallback(() => {
    resumeTargetRef.current = null;
    setCallState("speaking");
    synthesis.replay();
  }, [synthesis]);

  const dismissError = useCallback(() => {
    setError(null);
    setCallState("idle");
  }, []);

  const retry = useCallback(() => {
    setError(null);
    beginListening();
  }, [beginListening]);

  // Kick off listening as soon as the overlay opens; tear everything down
  // (mic, speech, queued TTS) the moment it closes.
  useEffect(() => {
    if (active) {
      const supported = isSpeechRecognitionSupported();
      if (!supported) {
        setError({
          kind: "unsupported",
          message: "Voice mode needs a browser with speech recognition support, like Chrome or Edge.",
        });
        return;
      }
      setTranscript([]);
      setError(null);
      currentAssistantIdRef.current = null;
      currentAssistantTurnIdRef.current = null;
      resumeTargetRef.current = null;
      everQueuedRef.current = false;
      beginListening();
    } else {
      recognition.abort();
      synthesis.stop();
      micLevel.stop();
      setCallState("idle");
      setInterim("");
      currentAssistantIdRef.current = null;
      currentAssistantTurnIdRef.current = null;
      resumeTargetRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Auto-restart recognition if it shuts down due to silence/timeout while in listening state
  useEffect(() => {
    if (active && callState === "listening" && !recognition.isListening && !micMuted) {
      const t = setTimeout(() => {
        if (active && callState === "listening" && !recognition.isListening) {
          recognition.start();
        }
      }, 150);
      return () => clearTimeout(t);
    }
  }, [active, callState, recognition.isListening, micMuted]);

  return {
    callState,
    micMuted,
    interim,
    transcript,
    error,
    micLevel: micLevel.level,
    ttsSupported: isSpeechSynthesisSupported(),
    permission: recognition.permission,
    voiceOptions: synthesis.voiceOptions,
    selectedVoiceURI: synthesis.selectedVoiceURI,
    setSelectedVoiceURI: synthesis.setSelectedVoiceURI,
    interrupt,
    togglePause,
    toggleMic,
    replay,
    dismissError,
    retry,
    canReplay: transcript.some((t) => t.role === "assistant" && t.final),
  };
}
