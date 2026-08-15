import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  title,
  icon,
  badge,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm",
        className
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-[hsl(var(--foreground))]">
          {icon}
          {title}
        </h3>
        {badge}
      </header>
      <div className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{children}</div>
    </section>
  );
}
