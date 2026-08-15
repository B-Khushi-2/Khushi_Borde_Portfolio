import { useState } from "react";
import {
  Maximize2,
  Minimize2,
  Minus,
  Trash2,
  X,
  Volume2,
  VolumeX,
  RotateCw,
} from "lucide-react";
import type { PanelMode, ChatMessage } from "@/features/copilot/types";
import { HeaderIconButton } from "@/features/copilot/components/HeaderIconButton";

interface ChatHeaderProps {
  mode: PanelMode;
  messages: ChatMessage[];
  onMinimize: () => void;
  onToggleFullscreen: () => void;
  onClear: () => void;
  onClose: () => void;
  onRegenerate: (assistantId: string) => void;
}

export function ChatHeader({
  mode,
  messages,
  onMinimize,
  onToggleFullscreen,
  onClear,
  onClose,
  onRegenerate,
}: ChatHeaderProps) {
  const isFullscreen = mode === "fullscreen";

  // Mute Audio State
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("copilot-muted") === "true";
    }
    return false;
  });

  const toggleMute = () => {
    const nextMuted = !isMuted;
    localStorage.setItem("copilot-muted", String(nextMuted));
    setIsMuted(nextMuted);
    if (nextMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Regenerate/Refresh last reply
  const handleRefresh = () => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.id && m.status !== "thinking");
    if (lastAssistantMessage) {
      onRegenerate(lastAssistantMessage.id);
    } else {
      onClear();
    }
  };

  return (
    <div className="shrink-0 flex flex-col border-b border-white/10 select-none bg-zinc-950/90 backdrop-blur-md z-10">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        {/* Clean Avatar & Identity Header */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-indigo-500/40 overflow-hidden shadow-md">
            <img
              src="/assets/images/avatar-poster.jpg"
              alt="Khushi Avatar"
              className="h-full w-full object-cover"
            />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white tracking-tight">Talk to Khushi</p>
            <p className="text-[11px] font-medium text-emerald-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AI Assistant · Online
            </p>
          </div>
        </div>

        {/* Quick Mode & Tool Controls */}
        <div className="flex items-center gap-1.5">

          <HeaderIconButton label={isMuted ? "Unmute audio" : "Mute audio"} onClick={toggleMute}>
            {isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} />}
          </HeaderIconButton>

          <HeaderIconButton label="Regenerate last response" onClick={handleRefresh}>
            <RotateCw size={14} />
          </HeaderIconButton>

          <HeaderIconButton label="Clear chat" onClick={onClear}>
            <Trash2 size={14} />
          </HeaderIconButton>

          <HeaderIconButton label="Minimize" onClick={onMinimize}>
            <Minus size={14} />
          </HeaderIconButton>

          <HeaderIconButton
            label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </HeaderIconButton>

          <HeaderIconButton label="Close" onClick={onClose}>
            <X size={14} />
          </HeaderIconButton>
        </div>
      </div>
    </div>
  );
}
