import { Award, CheckCircle2 } from "lucide-react";
import { Card } from "@/features/recruiter-mode/components/Card";
import type { StructuredEvaluation } from "@/features/recruiter-mode/types";

function scoreColor(score: number): string {
  if (score >= 75) return "hsl(var(--accent))";
  if (score >= 50) return "hsl(var(--primary))";
  return "hsl(var(--destructive))";
}

/**
 * Utility helper to safely parse structured evaluation JSON.
 */
export function parseStructuredEval(content: string): StructuredEvaluation | null {
  if (!content || typeof content !== "string") return null;
  const clean = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!clean.startsWith("{") || !clean.endsWith("}")) return null;
  try {
    const obj = JSON.parse(clean);
    if (
      obj &&
      typeof obj.skill === "string" &&
      typeof obj.evidence === "string" &&
      typeof obj.confidenceScore === "number"
    ) {
      return {
        skill: obj.skill,
        evidence: obj.evidence,
        confidenceScore: obj.confidenceScore,
      };
    }
  } catch {}
  return null;
}

/**
 * StructuredEvaluationCard renders structured JSON candidate assessments:
 * { skill: string, evidence: string, confidenceScore: number }
 *
 * Reuses existing SuitabilityScoreCard circular gauge styling & EvidenceCard
 * badge and text layout.
 */
export function StructuredEvaluationCard({
  data,
}: {
  data: StructuredEvaluation;
}) {
  const normScore = data.confidenceScore <= 1 ? Math.round(data.confidenceScore * 100) : Math.round(data.confidenceScore);
  const clampedScore = Math.min(100, Math.max(0, normScore));
  const circumference = 2 * Math.PI * 34;
  const offset = circumference * (1 - clampedScore / 100);

  return (
    <Card
      title={`Skill & Fit Assessment: ${data.skill}`}
      icon={<Award size={16} className="text-[hsl(var(--accent))]" aria-hidden="true" />}
      badge={
        <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-400">
          Structured Evaluation
        </span>
      }
      className="my-2 border-indigo-500/20 bg-zinc-900/90 shadow-md"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* SVG Circular Progress Gauge reusing SuitabilityScoreCard styling */}
        <div className="flex items-center gap-3 shrink-0">
          <svg width="76" height="76" viewBox="0 0 84 84" className="shrink-0" aria-hidden="true">
            <circle cx="42" cy="42" r="34" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
            <circle
              cx="42"
              cy="42"
              r="34"
              fill="none"
              stroke={scoreColor(clampedScore)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 42 42)"
            />
            <text x="42" y="47" textAnchor="middle" fontSize="20" fontWeight="600" fill="hsl(var(--foreground))">
              {clampedScore}%
            </text>
          </svg>
        </div>

        {/* Evidence text reusing EvidenceCard typography and pill styling */}
        <div className="flex-1 min-w-0">
          <div className="mb-1.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--secondary))] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--secondary-foreground))]">
              <CheckCircle2 size={11} className="text-[hsl(var(--accent))]" />
              {data.skill}
            </span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium">
              Confidence Score: <strong className="text-[hsl(var(--foreground))]">{clampedScore}/100</strong>
            </span>
          </div>
          <div className="rounded-lg bg-zinc-950/70 p-3 border border-zinc-800/80">
            <p className="text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap">
              {data.evidence}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
