import { FileText } from "lucide-react";
import { Card } from "@/features/recruiter-mode/components/Card";
import type { ResumeSummaryData } from "@/features/recruiter-mode/types";

export function ResumeSummaryCard({
  resume,
  aiSummary,
}: {
  resume: ResumeSummaryData;
  aiSummary?: string;
}) {
  return (
    <Card title="Resume Summary" icon={<FileText size={15} className="text-[hsl(var(--accent))]" aria-hidden="true" />}>
      <p className="mb-3 font-medium text-[hsl(var(--foreground))]">
        {resume.name} — {resume.role}
      </p>
      <p className="mb-3">{aiSummary || resume.tagline}</p>

      {resume.education && (
        <p className="mb-3 text-xs text-[hsl(var(--muted-foreground))]">
          {resume.education.degree}
          {resume.education.school ? `, ${resume.education.school}` : ""}
          {resume.education.date ? ` (${resume.education.date})` : ""}
          {resume.education.detail ? ` · ${resume.education.detail}` : ""}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Projects" value={resume.projectCount} />
        <Stat label="Roles" value={resume.experienceCount} />
        <Stat label="Awards" value={resume.achievementCount} />
      </div>

      {resume.focusAreas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {resume.focusAreas.map((f) => (
            <span
              key={f}
              className="rounded-full bg-[hsl(var(--secondary))] px-2 py-0.5 text-[11px] text-[hsl(var(--secondary-foreground))]"
            >
              {f}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[hsl(var(--secondary))] py-2">
      <div className="text-lg font-semibold text-[hsl(var(--foreground))]">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{label}</div>
    </div>
  );
}
