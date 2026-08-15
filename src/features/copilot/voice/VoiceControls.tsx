import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Keyboard, Mic, MicOff, Pause, PhoneOff, Play, RotateCcw } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CallState, VoiceOptionSummary } from "@/features/copilot/voice/types";

interface VoiceControlsProps {
  callState: CallState;
  micMuted: boolean;
  onToggleMic: () => void;
  onTogglePause: () => void;
  onReplay: () => void;
  canReplay: boolean;
  onSwitchToText: () => void;
  onEndCall: () => void;
  voiceOptions: VoiceOptionSummary[];
  selectedVoiceURI: string | null;
  onSelectVoice: (uri: string) => void;
}

function ControlButton({
  label,
  onClick,
  disabled,
  active,
  variant = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <Tooltip label={label} side="top">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full outline-none transition-all duration-150",
          "active:scale-90 disabled:opacity-30 disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]",
          variant === "danger"
            ? "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:brightness-110"
            : active
            ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
            : "bg-white/[0.07] text-[hsl(var(--foreground))] hover:bg-white/[0.12]"
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function VoicePicker({
  voiceOptions,
  selectedVoiceURI,
  onSelectVoice,
}: {
  voiceOptions: VoiceOptionSummary[];
  selectedVoiceURI: string | null;
  onSelectVoice: (uri: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = voiceOptions.find((v) => v.voiceURI === selectedVoiceURI);

  if (voiceOptions.length === 0) return null;

  return (
    <div className="relative">
      <Tooltip label="Voice">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex h-12 items-center gap-1.5 rounded-full bg-white/[0.07] px-4 text-sm text-[hsl(var(--foreground))] outline-none transition-all duration-150 hover:bg-white/[0.12] active:scale-95 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
        >
          <span className="max-w-[92px] truncate">{selected?.name.replace(/^Google\s/, "") ?? "Voice"}</span>
          <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
        </button>
      </Tooltip>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-1/2 z-20 mb-2 max-h-64 w-64 -translate-x-1/2 overflow-y-auto copilot-scroll rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] p-1.5 shadow-2xl"
            >
              {voiceOptions.map((v) => (
                <button
                  key={v.voiceURI}
                  type="button"
                  onClick={() => {
                    onSelectVoice(v.voiceURI);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] outline-none transition-colors hover:bg-[hsl(var(--secondary))]",
                    v.voiceURI === selectedVoiceURI
                      ? "text-[hsl(var(--foreground))]"
                      : "text-[hsl(var(--muted-foreground))]"
                  )}
                >
                  <span className="truncate">
                    {v.name} <span className="text-[11px] opacity-60">({v.lang})</span>
                  </span>
                  {v.voiceURI === selectedVoiceURI && <Check size={14} className="shrink-0 text-[hsl(var(--primary))]" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function VoiceControls({
  callState,
  micMuted,
  onToggleMic,
  onTogglePause,
  onReplay,
  canReplay,
  onSwitchToText,
  onEndCall,
  voiceOptions,
  selectedVoiceURI,
  onSelectVoice,
}: VoiceControlsProps) {
  const canPause = callState === "listening" || callState === "speaking" || callState === "paused";

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <ControlButton label={micMuted ? "Unmute microphone" : "Mute microphone"} onClick={onToggleMic} active={micMuted}>
        {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
      </ControlButton>

      <ControlButton
        label={callState === "paused" ? "Resume" : "Pause"}
        onClick={onTogglePause}
        disabled={!canPause}
        active={callState === "paused"}
      >
        {callState === "paused" ? <Play size={18} /> : <Pause size={18} />}
      </ControlButton>

      <ControlButton label="Replay last reply" onClick={onReplay} disabled={!canReplay}>
        <RotateCcw size={17} />
      </ControlButton>

      <VoicePicker voiceOptions={voiceOptions} selectedVoiceURI={selectedVoiceURI} onSelectVoice={onSelectVoice} />

      <ControlButton label="Switch to text" onClick={onSwitchToText}>
        <Keyboard size={18} />
      </ControlButton>

      <ControlButton label="End call" onClick={onEndCall} variant="danger">
        <PhoneOff size={18} />
      </ControlButton>
    </div>
  );
}
