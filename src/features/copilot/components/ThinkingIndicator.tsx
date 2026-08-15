import { motion } from "framer-motion";

interface ThinkingIndicatorProps {
  activeAgents?: string[];
  executionPlan?: string[];
}

export function ThinkingIndicator({ activeAgents, executionPlan }: ThinkingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-2.5 px-1 py-1.5 select-none"
      aria-label="Assistant is thinking"
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
              animate={{
                y: [0, -3, 0],
                opacity: [0.4, 1, 0.4],
                scale: [0.95, 1.15, 0.95]
              }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.16,
              }}
            />
          ))}
        </div>
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
          {executionPlan && executionPlan.length > 0 ? "Planning & Executing..." : "Analyzing..."}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-0.5">
        {activeAgents && activeAgents.length > 0 ? (
          activeAgents.map((agent) => (
            <span
              key={agent}
              className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-[9.5px] font-semibold text-indigo-400"
            >
              {agent}
            </span>
          ))
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-[9.5px] font-semibold text-indigo-400">
            Recruiter Agent
          </span>
        )}
        <span className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5 text-[9.5px] font-semibold text-zinc-400">
          Memory
        </span>
        <span className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5 text-[9.5px] font-semibold text-zinc-400">
          Knowledge Base
        </span>
      </div>

      {executionPlan && executionPlan.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-white/5 pt-2.5 mt-1">
          <span className="text-[9px] font-bold tracking-widest text-indigo-400 uppercase">
            Execution Plan:
          </span>
          <div className="flex flex-col gap-1">
            {executionPlan.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[10.5px] text-zinc-400">
                <span className="h-1 w-1 rounded-full bg-indigo-400" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
