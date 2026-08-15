import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { ArrowUp, Square } from "lucide-react";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAutosizeTextarea } from "@/features/copilot/hooks/useAutosizeTextarea";

const MAX_TEXTAREA_HEIGHT_PX = 140;

interface ChatInputProps {
  onSend: (text: string) => void;
  isBusy: boolean;
  onStop: () => void;
  draft?: string;
  onDraftConsumed?: () => void;
}

export function ChatInput({
  onSend,
  isBusy,
  onStop,
  draft,
  onDraftConsumed,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const { textareaRef, resize } = useAutosizeTextarea({ maxHeightPx: MAX_TEXTAREA_HEIGHT_PX });

  useEffect(() => {
    if (!draft) return;
    setValue(draft);
    requestAnimationFrame(() => {
      resize();
      textareaRef.current?.focus();
      const len = draft.length;
      textareaRef.current?.setSelectionRange(len, len);
    });
    onDraftConsumed?.();
  }, [draft]);

  function handleSubmit() {
    if (!value.trim() || isBusy) return;
    onSend(value);
    setValue("");
    requestAnimationFrame(resize);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="shrink-0 border-t border-white/5 bg-black/[0.15] backdrop-blur-md p-3 select-none">
      <div className="flex items-end gap-2 rounded-2xl border border-white/5 bg-zinc-900/60 px-3.5 py-2.5 focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.06)] transition-all duration-200">
        <Textarea
          id="chat-message-input"
          name="chatMessage"
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            resize();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask about experience, skills, projects…"
          rows={1}
          className="max-h-[140px] min-h-[24px] bg-transparent border-none focus-visible:ring-0 text-zinc-100 text-[13.5px] leading-relaxed placeholder:text-zinc-500 resize-none flex-1 pb-0.5 outline-none"
        />

        {/* Character Counter */}
        {value.length > 50 && (
          <span className="text-[9.5px] text-zinc-500 pr-1 select-none font-semibold mb-2">
            {value.length} / 4000
          </span>
        )}



        {/* Send / Stop Button */}
        <Tooltip label={isBusy ? "Stop responding" : "Send query"}>
          <motion.button
            whileHover={(!isBusy && !value.trim()) ? {} : { scale: 1.06 }}
            whileTap={(!isBusy && !value.trim()) ? {} : { scale: 0.95 }}
            type="button"
            onClick={isBusy ? onStop : handleSubmit}
            disabled={!isBusy && !value.trim()}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl outline-none transition-all cursor-pointer mb-0.5",
              isBusy
                ? "bg-red-500/15 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                : "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white hover:from-indigo-400 hover:to-indigo-500 hover:shadow-[0_0_12px_rgba(99,102,241,0.25)] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:opacity-100 disabled:pointer-events-none"
            )}
          >
            {isBusy ? <Square size={10} fill="currentColor" /> : <ArrowUp size={15} />}
          </motion.button>
        </Tooltip>
      </div>
      <p className="mt-1.5 px-1 text-[9.5px] font-medium tracking-wide text-zinc-500/80">
        Enter to send &middot; Shift+Enter for newline &middot; Esc to close
      </p>
    </div>
  );
}
