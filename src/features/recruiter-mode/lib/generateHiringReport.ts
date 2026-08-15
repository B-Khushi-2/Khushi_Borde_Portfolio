import type { PortfolioData } from "@/lib/portfolioBridge";
import type { AiHiringReport } from "@/features/recruiter-mode/types";

export class HiringReportError extends Error {
  code: string;
  constructor(message: string, code = "REPORT_ERROR") {
    super(message);
    this.name = "HiringReportError";
    this.code = code;
  }
}

/** Compact, factual digest of the live portfolio data — kept short so it
 * fits comfortably inside the backend's per-message character limit
 * alongside a pasted job description. Sent inline in the prompt itself
 * (rather than relying solely on the backend's RAG retrieval) so the
 * report is guaranteed complete context regardless of how a single
 * embedding query happens to score against the knowledge base. */
function buildDigest(portfolio: PortfolioData & { profile: Record<string, unknown> }): string {
  const p = portfolio.profile as {
    name: string;
    role: string;
    tagline: string;
    education?: { school?: string; degree?: string; detail?: string };
  };

  const skills = portfolio.nodes.skills.map((s) => s.label).join(", ");

  const projects = (portfolio.nodes.projects as unknown as Array<{
    label: string;
    summary: string;
    tags?: string[];
    impact?: string[];
  }>)
    .map((proj) => `- ${proj.label}: ${proj.summary} [${(proj.tags ?? []).join(", ")}] Impact: ${(proj.impact ?? []).join("; ")}`)
    .join("\n");

  const experience = (portfolio.nodes.experience as unknown as Array<{
    label: string;
    org?: string;
    outcome?: string | null;
    description?: string;
  }>)
    .map((exp) => `- ${exp.label} @ ${exp.org}: ${exp.outcome || exp.description}`)
    .join("\n");

  const achievements = (portfolio.nodes.achievements as unknown as Array<{
    label: string;
    description?: string;
  }>)
    .map((a) => `- ${a.label}: ${a.description}`)
    .join("\n");

  return `CANDIDATE: ${p.name} — ${p.role}
${p.tagline}
Education: ${p.education?.degree ?? ""}, ${p.education?.school ?? ""} ${p.education?.detail ?? ""}

SKILLS: ${skills}

PROJECTS:
${projects}

EXPERIENCE:
${experience}

ACHIEVEMENTS:
${achievements}`;
}

const RESPONSE_SCHEMA = `{
  "hiringSummary": string (2-4 sentences, a recruiter's first-read summary),
  "suitabilityScore": number (0-100),
  "suitabilityRationale": string (1-3 sentences explaining the score),
  "resumeSummary": string (2-3 sentences),
  "projectsAssessment": string (2-4 sentences on project quality/relevance),
  "technicalSkillsAssessment": string (2-3 sentences),
  "leadershipAssessment": string (1-3 sentences; say plainly if evidence is thin),
  "communicationAssessment": string (1-3 sentences; say plainly if evidence is thin),
  "strengths": string[] (3-5 short bullets),
  "gaps": string[] (2-4 short bullets, honest, not filler)
}`;

function buildPrompt(digest: string, jobDescription: string): string {
  const jdBlock = jobDescription.trim()
    ? `TARGET JOB DESCRIPTION:\n${jobDescription.trim().slice(0, 2000)}\n\nScore and write the report specifically against this job description.`
    : `No job description was provided. Score and write the report as a general assessment of overall hiring strength.`;

  return `You are generating a structured hiring report for a recruiter, based ONLY on the candidate data below. Do not invent facts, numbers, employers, or outcomes not present in the data.

${digest}

${jdBlock}

Respond with ONLY a single valid JSON object (no markdown fences, no commentary before or after) matching exactly this shape:
${RESPONSE_SCHEMA}

If the data doesn't clearly support leadership or communication claims, say so honestly in those fields instead of inflating them.`;
}

function stripCodeFences(text: string): string {
  if (!text || typeof text !== "string") return "";
  let clean = text.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return clean;
}

function isValidReport(data: unknown): data is AiHiringReport {
  if (!data || typeof data !== "object") return false;
  const r = data as Record<string, unknown>;
  return (
    typeof r.hiringSummary === "string" &&
    typeof r.suitabilityScore === "number" &&
    typeof r.suitabilityRationale === "string" &&
    typeof r.resumeSummary === "string" &&
    typeof r.projectsAssessment === "string" &&
    typeof r.technicalSkillsAssessment === "string" &&
    typeof r.leadershipAssessment === "string" &&
    typeof r.communicationAssessment === "string" &&
    Array.isArray(r.strengths) &&
    Array.isArray(r.gaps)
  );
}

export async function generateHiringReport({
  portfolio,
  jobDescription,
  signal,
}: {
  portfolio: PortfolioData & { profile: Record<string, unknown> };
  jobDescription: string;
  signal?: AbortSignal;
}): Promise<AiHiringReport> {
  const digest = buildDigest(portfolio);
  const prompt = buildPrompt(digest, jobDescription);

  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      signal,
    });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") throw err;
    throw new HiringReportError("Couldn't reach the report backend. Check your connection and try again.", "NETWORK_ERROR");
  }

  if (!response.ok) {
    let message = `The server returned an error (${response.status}).`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      // fall back to generic message
    }
    throw new HiringReportError(message, "HTTP_ERROR");
  }

  const body = (await response.json()) as { content?: string };
  const raw = stripCodeFences(body.content ?? "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HiringReportError("The model's report wasn't valid JSON. Try generating again.", "PARSE_ERROR");
  }

  if (!isValidReport(parsed)) {
    throw new HiringReportError("The model's report was missing expected fields. Try generating again.", "SHAPE_ERROR");
  }

  parsed.suitabilityScore = Math.max(0, Math.min(100, Math.round(parsed.suitabilityScore)));
  return parsed;
}
