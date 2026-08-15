// =============================================================================
// server/lib/llm/structuredEval.js — Structured Evaluation query helper.
// -----------------------------------------------------------------------------
// Detects queries like "does she know Python" or "rate her fit for a senior React
// role" and prepares structured JSON prompts & parser.
// =============================================================================

/**
 * Detects if a user query is a structured skill check or role fit evaluation question.
 *
 * @param {string} query
 * @returns {boolean}
 */
function isStructuredEvalQuery(query) {
  if (!query || typeof query !== "string") return false;
  const clean = query.trim().toLowerCase();

  const skillPattern = /\b(does\s+she\s+(?:know|use|work\s+with)|is\s+she\s+(?:good\s+at|proficient\s+in|experienced\s+in|familiar\s+with|qualified\s+for|suitable\s+for))\b/i;

  const fitPattern = /\b(rate\s+her\s+(?:fit|suitability|skills?)|assess\s+her\s+(?:fit|suitability|skills?)|suitability\s+for|fit\s+for\s+(?:a|an|the)?|how\s+well\s+does\s+she\s+fit)\b/i;

  return skillPattern.test(clean) || fitPattern.test(clean);
}

/**
 * Formats a structured evaluation prompt requesting JSON matching:
 * { skill: string, evidence: string, confidenceScore: number }
 *
 * @param {string} rawQuery
 * @param {Array<{ breadcrumb?: string, source?: string, text: string }>} retrievedChunks
 * @returns {string}
 */
function buildStructuredEvalPrompt(rawQuery, retrievedChunks = []) {
  const contextText =
    retrievedChunks && retrievedChunks.length > 0
      ? retrievedChunks.map((c, i) => `[${i + 1}] (${c.breadcrumb || c.source || "Context"})\n${c.text}`).join("\n\n---\n\n")
      : "No candidate context available.";

  return `You are an expert AI recruiter evaluating candidate Khushi Borde.
Analyze the candidate context below and answer the user query: "${rawQuery}".

You MUST return ONLY a single valid JSON object. Do not include markdown codeblocks, prefix text, or explanation outside the JSON.

The JSON MUST match this exact schema:
{
  "skill": "<Name of the skill or role evaluated, e.g. 'Python' or 'Senior React Role'>",
  "evidence": "<2-4 sentence detailed summary based ONLY on candidate context, citing specific projects, experience, education, or achievements>",
  "confidenceScore": <Numeric score between 0 and 100 based on verified evidence in context>
}

Candidate Context:
<context>
${contextText}
</context>`;
}

/**
 * Safely parses structured evaluation JSON output from LLM.
 *
 * @param {string} text
 * @returns {{ skill: string, evidence: string, confidenceScore: number } | null}
 */
function parseStructuredEvalJson(text) {
  if (!text || typeof text !== "string") return null;
  let clean = text.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]);
      if (
        obj &&
        typeof obj.skill === "string" &&
        typeof obj.evidence === "string" &&
        (typeof obj.confidenceScore === "number" || typeof obj.confidenceScore === "string")
      ) {
        return {
          skill: obj.skill,
          evidence: obj.evidence,
          confidenceScore: Math.min(100, Math.max(0, Number(obj.confidenceScore) || 80)),
        };
      }
    } catch {}
  }
  return null;
}

module.exports = {
  isStructuredEvalQuery,
  buildStructuredEvalPrompt,
  parseStructuredEvalJson,
};
