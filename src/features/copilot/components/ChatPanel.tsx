import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessage, PanelMode } from "@/features/copilot/types";
import { ChatHeader } from "@/features/copilot/components/ChatHeader";
import { MessageList } from "@/features/copilot/components/MessageList";
import { SuggestedPrompts } from "@/features/copilot/components/SuggestedPrompts";
import { ChatInput } from "@/features/copilot/components/ChatInput";
import { PanelLoadingSkeleton } from "@/features/copilot/components/LoadingSkeleton";
import { PANEL_BOOT_DELAY_MS } from "@/features/copilot/constants";
import { ChatSidebar } from "@/features/copilot/components/ChatSidebar";

interface ChatPanelProps {
  mode: PanelMode;
  messages: ChatMessage[];
  isBusy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
  onRegenerate: (assistantId: string) => void;
  onMinimize: () => void;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

export function ChatPanel({
  mode,
  messages,
  isBusy,
  onSend,
  onStop,
  onClear,
  onRegenerate,
  onMinimize,
  onToggleFullscreen,
  onClose,
}: ChatPanelProps) {
  const [isBooting, setIsBooting] = useState(true);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setIsBooting(false), PANEL_BOOT_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const showSuggestions = messages.length <= 1 && !isBusy;

  return (
    <div className="flex h-full w-full flex-row overflow-hidden rounded-[inherit] bg-zinc-950/95 font-sans">
      {/* Left Sidebar inside Chatbot Window */}
      <div className="hidden md:block flex-shrink-0">
        <ChatSidebar
          onSend={onSend}
          onPrefill={setDraft}
          onClear={onClear}
        />
      </div>

      {/* Main Single Chatbot Window */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 min-h-0">
        <ChatHeader
          mode={mode}
          messages={messages}
          onMinimize={onMinimize}
          onToggleFullscreen={onToggleFullscreen}
          onClear={onClear}
          onClose={onClose}
          onRegenerate={onRegenerate}
        />

        <AnimatePresence mode="wait" initial={false}>
          {isBooting ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-hidden px-4 py-4 min-h-0"
            >
              <PanelLoadingSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col overflow-hidden min-h-0"
            >
              <MessageList messages={messages} isBusy={isBusy} onRegenerate={onRegenerate} onSendPrompt={onSend} />
            </motion.div>
          )}
        </AnimatePresence>

        {showSuggestions && !isBooting && <SuggestedPrompts onSelect={onSend} />}

        <ChatInput
          onSend={onSend}
          isBusy={isBusy}
          onStop={onStop}
          draft={draft}
          onDraftConsumed={() => setDraft("")}
        />
      </div>
    </div>
  );
}
