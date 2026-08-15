import { motion } from "framer-motion";

export function TypingCursor() {
  return (
    <motion.span
      className="inline-block h-3.5 w-1.5 ml-1 rounded-sm bg-indigo-400 align-middle shadow-[0_0_6px_rgba(99,102,241,0.8)]"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    />
  );
}
