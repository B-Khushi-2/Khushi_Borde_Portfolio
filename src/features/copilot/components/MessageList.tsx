import { AnimatePresence } from "framer-motion";
import { memo } from "react";
import type { ChatMessage } from "@/features/copilot/types";
import { MessageBubble } from "@/features/copilot/components/MessageBubble";
import { useStickyScroll } from "@/features/copilot/hooks/useStickyScroll";

interface MessageListProps {
  messages: ChatMessage[];
  isBusy: boolean;
  onRegenerate: (assistantId: string) => void;
  onSendPrompt?: (text: string) => void;
}

export const MessageList = memo(function MessageList({
  messages,
  isBusy,
  onRegenerate,
  onSendPrompt,
}: MessageListProps) {
  const { scrollRef, bottomRef, handleScroll } = useStickyScroll(messages);

  // Only the most recent assistant reply can be regenerated — older turns
  // stay put so the rest of the thread doesn't drift out of sync.
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="copilot-scroll flex-1 overflow-y-auto px-4 py-4"
    >
      <div className="flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              canRegenerate={!isBusy && message.id === lastAssistantId}
              onRegenerate={onRegenerate}
              onSendPrompt={onSendPrompt}
            />
          ))}
        </AnimatePresence>
      </div>
      <div ref={bottomRef} />
    </div>
  );
});
