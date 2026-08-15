import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PanelMode } from "@/features/copilot/types";
import { FloatingButton } from "@/features/copilot/components/FloatingButton";
import { ChatPanel } from "@/features/copilot/components/ChatPanel";
import { useCopilotChat } from "@/features/copilot/hooks/useCopilotChat";
import { useCopilotKeyboardShortcuts } from "@/features/copilot/hooks/useCopilotKeyboardShortcuts";
import { IntelligenceProvider } from "@/features/copilot/context/IntelligenceContext";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function RecruiterCopilot() {
  const [mode, setMode] = useState<PanelMode>("closed");
  const { messages, isBusy, sendMessage, clearChat, stopGenerating, regenerateMessage } = useCopilotChat();

  const open = useCallback(() => setMode("open"), []);
  const close = useCallback(() => setMode("closed"), []);
  const toggle = useCallback(() => setMode((m) => (m === "closed" ? "open" : "closed")), []);
  const minimize = useCallback(
    () => setMode((m) => (m === "minimized" ? "open" : "minimized")),
    []
  );
  const toggleFullscreen = useCallback(
    () => setMode((m) => (m === "fullscreen" ? "open" : "fullscreen")),
    []
  );

  useEffect(() => {
    const handleOpen = () => setMode("open");
    window.addEventListener("open-copilot", handleOpen);
    return () => window.removeEventListener("open-copilot", handleOpen);
  }, []);

  useCopilotKeyboardShortcuts({
    mode,
    onOpen: open,
    onClose: close,
    onToggleFullscreen: toggleFullscreen,
    onMinimize: minimize,
    suspended: false,
  });

  const isPanelVisible = mode === "open" || mode === "fullscreen" || mode === "minimized";
  const isFullscreen = mode === "fullscreen";
  const isMinimized = mode === "minimized";

  return (
    <IntelligenceProvider>
      <div data-copilot-root className="font-sans">
        {/* Backdrop — fullscreen only, click to exit */}
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMode("open")}
              className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isPanelVisible && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={
                isFullscreen
                  ? { opacity: 1, y: 0, scale: 1 }
                  : isMinimized
                  ? { opacity: 1, y: 0, scale: 1, height: 60 }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              exit={{ opacity: 0, y: 24, scale: 0.94 }}
              transition={{ duration: 0.28, ease: EASE }}
              className={cn(
                "fixed z-[99999] flex flex-col overflow-hidden shadow-[0_30px_90px_-15px_rgba(0,0,0,0.6)] backdrop-blur-3xl transition-shadow duration-300",
                "bg-zinc-950/95 border border-white/10",
                isFullscreen
                  ? "top-4 bottom-4 left-3 right-3 sm:top-6 sm:bottom-6 sm:left-6 sm:right-6 rounded-[24px]"
                  : isMinimized
                  ? "bottom-20 right-4 h-[60px] w-[calc(100vw-2rem)] rounded-[20px] sm:right-6 sm:w-[380px] hover:border-indigo-500/30"
                  : "bottom-20 right-4 h-[min(760px,calc(100vh-7rem))] w-[calc(100vw-2rem)] rounded-[24px] sm:right-6 sm:w-[420px] md:w-[880px]"
              )}
              style={{
                boxShadow:
                  "0 32px 80px -20px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.05) inset",
              }}
            >
              {isMinimized ? (
                <button
                  type="button"
                  onClick={() => setMode("open")}
                  className="flex h-full w-full items-center justify-between px-4 text-left outline-none transition-colors duration-150 hover:bg-white/[0.04] focus-visible:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/assets/images/avatar-poster.jpg"
                      alt="Khushi Avatar"
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-indigo-400"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Talk to Khushi
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {isBusy ? "Typing…" : "Minimized — click to expand"}
                      </p>
                    </div>
                  </div>
                </button>
              ) : (
                <ChatPanel
                  mode={mode}
                  messages={messages}
                  isBusy={isBusy}
                  onSend={sendMessage}
                  onStop={stopGenerating}
                  onClear={clearChat}
                  onRegenerate={regenerateMessage}
                  onMinimize={minimize}
                  onToggleFullscreen={toggleFullscreen}
                  onClose={close}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="fixed bottom-6 right-4 z-[9999] sm:right-6">
          <FloatingButton isOpen={isPanelVisible} onClick={toggle} />
        </div>
      </div>
    </IntelligenceProvider>
  );
}
