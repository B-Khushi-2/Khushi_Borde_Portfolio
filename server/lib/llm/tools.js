// ============================================================================
// LLM AGENT TOOLS & DEFINITIONS
// ----------------------------------------------------------------------------
// Defines tools available for the LLM tool-calling agent:
// 1. searchProjects(query: string) — searches project-related knowledge chunks
// 2. getResumePDF() — returns candidate resume file path/URL
// 3. getContactInfo() — returns contact details directly from profile.ts
// ============================================================================

const path = require("path");
const fs = require("fs");
const { retrieve } = require("../../rag/retriever");

const PROFILE_TS_PATH = path.resolve(__dirname, "../../../src/content/profile.ts");

function loadProfile() {
  try {
    const source = fs.readFileSync(PROFILE_TS_PATH, "utf8");
    const jsSource = source
      .replace(/export\s+(interface|type)[\s\S]*?(?=\nexport|\/\/|\/\*|$)/g, "")
      .replace(/: [A-Z][A-Za-z0-9<>[\]|]*/g, "")
      .replace(/export\s+default\s+PORTFOLIO;?/g, "")
      .replace(/export\s+const\s+PORTFOLIO/g, "const PORTFOLIO");

    const load = new Function("window", `${jsSource}\nreturn PORTFOLIO.profile;`);
    return load({});
  } catch (err) {
    return {
      name: "Khushi Borde",
      role: "AI/ML Engineer & Full-Stack Builder",
      email: "khushiborde2@gmail.com",
      phone: "8010648383",
      location: "Chhatrapati Sambhajinagar, Maharashtra, India",
      links: {
        github: "https://github.com/B-Khushi-2",
        linkedin: "https://linkedin.com/in/khushi-borde-759258303"
      }
    };
  }
}

// Tool Specifications (JSON Schema for OpenAI / Gemini)
const TOOL_DEFINITIONS = [
  {
    name: "searchProjects",
    description: "Search specifically for software projects, technical architectures, problem/solution breakdowns, and code repositories built by Khushi Borde.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search terms or keywords relating to software projects (e.g. 'React', 'fire detection', 'n8n', 'Moltress', 'FoodBridge', 'Tarang')."
        }
      },
      required: ["query"]
    }
  },
  {
    name: "getResumePDF",
    description: "Retrieve the official PDF resume download URL and filename for Khushi Borde.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "getContactInfo",
    description: "Fetch direct contact details (email, phone number, location, GitHub, LinkedIn, availability) for Khushi Borde without running retrieval.",
    parameters: {
      type: "object",
      properties: {}
    }
  }
];

// Tool Implementation Executors
const TOOL_EXECUTORS = {
  async searchProjects({ query }, opts = {}) {
    const results = await retrieve(query, opts);
    // Filter to project-related chunks
    const projectChunks = results.filter(
      (c) =>
        c.source === "projects.md" ||
        (c.breadcrumb && c.breadcrumb.toLowerCase().includes("project")) ||
        (c.label && c.label.toLowerCase().includes("project"))
    );
    // Fallback to all retrieved chunks if filter is empty
    const chunks = projectChunks.length > 0 ? projectChunks : results;
    return {
      query,
      count: chunks.length,
      chunks: chunks.map((c) => ({
        breadcrumb: c.breadcrumb || c.source,
        text: c.text,
        score: c.score
      }))
    };
  },

  async getResumePDF() {
    return {
      resumeUrl: "/assets/Khushi_Borde_Resume.pdf",
      filename: "Khushi_Borde_Resume.pdf",
      candidateName: "Khushi Borde",
      lastUpdated: "2026"
    };
  },

  async getContactInfo() {
    const profile = loadProfile();
    return {
      name: profile.name,
      role: profile.role,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      github: profile.links?.github,
      linkedin: profile.links?.linkedin,
      availability: profile.contact?.availability,
      responseTime: profile.contact?.responseTime,
      focusAreas: profile.contact?.focus
    };
  }
};

async function executeToolCall(toolName, args, opts = {}) {
  const executor = TOOL_EXECUTORS[toolName];
  if (!executor) {
    throw new Error(`Unknown tool: "${toolName}"`);
  }
  const result = await executor(args || {}, opts);
  return {
    name: toolName,
    args: args || {},
    result
  };
}

module.exports = {
  TOOL_DEFINITIONS,
  TOOL_EXECUTORS,
  executeToolCall
};
