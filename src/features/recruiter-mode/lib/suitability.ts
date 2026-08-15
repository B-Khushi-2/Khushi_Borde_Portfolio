import type { SkillGroup } from "@/features/recruiter-mode/types";

/** Cheap, transparent keyword-overlap score between a pasted job
 * description and the portfolio's skill set — a fallback for when the AI
 * backend isn't reachable, and a sanity baseline when it is. */
export function scoreAgainstJobDescription(jobDescription: string, skillGroups: SkillGroup[]) {
  const allSkills = skillGroups.flatMap((g) => g.skills);
  const jd = jobDescription.toLowerCase();

  const matched = allSkills.filter((s) => jd.includes(s.label.toLowerCase()));
  const matchRatio = allSkills.length > 0 ? matched.length / allSkills.length : 0;

  // Reward matching skills that also have real usage evidence.
  const evidencedMatches = matched.filter((s) => s.usageCount > 0).length;

  let score = 45 + Math.round(matchRatio * 100 * 0.5) + evidencedMatches * 2;
  score = Math.max(5, Math.min(97, score));

  const matchedLabels = matched.map((s) => s.label);
  const rationale = matchedLabels.length
    ? `Matches ${matchedLabels.length} skill${matchedLabels.length === 1 ? "" : "s"} from the job description: ${matchedLabels
        .slice(0, 8)
        .join(", ")}${matchedLabels.length > 8 ? "…" : ""}.`
    : "No direct skill-keyword overlap found with the pasted job description — doesn't mean no fit, just nothing to match on literally.";

  return { score, rationale, matchedLabels };
}
