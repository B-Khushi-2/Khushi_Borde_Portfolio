import { memo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw, User } from "lucide-react";
import type { ChatMessage } from "@/features/copilot/types";
import { cn } from "@/lib/utils";
import { TypingCursor } from "@/features/copilot/components/TypingCursor";
import { ThinkingIndicator } from "@/features/copilot/components/ThinkingIndicator";
import { Markdown } from "@/features/copilot/components/Markdown";
import { MessageActions } from "@/features/copilot/components/MessageActions";
import { StructuredEvaluationCard, parseStructuredEval } from "@/features/recruiter-mode";

interface MessageBubbleProps {
  message: ChatMessage;
  canRegenerate: boolean;
  onRegenerate: (assistantId: string) => void;
  onSendPrompt?: (text: string) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  canRegenerate,
  onRegenerate,
  onSendPrompt,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isComplete = message.status === "complete";
  const isError = message.status === "error";
  const handleRegenerate = () => onRegenerate(message.id);
  const evalData = !isUser ? (message.structuredEval || parseStructuredEval(message.content)) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group flex w-full flex-col gap-1.5 pb-2.5", isUser ? "items-end" : "items-start")}
    >
      <div className={cn("flex w-full items-start gap-3", isUser && "flex-row-reverse")}>
        {/* Avatar */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border select-none transition-all duration-300 group-hover:scale-105 overflow-hidden",
            isUser
              ? "bg-zinc-800/80 border-zinc-700/50 text-zinc-300 shadow-sm"
              : "border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)] bg-zinc-900"
          )}
        >
          {isUser ? (
            <User size={14} />
          ) : (
            <img
              src="/assets/images/avatar-poster.jpg"
              alt="Khushi AI"
              className="h-full w-full object-cover rounded-xl"
            />
          )}
        </div>

        {/* Bubble */}
        <div
          className={cn(
            "max-w-[82%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed shadow-md transition-colors duration-200",
            isUser
              ? "rounded-tr-sm bg-gradient-to-br from-indigo-600 to-violet-600 text-white border border-indigo-500/20 shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
              : isError
              ? "rounded-tl-sm bg-red-500/[0.03] text-zinc-200 border border-red-500/25"
              : "rounded-tl-sm bg-zinc-900/60 text-zinc-200 border border-zinc-800/80 hover:border-zinc-800 hover:bg-zinc-900/80 shadow-sm"
          )}
        >
          {message.status === "thinking" ? (
            <ThinkingIndicator activeAgents={message.activeAgents} executionPlan={message.executionPlan} />
          ) : isUser ? (
            <span className="whitespace-pre-wrap break-words">{message.content}</span>
          ) : isError ? (
            <div className="flex flex-col gap-3">
              {message.content && <Markdown content={message.content} />}
              <div className="flex items-start gap-1.5 text-red-400">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span className="text-[12.5px] leading-snug">
                  {message.error ?? "Something went wrong generating a reply."}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRegenerate}
                className="flex w-fit items-center gap-1.5 rounded-lg bg-red-500/15 border border-red-500/20 px-2.5 py-1 text-[11.5px] font-semibold text-red-400 outline-none transition-colors hover:bg-red-500/25 cursor-pointer active:scale-95"
              >
                <RotateCcw size={12} />
                Retry Question
              </button>
            </div>
          ) : evalData ? (
            <>
              {message.activeAgents && message.activeAgents.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2 select-none">
                  {message.activeAgents.map((agent) => (
                    <span
                      key={agent}
                      className="px-1.5 py-[1px] rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold tracking-wide text-indigo-400 uppercase"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              )}
              <StructuredEvaluationCard data={evalData} />
              {message.status === "streaming" && <TypingCursor />}
            </>
          ) : (
            <>
              {message.activeAgents && message.activeAgents.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2 select-none">
                  {message.activeAgents.map((agent) => (
                    <span
                      key={agent}
                      className="px-1.5 py-[1px] rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold tracking-wide text-indigo-400 uppercase"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              )}
              <Markdown content={message.content} />
              {message.status === "streaming" && <TypingCursor />}
            </>
          )}
        </div>
      </div>

      {isComplete && (
        <div className={cn("w-full pr-12 pl-12", isUser ? "text-right" : "text-left")}>
          <MessageActions
            content={message.content}
            align={isUser ? "end" : "start"}
            onRegenerate={!isUser && canRegenerate ? handleRegenerate : undefined}
          />
        </div>
      )}

      {isComplete && !isUser && message.followUps && message.followUps.length > 0 && onSendPrompt && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 pl-12 pr-12 justify-start select-none">
          {message.followUps.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSendPrompt(prompt)}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10.5px] font-medium text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 duration-150"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
});
