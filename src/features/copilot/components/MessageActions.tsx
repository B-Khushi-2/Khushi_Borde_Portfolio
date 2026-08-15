import { useState, useEffect } from "react";
import { Check, Copy, RotateCcw, ThumbsUp, ThumbsDown, Volume2, VolumeX, Bookmark } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MessageActionsProps {
  content: string;
  align: "start" | "end";
  onRegenerate?: () => void;
}

const ICON_BUTTON_CLASSES =
  "flex h-6 w-6 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] outline-none transition-all duration-150 hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-90 cursor-pointer";

export function MessageActions({ content, align, onRegenerate }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (isSpeaking && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fail silently
    }
  }

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    // Check if audio is muted in header
    if (localStorage.getItem("copilot-muted") === "true") {
      localStorage.setItem("copilot-muted", "false");
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      
      const cleanText = content
        .replace(/[*#`_\-]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(
          (v) =>
            v.name.includes("Google US English") ||
            v.name.includes("Samantha") ||
            v.name.includes("Natural") ||
            v.lang.startsWith("en")
        );
        if (preferred) utterance.voice = preferred;
        utterance.rate = 1.02;

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      };

      // Slight delay after cancel() required by Chrome/Edge Web Speech engine
      setTimeout(setVoiceAndSpeak, 50);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 py-1",
        align === "end" ? "justify-end" : "justify-start"
      )}
    >
      <Tooltip label={copied ? "Copied!" : "Copy response"}>
        <button type="button" onClick={handleCopy} className={ICON_BUTTON_CLASSES} aria-label="Copy message">
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
      </Tooltip>

      <Tooltip label={isSpeaking ? "Stop reading" : "Read aloud"}>
        <button type="button" onClick={handleSpeak} className={ICON_BUTTON_CLASSES} aria-label="Speak message">
          {isSpeaking ? <VolumeX size={13} className="text-red-400 animate-pulse" /> : <Volume2 size={13} />}
        </button>
      </Tooltip>

      <Tooltip label={liked ? "Liked" : "Like response"}>
        <button
          type="button"
          onClick={() => {
            setLiked(!liked);
            if (disliked) setDisliked(false);
          }}
          className={cn(ICON_BUTTON_CLASSES, liked && "text-emerald-400 hover:text-emerald-300")}
          aria-label="Like response"
        >
          <ThumbsUp size={13} fill={liked ? "currentColor" : "none"} />
        </button>
      </Tooltip>

      <Tooltip label={disliked ? "Disliked" : "Dislike response"}>
        <button
          type="button"
          onClick={() => {
            setDisliked(!disliked);
            if (liked) setLiked(false);
          }}
          className={cn(ICON_BUTTON_CLASSES, disliked && "text-red-400 hover:text-red-300")}
          aria-label="Dislike response"
        >
          <ThumbsDown size={13} fill={disliked ? "currentColor" : "none"} />
        </button>
      </Tooltip>

      <Tooltip label={bookmarked ? "Bookmarked" : "Bookmark response"}>
        <button
          type="button"
          onClick={() => setBookmarked(!bookmarked)}
          className={cn(ICON_BUTTON_CLASSES, bookmarked && "text-amber-400 hover:text-amber-300")}
          aria-label="Bookmark response"
        >
          <Bookmark size={13} fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </Tooltip>

      {onRegenerate && (
        <Tooltip label="Regenerate response">
          <button
            type="button"
            onClick={onRegenerate}
            className={ICON_BUTTON_CLASSES}
            aria-label="Regenerate response"
          >
            <RotateCcw size={13} />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
