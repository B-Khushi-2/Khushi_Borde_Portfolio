import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight tooltip (no Radix dependency needed for a single-purpose
 * widget). Shows a small label above the trigger on hover/focus.
 */
export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: {
  label: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex group/tooltip", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-[hsl(var(--popover))] px-2 py-1 text-[11px] font-medium text-[hsl(var(--popover-foreground))] opacity-0 shadow-md ring-1 ring-[hsl(var(--border))] transition-all duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          side === "top"
            ? "bottom-full mb-2 translate-y-1 group-hover/tooltip:translate-y-0"
            : "top-full mt-2 -translate-y-1 group-hover/tooltip:translate-y-0"
        )}
      >
        {label}
      </span>
    </span>
  );
}
