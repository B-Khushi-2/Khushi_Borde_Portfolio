import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";

export function FloatingButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      aria-label={isOpen ? "Close AI Chatbot" : "Talk to Khushi AI"}
      className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white shadow-[0_8px_32px_-4px_rgba(99,102,241,0.65)] ring-2 ring-indigo-400/50 backdrop-blur-xl cursor-pointer pointer-events-auto transition-all duration-300 hover:shadow-[0_12px_40px_-2px_rgba(99,102,241,0.85)] p-0.5"
    >
      {/* Outer ambient AI glow */}
      <span className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-50 blur-xl transition-opacity duration-300 group-hover:opacity-80 pointer-events-none" />

      {/* Pulsing AI aura rings when idle */}
      {!isOpen && (
        <>
          <motion.span
            className="absolute -inset-1.5 rounded-full border border-indigo-400/50 pointer-events-none"
            animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut" }}
          />
          <motion.span
            className="absolute -inset-3 rounded-full border border-purple-400/30 pointer-events-none"
            animate={{ scale: [1, 1.45], opacity: [0.4, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut", delay: 0.8 }}
          />
        </>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.span
            key="close"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.18 }}
            className="flex items-center justify-center pointer-events-none"
          >
            <X size={24} className="text-white drop-shadow" />
          </motion.span>
        ) : (
          <motion.div
            key="avatar-bot"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.18 }}
            className="relative flex items-center justify-center w-full h-full pointer-events-none overflow-visible"
          >
            {/* Kept original photo image */}
            <img
              src="/assets/images/avatar-poster.jpg"
              alt="Talk to Khushi AI"
              className="h-full w-full object-cover rounded-full pointer-events-none select-none ring-1 ring-white/20"
            />

            {/* AI Sparkles Badge on bottom-right corner */}
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg ring-2 ring-zinc-950">
              <Sparkles size={11} className="fill-white text-white animate-pulse" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

