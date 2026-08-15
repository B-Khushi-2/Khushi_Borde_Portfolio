import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Wand2 } from "lucide-react";
import { TOOL_ACTIONS, type ToolAction } from "@/features/copilot/data/tool-actions";
import { HeaderIconButton } from "@/features/copilot/components/HeaderIconButton";

interface ToolsMenuProps {
  onSend: (text: string) => void;
  onPrefill: (text: string) => void;
}

/** Groups TOOL_ACTIONS by category, preserving first-seen order. */
function groupByCategory(actions: ToolAction[]): [string, ToolAction[]][] {
  const groups = new Map<string, ToolAction[]>();
  for (const action of actions) {
    const list = groups.get(action.category) ?? [];
    list.push(action);
    groups.set(action.category, list);
  }
  return Array.from(groups.entries());
}

const GROUPS = groupByCategory(TOOL_ACTIONS);

/** Header "Tools" button — a persistent entry point (unlike the
 * first-message-only SuggestedPrompts) for the advanced AI utilities:
 * interview mode, project comparison, architecture/roadmap breakdowns,
 * skill/resume search, and code/project explainers. Every action is just
 * a crafted prompt sent through the same RAG-grounded chat endpoint. */
export function ToolsMenu({ onSend, onPrefill }: ToolsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function handlePick(action: ToolAction) {
    setOpen(false);
    if (action.prefillOnly) {
      onPrefill(action.prompt);
    } else {
      onSend(action.prompt);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <HeaderIconButton label="Tools" onClick={() => setOpen((o) => !o)}>
        <Wand2 size={14} />
      </HeaderIconButton>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-9 z-50 w-72 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl"
          >
            <div className="max-h-[360px] overflow-y-auto p-1.5">
              {GROUPS.map(([category, actions]) => (
                <div key={category} className="mb-1 last:mb-0">
                  <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                    {category}
                  </p>
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => handlePick(action)}
                      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-[hsl(var(--secondary))]"
                    >
                      <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                        {action.label}
                      </span>
                      <span className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
                        {action.description}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
