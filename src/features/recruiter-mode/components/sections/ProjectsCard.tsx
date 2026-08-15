import { FolderGit2 } from "lucide-react";
import { Card } from "@/features/recruiter-mode/components/Card";
import type { ProjectSummary } from "@/features/recruiter-mode/types";

export function ProjectsCard({ projects, aiAssessment }: { projects: ProjectSummary[]; aiAssessment?: string }) {
  return (
    <Card
      title="Projects"
      icon={<FolderGit2 size={15} className="text-[hsl(var(--accent))]" aria-hidden="true" />}
      className="md:col-span-2"
    >
      {aiAssessment && <p className="mb-3 italic text-[hsl(var(--foreground))]">{aiAssessment}</p>}
      <ul className="space-y-3">
        {projects.map((p) => (
          <li key={p.id} className="rounded-lg border border-[hsl(var(--border))] p-3">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-medium text-[hsl(var(--foreground))]">{p.label}</span>
              {p.date && <span className="text-xs text-[hsl(var(--muted-foreground))]">{p.date}</span>}
            </div>
            <p className="mb-2">{p.summary}</p>
            {p.impact[0] && <p className="mb-2 text-xs text-[hsl(var(--accent))]">↳ {p.impact[0]}</p>}
            {p.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-[hsl(var(--secondary))] px-2 py-0.5 text-[10px] text-[hsl(var(--secondary-foreground))]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
