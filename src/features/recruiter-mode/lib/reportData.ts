import type { PortfolioData } from "@/lib/portfolioBridge";
import type {
  DeterministicReport,
  EvidenceItem,
  ProjectSummary,
  ResumeSummaryData,
  SkillGroup,
} from "@/features/recruiter-mode/types";

const LEADERSHIP_KEYWORDS = [
  "team lead",
  "led ",
  "leading",
  "coordinat",
  "mentor",
  "organiz",
  "spearhead",
  "owned",
  "drove",
];

const COMMUNICATION_KEYWORDS = [
  "facilitat",
  "workshop",
  "presented",
  "participants",
  "study jam",
  "collaborat",
  "documentation",
  "communicat",
  "patient-facing",
  "case-study",
];

function byId<T extends { id: string }>(list: T[] = []): Record<string, T> {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

function containsAny(haystack: string | undefined | null, needles: string[]): string | null {
  if (!haystack) return null;
  const lower = haystack.toLowerCase();
  const hit = needles.find((n) => lower.includes(n));
  return hit ?? null;
}

/** Builds the "Technical Skills" section, grouped by hub cluster and
 * ranked within each group by how many projects/experience entries the
 * skill is actually wired to in PORTFOLIO.edges — a proxy for depth
 * that's derived from real usage rather than a self-rated number. */
function buildSkillGroups(portfolio: PortfolioData, edges: [string, string][]): SkillGroup[] {
  const hubs = byId(portfolio.nodes.hubs);
  const usageCount = new Map<string, number>();
  for (const [, to] of edges) {
    usageCount.set(to, (usageCount.get(to) ?? 0) + 1);
  }

  const groups = new Map<string, SkillGroup>();
  for (const skill of portfolio.nodes.skills) {
    const groupLabel = (skill.cluster && hubs[skill.cluster]?.label) || "Other";
    if (!groups.has(groupLabel)) groups.set(groupLabel, { group: groupLabel, skills: [] });
    // usageCount counts every inbound edge including hub->skill; subtract 1
    // for that always-present membership edge so the number reflects real
    // cross-links (project/experience/achievement usage) only.
    const raw = (usageCount.get(skill.id) ?? 0) - 1;
    groups.get(groupLabel)!.skills.push({
      id: skill.id,
      label: skill.label,
      group: groupLabel,
      usageCount: Math.max(raw, 0),
    });
  }

  for (const g of groups.values()) {
    g.skills.sort((a, b) => b.usageCount - a.usageCount || a.label.localeCompare(b.label));
  }
  return Array.from(groups.values());
}

function buildResumeSummary(
  portfolio: PortfolioData & { profile?: Record<string, unknown> },
  topSkills: string[]
): ResumeSummaryData {
  const p = portfolio.profile as unknown as {
    name: string;
    role: string;
    tagline: string;
    location?: string;
    education?: { school?: string; degree?: string; date?: string; detail?: string };
    contact?: { focus?: string[] };
  };

  return {
    name: p.name,
    role: p.role,
    tagline: p.tagline,
    location: p.location,
    education: p.education,
    focusAreas: p.contact?.focus ?? [],
    projectCount: portfolio.nodes.projects.length,
    experienceCount: portfolio.nodes.experience.length,
    achievementCount: portfolio.nodes.achievements.length,
    topSkills,
  };
}

function buildProjects(portfolio: PortfolioData): ProjectSummary[] {
  return (portfolio.nodes.projects as unknown as Array<{
    id: string;
    label: string;
    date?: string;
    summary: string;
    tags?: string[];
    impact?: string[];
  }>).map((proj) => ({
    id: proj.id,
    label: proj.label,
    date: proj.date,
    summary: proj.summary,
    tags: proj.tags ?? [],
    impact: proj.impact ?? [],
  }));
}

function buildLeadershipEvidence(portfolio: PortfolioData): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  for (const exp of portfolio.nodes.experience as unknown as Array<{
    label: string;
    org?: string;
    description?: string;
    mission?: string;
    outcome?: string;
  }>) {
    const hay = [exp.label, exp.mission, exp.outcome, exp.description].join(" ");
    if (containsAny(hay, LEADERSHIP_KEYWORDS) || /lead|team/i.test(exp.label)) {
      items.push({
        source: "Experience",
        label: `${exp.label}${exp.org ? ` — ${exp.org}` : ""}`,
        detail: exp.outcome || exp.mission || exp.description || "",
      });
    }
  }

  for (const proj of portfolio.nodes.projects as unknown as Array<{
    label: string;
    description?: string;
    impact?: string[];
  }>) {
    const hay = [proj.description, ...(proj.impact ?? [])].join(" ");
    const hit = containsAny(hay, LEADERSHIP_KEYWORDS);
    if (hit) {
      const impactLine = (proj.impact ?? []).find((i) => i.toLowerCase().includes(hit)) ?? proj.impact?.[0];
      items.push({
        source: "Project",
        label: proj.label,
        detail: impactLine || proj.description || "",
      });
    }
  }

  for (const ach of portfolio.nodes.achievements as unknown as Array<{
    label: string;
    description?: string;
  }>) {
    if (containsAny(ach.description, ["lead", "team"])) {
      items.push({ source: "Achievement", label: ach.label, detail: ach.description || "" });
    }
  }

  return items;
}

