const { route } = require("./router");

// Define available intents
const INTENTS = [
  "Recruitment",
  "Interview",
  "Resume",
  "Project",
  "Architecture",
  "Skills",
  "Roadmap",
  "Career",
  "General Conversation",
  "Portfolio Navigation",
  "Greeting",
  "Unknown"
];

/**
 * Classifies query intent based on keyword mapping.
 */
function classifyIntent(query) {
  const clean = query.trim().toLowerCase();
  const matched = [];

  const mappings = {
    "Greeting": ["hi", "hello", "hey", "yo", "sup", "good morning", "good afternoon", "good evening"],
    "General Conversation": ["thanks", "thank you", "thx", "ty", "cheers", "how are you", "who are you", "who is the creator"],
    "Recruitment": ["recruit", "hire", "job", "work", "internship", "candidate", "candidacy", "experience", "contact", "phone", "email", "address", "location"],
    "Interview": ["interview", "interview question", "mock interview", "technical question", "quiz", "test me", "ask me"],
    "Resume": ["ats", "ats score", "resume", "resume review", "missing keyword", "ats optimization", "cv"],
    "Project": ["project", "aarogyamitra", "fire detection", "foodbridge", "tarang", "code", "codebase", "features", "implementation"],
    "Architecture": ["architecture", "explain architecture", "cnn", "sequential", "layer", "diagram", "webhooks", "system design"],
    "Skills": ["skill", "tech stack", "technologies", "frameworks", "programming", "languages", "mern", "python", "javascript"],
    "Roadmap": ["roadmap", "next skill", "study", "path", "growth", "learning"],
    "Career": ["career", "college", "degree", "jnec", "academic", "cgpa", "education", "university"]
  };

  for (const [intent, keywords] of Object.entries(mappings)) {
    for (const keyword of keywords) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(clean)) {
        matched.push(intent);
        break;
      }
    }
  }

  if (matched.length === 0) {
    return ["Unknown"];
  }
  return [...new Set(matched)];
}

/**
 * Generates specific execution steps based on intents.
 */
function generateExecutionPlan(intents, query) {
  const clean = query.trim().toLowerCase();
  const plan = [];

  plan.push(`Analyze query intent: [${intents.join(", ")}]`);

  if (intents.includes("Project") || intents.includes("Architecture")) {
    let project = "specified project";
    if (clean.includes("tarang")) project = "Tarang Platform";
    else if (clean.includes("aarogyamitra")) project = "AarogyaMitra Chatbot";
    else if (clean.includes("fire")) project = "Fire Detection CNN";
    else if (clean.includes("foodbridge")) project = "FoodBridge";

    plan.push(`Retrieve technical details and database metrics for ${project}`);
    if (intents.includes("Architecture")) {
      plan.push("Verify sequential CNN configurations or webhook payload structure");
    }
    plan.push("Synthesize architectural scaling trade-offs");
  } else if (intents.includes("Resume") || intents.includes("Recruitment")) {
    plan.push("Retrieve Khushi Borde's work history, JNEC background, and contact indices");
    plan.push("Check keyword densities against ATS optimization requirements");
  } else if (intents.includes("Interview")) {
    plan.push("Construct resume-based technical questions and project-specific system design prompts");
  } else if (intents.includes("Roadmap")) {
    plan.push("Access baseline skillsets & map industry learning milestones");
  } else {
    plan.push("Retrieve matching information from general knowledge base");
  }

  plan.push("Verify result accuracy against context base constraint");
  plan.push("Format complete visual markdown report");

  return plan;
}

/**
 * Calculates internal confidence score from chunk matches.
 */
function calculateConfidence(query, retrievedChunks) {
  const intents = classifyIntent(query);
  if (intents.includes("Greeting") || intents.includes("General Conversation")) {
    return 1.0;
  }
  if (retrievedChunks.length === 0) {
    return 0.2; // Low confidence since grounding context is missing
  }
  // Base confidence on the highest matching chunk score
  const maxScore = Math.max(...retrievedChunks.map(c => c.score ?? 0), 0);
  return Math.min(maxScore, 1.0);
}

/**
 * Smart Follow-Ups based on query context
 */
function generateFollowUps(query, intents) {
  const clean = query.trim().toLowerCase();
  const suggestions = [];

  if (intents.includes("Project") || intents.includes("Architecture")) {
    if (clean.includes("tarang")) {
      suggestions.push("Explain Tarang architecture", "What tech stack was used for Tarang?");
    } else if (clean.includes("aarogyamitra")) {
      suggestions.push("How does AarogyaMitra handle medical triage?", "Compare AarogyaMitra with FoodBridge");
    } else {
      suggestions.push("Compare her top projects", "What dataset was used for Fire Detection?");
    }
  } else if (intents.includes("Resume") || intents.includes("Recruitment")) {
    suggestions.push("Ask an interview question", "What is her CGPA?", "Suggest next skills for her");
  } else if (intents.includes("Interview")) {
    suggestions.push("Ask a resume-based interview question", "Evaluate her system design capacity");
  } else {
    suggestions.push("Summarize her project experience", "How to contact Khushi?", "What is her education background?");
  }

  // Ensure unique and limit to 3 suggestions
  return [...new Set(suggestions)].slice(0, 3);
}

module.exports = {
  classifyIntent,
  generateExecutionPlan,
  calculateConfidence,
  generateFollowUps
};
