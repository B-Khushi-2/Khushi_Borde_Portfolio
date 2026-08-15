const { FALLBACK_LINE, BASE_SYSTEM_PROMPT, buildContextBlock } = require("../../rag/promptTemplates");

const AGENTS = [
  {
    name: "Recruiter Agent",
    prompt: "You are the Recruiter Agent, a Staff Talent Acquisition Specialist. Your role is to assess Khushi Borde's candidacy, summarize her overall experience, timeline, behavioral capabilities, and ATS optimization profile. Highlight key recruitment metrics like SIH national final achievements and her CSE B.Tech background.",
    keywords: ["experience", "internship", "job", "work", "recruit", "hire", "candidacy", "timeline", "hiring", "contact", "behavioral", "about", "khushi", "background"]
  },
  {
    name: "Project Expert Agent",
    prompt: "You are the Project Expert Agent, a Principal Deep Learning & Full-Stack Architect. Your role is to walk through project architectures, implementation details, tech stacks (MERN, Python, TensorFlow), database schemas, sequential layers of CNNs, and scalability trade-offs. Detail components like AarogyaMitra's n8n webhooks or Fire Detection's 18-layer CNN.",
    keywords: ["project", "architecture", "explain architecture", "implementation", "scalability", "feature", "tradeoff", "moltress", "aarogyamitra", "fire detection", "foodbridge", "tarang", "cnn", "convolutional", "layer", "dataset", "code", "codebase"]
  },
  {
    name: "Technical Interview Agent",
    prompt: "You are the Technical Interview Agent, a Senior Technical Interviewer. Your role is to ask deep, resume-based coding/system design/AI/ML questions tailored specifically to her experience (such as CNN designs, n8n webhook routing, or Firebase realtime syncing), run mock-interviews, and evaluate solutions constructively. Do NOT ask generic DSA questions (e.g. linked lists, arrays, trees, dynamic programming), as there is no DSA on her resume. Instead, focus entirely on evaluating her projects, AI/ML, and full-stack capabilities.",
    keywords: ["interview", "interview question", "mock interview", "technical question", "quiz", "test me", "ask me", "system design"]
  },
  {
    name: "Resume Analyst Agent",
    prompt: "You are the Resume Analyst Agent, a certified ATS Specialist. Your role is to perform resume reviews, assess ATS scores, identify missing keywords, evaluate core strengths & weaknesses, and offer professional hiring recommendations.",
    keywords: ["ats", "ats score", "resume review", "missing keyword", "ats optimization", "strength", "weakness", "gap", "recommendation"]
  },
  {
    name: "AI Career Coach",
    prompt: "You are the AI Career Coach, a Skill Advisor. Your role is to evaluate skill sets, suggest learning roadmaps (e.g. Pinecone, cloud, Docker, Kubernetes), identify learning gaps, and give preparation strategies. Demarcate clearly between documented facts and career suggestions.",
    keywords: ["roadmap", "learning", "career", "growth", "next skill", "skill gap", "study", "preparation", "advice", "path"]
  },
  {
    name: "Portfolio Analyst",
    prompt: "You are the Portfolio Analyst, a Principal UI/UX Auditor. Your role is to analyze portfolio styling, animation flows, visual contrast, performance parameters (Lighthouse indices), responsiveness, and accessibility compliance. Reference web app design choices.",
    keywords: ["portfolio", "ui", "ux", "accessibility", "contrast", "theme", "dark mode", "light mode", "design", "animation", "performance", "speed", "styling", "responsive"]
  }
];

/**
 * Smart Agent Router
 * Determines which agents are relevant to the query based on keyword density.
 * Cap at 2 primary active agents to prevent prompt bloat and token overflow.
 */
function route(query) {
  const clean = query.trim().toLowerCase();
  const matched = [];

  for (const agent of AGENTS) {
    let score = 0;
    for (const keyword of agent.keywords) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(clean)) {
        score++;
      }
    }
    if (score > 0) {
      matched.push({ agent, score });
    }
  }

  matched.sort((a, b) => b.score - a.score);

  const selected = [];
  if (matched.length === 0) {
    selected.push(AGENTS[0]);
  } else {
    selected.push(matched[0].agent);
    if (matched.length > 1 && matched[1].score >= 1) {
      selected.push(matched[1].agent);
    }
  }

  return selected;
}

function buildCollaborativeSystemPrompt(agents, retrievedChunks) {
  // Cap at maximum 2 primary agents
  const activeAgents = (agents || []).slice(0, 2);

  const agentPrompts = activeAgents
    .map((a) => `### Role: ${a.name}\n${a.prompt}`)
    .join("\n\n");

  const basePrompt = `${BASE_SYSTEM_PROMPT}

You are collaborating as a Multi-Agent AI system comprising the following active specialized experts:
${activeAgents.map((a) => `- ${a.name}`).join("\n")}

Active expert instructions:
${agentPrompts}`;

  return `${basePrompt}\n\n${buildContextBlock(retrievedChunks)}`;
}

module.exports = { route, buildCollaborativeSystemPrompt };