function buildCommunicationEvidence(portfolio: PortfolioData): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  for (const exp of portfolio.nodes.experience as unknown as Array<{
    label: string;
    org?: string;
    description?: string;
    outcome?: string;
  }>) {
    const hay = [exp.description, exp.outcome].join(" ");
    if (containsAny(hay, COMMUNICATION_KEYWORDS)) {
      items.push({
        source: "Experience",
        label: `${exp.label}${exp.org ? ` — ${exp.org}` : ""}`,
        detail: exp.outcome || exp.description || "",
      });
    }
  }

  for (const proj of portfolio.nodes.projects as unknown as Array<{
    label: string;
    description?: string;
    problem?: string;
    solution?: string;
  }>) {
    if (containsAny(proj.description, COMMUNICATION_KEYWORDS)) {
      items.push({ source: "Project", label: proj.label, detail: proj.description || "" });
    }
  }

  const documentedProjects = (portfolio.nodes.projects as unknown as Array<{
    problem?: string;
    solution?: string;
  }>).filter((p) => p.problem && p.solution).length;

  if (documentedProjects > 0) {
    items.push({
      source: "Portfolio",
      label: "Structured project documentation",
      detail: `${documentedProjects} of ${portfolio.nodes.projects.length} projects are written up as full problem → solution → architecture case studies — a working signal for clear technical writing.`,
    });
  }

  for (const ach of portfolio.nodes.achievements as unknown as Array<{
    label: string;
    description?: string;
  }>) {
    if (containsAny(ach.description, COMMUNICATION_KEYWORDS)) {
      items.push({ source: "Achievement", label: ach.label, detail: ach.description || "" });
    }
  }

  return items;
}

function buildHiringSummary(resume: ResumeSummaryData, projects: ProjectSummary[], skillGroups: SkillGroup[]): string {
  const totalSkills = skillGroups.reduce((n, g) => n + g.skills.length, 0);
  const strongestGroup = [...skillGroups].sort(
    (a, b) => b.skills.reduce((s, sk) => s + sk.usageCount, 0) - a.skills.reduce((s, sk) => s + sk.usageCount, 0)
  )[0];

  const headline = `${resume.name} is a ${resume.role} with ${resume.projectCount} shipped projects, ${resume.experienceCount} roles, and ${totalSkills} distinct technical skills on record.`;
  const depth = strongestGroup
    ? ` Strongest demonstrated depth is in ${strongestGroup.group.toLowerCase()}, backed by real project usage rather than a self-rated list.`
    : "";
  const proof = projects.length
    ? ` Recent work includes ${projects
        .slice(0, 3)
        .map((p) => p.label)
        .join(", ")}${projects.length > 3 ? ", among others" : ""}.`
    : "";

  return `${headline}${depth}${proof}`.trim();
}

/** Simple, transparent baseline: no job description yet, so the score
 * rewards breadth and evidenced depth rather than guessing at fit for a
 * role no one has specified. Recalculated once a JD is supplied — see
 * lib/suitability.ts — and superseded entirely once the AI report runs. */
function buildBaselineSuitability(resume: ResumeSummaryData, skillGroups: SkillGroup[]) {
  const totalSkills = skillGroups.reduce((n, g) => n + g.skills.length, 0);
  const evidencedSkills = skillGroups.reduce((n, g) => n + g.skills.filter((s) => s.usageCount > 0).length, 0);
  const evidenceRatio = totalSkills > 0 ? evidencedSkills / totalSkills : 0;

  let score = 50;
  score += Math.min(resume.projectCount * 4, 20);
  score += Math.min(resume.experienceCount * 3, 12);
  score += Math.min(resume.achievementCount * 2, 10);
  score += Math.round(evidenceRatio * 8);
  score = Math.max(0, Math.min(98, Math.round(score)));

  return {
    score,
    rationale: `Baseline heuristic from portfolio breadth: ${resume.projectCount} projects, ${resume.experienceCount} roles, ${resume.achievementCount} achievements, and ${evidencedSkills}/${totalSkills} skills backed by real usage. Paste a job description and generate the hiring report for a role-specific score.`,
    source: "heuristic" as const,
  };
}

export function buildDeterministicReport(
  portfolio: PortfolioData & { edges: [string, string][]; profile?: Record<string, unknown> }
): DeterministicReport {
  const skillGroups = buildSkillGroups(portfolio, portfolio.edges ?? []);
  const topSkills = skillGroups
    .flatMap((g) => g.skills)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 8)
    .map((s) => s.label);

  const resume = buildResumeSummary(portfolio, topSkills);
  const projects = buildProjects(portfolio);
  const leadership = buildLeadershipEvidence(portfolio);
  const communication = buildCommunicationEvidence(portfolio);
  const hiringSummary = buildHiringSummary(resume, projects, skillGroups);
  const suitability = buildBaselineSuitability(resume, skillGroups);

  return { resume, projects, skillGroups, leadership, communication, hiringSummary, suitability };
}
