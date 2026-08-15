import { Cpu } from "lucide-react";
import { Card } from "@/features/recruiter-mode/components/Card";
import type { SkillGroup } from "@/features/recruiter-mode/types";

export function TechnicalSkillsCard({
  skillGroups,
  aiAssessment,
}: {
  skillGroups: SkillGroup[];
  aiAssessment?: string;
}) {
  const maxUsage = Math.max(1, ...skillGroups.flatMap((g) => g.skills.map((s) => s.usageCount)));

  return (
    <Card title="Technical Skills" icon={<Cpu size={15} className="text-[hsl(var(--accent))]" aria-hidden="true" />}>
      {aiAssessment && <p className="mb-3">{aiAssessment}</p>}
      <div className="space-y-4">
        {skillGroups.map((group) => (
          <div key={group.group}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--foreground))]">
              {group.group}
            </p>
            <ul className="space-y-1">
              {group.skills.map((skill) => (
                <li key={skill.id} className="flex items-center gap-2 text-xs">
                  <span className="w-28 shrink-0 truncate text-[hsl(var(--muted-foreground))]">{skill.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--secondary))]">
                    <span
                      className="block h-full rounded-full bg-[hsl(var(--accent))]"
                      style={{ width: `${Math.max(6, (skill.usageCount / maxUsage) * 100)}%` }}
                    />
                  </span>
                  <span className="w-16 shrink-0 text-right text-[10px] text-[hsl(var(--muted-foreground))]">
                    {skill.usageCount > 0 ? `${skill.usageCount} used` : "listed"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
