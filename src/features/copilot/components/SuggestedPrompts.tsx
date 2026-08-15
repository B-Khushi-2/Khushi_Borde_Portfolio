import { motion } from "framer-motion";
import { Sparkles, FileText, Code, CheckCircle, HelpCircle } from "lucide-react";
import { SUGGESTED_PROMPTS } from "@/features/copilot/data/suggested-prompts";

function getPromptIcon(id: string) {
  switch (id) {
    case "p1": return <FileText size={13} className="text-indigo-400" />;
    case "p2": return <Code size={13} className="text-emerald-400" />;
    case "p3": return <Sparkles size={13} className="text-violet-400" />;
    case "p4": return <CheckCircle size={13} className="text-amber-400" />;
    default: return <HelpCircle size={13} className="text-zinc-400" />;
  }
}

export function SuggestedPrompts({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="px-4 pb-3">
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {SUGGESTED_PROMPTS.map((p, i) => (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: i * 0.04
            }}
            onClick={() => onSelect(p.prompt)}
            className="flex items-center gap-2 rounded-full border border-white/5 bg-zinc-900/60 px-4 py-2 text-xs font-medium text-zinc-300 transition-all duration-300 hover:border-indigo-500/40 hover:bg-indigo-500/[0.06] hover:text-white hover:shadow-[0_4px_16px_rgba(99,102,241,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 cursor-pointer active:scale-[0.97]"
          >
            {getPromptIcon(p.id)}
            <span>{p.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
