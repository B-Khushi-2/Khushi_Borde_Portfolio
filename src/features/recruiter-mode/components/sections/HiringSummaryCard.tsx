import { Sparkles } from "lucide-react";
import { Card } from "@/features/recruiter-mode/components/Card";

export function HiringSummaryCard({
  summary,
  isAiGenerated,
}: {
  summary: string;
  isAiGenerated: boolean;
}) {
  return (
    <Card
      title="Hiring Summary"
      icon={<Sparkles size={15} className="text-[hsl(var(--accent))]" aria-hidden="true" />}
      badge={
        <span className="rounded-full border border-[hsl(var(--border))] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          {isAiGenerated ? "AI-generated" : "Auto-generated"}
        </span>
      }
      className="md:col-span-2"
    >
      <p>{summary}</p>
    </Card>
  );
}
