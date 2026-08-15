import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Keyboard, MicOff, X } from "lucide-react";
import type { ChatMessage } from "@/features/copilot/types";
import { useVoiceMode } from "@/features/copilot/voice/useVoiceMode";
import { VoiceOrb } from "@/features/copilot/voice/VoiceOrb";
import { VoiceControls } from "@/features/copilot/voice/VoiceControls";
import type { CallState } from "@/features/copilot/voice/types";

interface VoiceModeOverlayProps {
  open: boolean;
  messages: ChatMessage[];
  sendMessage: (text: string) => string | null;
  stopGenerating: () => void;
  onClose: () => void;
}

const STATE_LABEL: Record<CallState, string> = {
  idle: "Tap mic to speak",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking — tap to interrupt",
  paused: "Paused",
};

export function VoiceModeOverlay({
  open,
  messages,
  sendMessage,
  stopGenerating,
  onClose,
}: VoiceModeOverlayProps) {
  const voice = useVoiceMode({ active: open, messages, sendMessage, stopGenerating });

  // Own the Escape key while open, in capture phase, so it can't also
  // trigger the base panel's Escape handler (which is suspended anyway
  // while voice mode is active, but this is a harmless belt-and-braces).
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [open, onClose]);

  if (!open) return null;

  const lastTurns = voice.transcript.slice(-2);
  const liveCaption =
    voice.callState === "listening" && voice.interim
      ? voice.interim
      : lastTurns.length > 0
      ? lastTurns[lastTurns.length - 1].text
      : "";
  const captionRole = lastTurns.length > 0 ? lastTurns[lastTurns.length - 1].role : "assistant";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[1000] flex flex-col bg-[hsl(var(--background)/0.97)] backdrop-blur-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Voice mode"
        data-copilot-root
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <p className="text-xs font-medium tracking-wide text-[hsl(var(--muted-foreground))]">
              VOICE MODE
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close voice mode"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] outline-none transition-colors hover:bg-white/[0.08] hover:text-[hsl(var(--foreground))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Center content */}
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
          {voice.error ? (
            <ErrorPanel
              kind={voice.error.kind}
              message={voice.error.message}
              onRetry={voice.retry}
              onSwitchToText={onClose}
            />
          ) : (
            <>
              <VoiceOrb
                state={voice.callState}
                level={voice.micLevel}
                hasError={false}
                onClick={
                  voice.callState === "speaking" || voice.callState === "thinking"
                    ? voice.interrupt
                    : undefined
                }
              />

              <div className="flex min-h-[64px] w-full max-w-sm flex-col items-center gap-2 text-center">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  {STATE_LABEL[voice.callState]}
                </p>
                <AnimatePresence mode="wait">
                  {liveCaption && (
                    <motion.p
                      key={liveCaption.slice(0, 24) + captionRole}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="line-clamp-3 text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]"
                    >
                      {captionRole === "user" ? "\u201C" : ""}
                      {liveCaption}
                      {captionRole === "user" ? "\u201D" : ""}
                    </motion.p>
                  )}
                </AnimatePresence>
                {!voice.ttsSupported && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                    <MicOff size={11} />
                    Spoken replies aren&apos;t supported here — showing text only.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        {!voice.error && (
          <div className="px-6 pb-10 pt-2">
            <VoiceControls
              callState={voice.callState}
              micMuted={voice.micMuted}
              onToggleMic={voice.toggleMic}
              onTogglePause={voice.togglePause}
              onReplay={voice.replay}
              canReplay={voice.canReplay}
              onSwitchToText={onClose}
              onEndCall={onClose}
              voiceOptions={voice.voiceOptions}
              selectedVoiceURI={voice.selectedVoiceURI}
              onSelectVoice={voice.setSelectedVoiceURI}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function ErrorPanel({
  kind,
  message,
  onRetry,
  onSwitchToText,
}: {
  kind: "unsupported" | "permission-denied" | "recognition-error" | "synthesis-error";
  message: string;
  onRetry: () => void;
  onSwitchToText: () => void;
}) {
  const canRetry = kind === "recognition-error" || kind === "permission-denied";

  return (
    <div className="flex max-w-sm flex-col items-center gap-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]">
        <AlertCircle size={28} />
      </span>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
          {kind === "unsupported"
            ? "Voice mode isn't available"
            : kind === "permission-denied"
            ? "Microphone access needed"
            : "Something interrupted the call"}
        </p>
        <p className="text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">{message}</p>
        {kind === "permission-denied" && (
          <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
            Check your browser&apos;s site settings to allow microphone access, then try again.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 pt-1">
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-[hsl(var(--primary))] px-4 py-2 text-[13px] font-medium text-[hsl(var(--primary-foreground))] outline-none transition-all hover:brightness-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          >
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={onSwitchToText}
          className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-4 py-2 text-[13px] font-medium text-[hsl(var(--foreground))] outline-none transition-all hover:bg-white/[0.12] active:scale-95 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
        >
          <Keyboard size={14} />
          Switch to text
        </button>
      </div>
    </div>
  );
}
