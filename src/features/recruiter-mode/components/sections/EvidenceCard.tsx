import type { ReactNode } from "react";
import { Card } from "@/features/recruiter-mode/components/Card";
import type { EvidenceItem } from "@/features/recruiter-mode/types";

export function EvidenceCard({
  title,
  icon,
  items,
  aiAssessment,
  emptyText,
}: {
  title: string;
  icon: ReactNode;
  items: EvidenceItem[];
  aiAssessment?: string;
  emptyText: string;
}) {
  return (
    <Card title={title} icon={icon}>
      {aiAssessment && <p className="mb-3">{aiAssessment}</p>}
      {items.length === 0 ? (
        <p className="text-xs italic">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((item, i) => (
            <li key={`${item.source}-${item.label}-${i}`} className="text-xs">
              <span className="mr-1.5 rounded-full bg-[hsl(var(--secondary))] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[hsl(var(--secondary-foreground))]">
                {item.source}
              </span>
              <span className="font-medium text-[hsl(var(--foreground))]">{item.label}</span>
              {item.detail && <span> — {item.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
