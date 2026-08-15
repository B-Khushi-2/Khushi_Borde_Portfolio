/** Everything Recruiter Mode derives from `window.PORTFOLIO`, computed
 * client-side so the dashboard is fully populated even if the AI backend
 * is unreachable or unconfigured. */

export interface SkillUsage {
  id: string;
  label: string;
  group: string;
  /** How many projects/experience entries actually used this skill —
   * used as a lightweight, honest proxy for depth instead of a made-up
   * "proficiency %". */
  usageCount: number;
}

export interface SkillGroup {
  group: string;
  skills: SkillUsage[];
}

export interface EvidenceItem {
  /** e.g. "Project", "Experience", "Achievement" */
  source: string;
  label: string;
  detail: string;
}

export interface ResumeSummaryData {
  name: string;
  role: string;
  tagline: string;
  location?: string;
  education?: {
    school?: string;
    degree?: string;
    date?: string;
    detail?: string;
  };
  focusAreas: string[];
  projectCount: number;
  experienceCount: number;
  achievementCount: number;
  topSkills: string[];
}

export interface ProjectSummary {
  id: string;
  label: string;
  date?: string;
  summary: string;
  tags: string[];
  impact: string[];
}

export interface DeterministicReport {
  resume: ResumeSummaryData;
  projects: ProjectSummary[];
  skillGroups: SkillGroup[];
  leadership: EvidenceItem[];
  communication: EvidenceItem[];
  hiringSummary: string;
  suitability: {
    score: number;
    rationale: string;
    source: "heuristic";
  };
}

export interface AiHiringReport {
  hiringSummary: string;
  suitabilityScore: number;
  suitabilityRationale: string;
  resumeSummary: string;
  projectsAssessment: string;
  technicalSkillsAssessment: string;
  leadershipAssessment: string;
  communicationAssessment: string;
  strengths: string[];
  gaps: string[];
}

export interface StructuredEvaluation {
  skill: string;
  evidence: string;
  confidenceScore: number;
}

export type ReportStatus = "idle" | "loading" | "success" | "error";
