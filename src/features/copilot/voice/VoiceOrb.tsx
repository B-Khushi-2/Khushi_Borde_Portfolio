import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import type { CallState } from "@/features/copilot/voice/types";
import { cn } from "@/lib/utils";

interface VoiceOrbProps {
  state: CallState;
  level: number; // 0..1 mic amplitude, used while listening
  hasError: boolean;
  onClick?: () => void;
  size?: number;
}

/** Deterministic per-bar weighting so the waveform doesn't pulse as one
 * flat block — each bar reacts to the mic level a little differently. */
const BAR_WEIGHTS = [0.55, 0.85, 1, 0.85, 0.55];

export function VoiceOrb({ state, level, hasError, onClick, size = 176 }: VoiceOrbProps) {
  const bars = useMemo(
    () =>
      BAR_WEIGHTS.map((weight, i) => ({
        id: i,
        weight,
      })),
    []
  );

  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isSpeaking = state === "speaking";
  const isPaused = state === "paused";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "relative flex items-center justify-center rounded-full outline-none transition-transform",
        onClick && "cursor-pointer active:scale-[0.97]"
      )}
      style={{ width: size, height: size }}
      aria-label={
        isSpeaking ? "Tap to interrupt" : isListening ? "Listening" : isThinking ? "Thinking" : "Voice"
      }
    >
      {/* Ambient glow rings */}
      <motion.span
        className={cn(
          "absolute inset-0 rounded-full blur-2xl",
          hasError
            ? "bg-[hsl(var(--destructive)/0.35)]"
            : "bg-gradient-to-br from-[hsl(var(--primary)/0.55)] to-[hsl(var(--accent)/0.45)]"
        )}
        animate={
          isListening
            ? { scale: 1 + level * 0.35, opacity: 0.7 + level * 0.3 }
            : isSpeaking
            ? { scale: [1, 1.12, 1], opacity: [0.6, 0.85, 0.6] }
            : { scale: 1, opacity: isPaused ? 0.3 : 0.55 }
        }
        transition={
          isSpeaking
            ? { repeat: Infinity, duration: 1.6, ease: "easeInOut" }
            : { type: "spring", stiffness: 200, damping: 20 }
        }
      />

      {/* Core orb */}
      <motion.span
        className={cn(
          "relative flex h-[68%] w-[68%] items-center justify-center rounded-full",
          "bg-gradient-to-br shadow-inner",
          hasError
            ? "from-[hsl(var(--destructive))] to-[hsl(var(--destructive)/0.7)]"
            : "from-[hsl(var(--primary))] to-[hsl(var(--accent))]"
        )}
        animate={
          isListening
            ? { scale: 1 + level * 0.12 }
            : isSpeaking
            ? { scale: [1, 1.03, 1] }
            : { scale: 1 }
        }
        transition={
          isSpeaking
            ? { repeat: Infinity, duration: 1.1, ease: "easeInOut" }
            : { type: "spring", stiffness: 300, damping: 18 }
        }
        style={{
          boxShadow: "inset 0 2px 12px rgba(255,255,255,0.25), inset 0 -8px 20px rgba(0,0,0,0.25)",
        }}
      >
        {hasError ? (
          <AlertCircle size={size * 0.22} className="text-white" />
        ) : isThinking ? (
          <Loader2 size={size * 0.2} className="animate-spin text-white" />
        ) : (
          <div className="flex items-center gap-[3px]">
            {bars.map((bar) => (
              <motion.span
                key={bar.id}
                className="w-[3.5px] rounded-full bg-white"
                animate={{
                  height: isListening
                    ? Math.max(6, level * 46 * bar.weight)
                    : isSpeaking
                    ? [6, 26 * bar.weight, 6]
                    : 6,
                }}
                transition={
                  isSpeaking
                    ? { repeat: Infinity, duration: 0.9 + bar.id * 0.08, ease: "easeInOut" }
                    : { type: "spring", stiffness: 400, damping: 24 }
                }
              />
            ))}
          </div>
        )}
      </motion.span>
    </button>
  );
}
