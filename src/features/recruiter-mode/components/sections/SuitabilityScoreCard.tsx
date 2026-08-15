import { Gauge } from "lucide-react";
import { Card } from "@/features/recruiter-mode/components/Card";

function scoreColor(score: number): string {
  if (score >= 75) return "hsl(var(--accent))";
  if (score >= 50) return "hsl(var(--primary))";
  return "hsl(var(--destructive))";
}

export function SuitabilityScoreCard({
  score,
  rationale,
  source,
}: {
  score: number;
  rationale: string;
  source: "heuristic" | "jd-heuristic" | "ai";
}) {
  const circumference = 2 * Math.PI * 34;
  const offset = circumference * (1 - score / 100);
  const sourceLabel =
    source === "ai" ? "AI-generated, role-specific" : source === "jd-heuristic" ? "Keyword match vs. pasted JD" : "Baseline heuristic";

  return (
    <Card title="Suitability Score" icon={<Gauge size={15} className="text-[hsl(var(--accent))]" aria-hidden="true" />}>
      <div className="flex items-center gap-4">
        <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0" aria-hidden="true">
          <circle cx="42" cy="42" r="34" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
          <circle
            cx="42"
            cy="42"
            r="34"
            fill="none"
            stroke={scoreColor(score)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 42 42)"
          />
          <text x="42" y="47" textAnchor="middle" fontSize="20" fontWeight="600" fill="hsl(var(--foreground))">
            {score}
          </text>
        </svg>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{sourceLabel}</p>
          <p>{rationale}</p>
        </div>
      </div>
    </Card>
  );
}
