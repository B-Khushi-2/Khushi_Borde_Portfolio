import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";

interface HeaderIconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
}

/** Small icon-only button used in the copilot chat header (clear, minimize,
 * fullscreen, close) — factored out since all four shared identical markup
 * and styling, differing only in icon/label/handler. */
export function HeaderIconButton({ label, onClick, children }: HeaderIconButtonProps) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        className="flex h-7 w-7 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] outline-none transition-all duration-150 hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] active:scale-90"
      >
        {children}
      </button>
    </Tooltip>
  );
}
