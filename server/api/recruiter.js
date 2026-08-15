const express = require("express");
const config = require("../config/env");
const { getProvider } = require("../lib/llm");
const { AppError } = require("../lib/errors");
const logger = require("../lib/logger");

const router = express.Router();

// Static fallback analysis that is high-fidelity and fully populated
const STATIC_WORKSPACE_ANALYSIS = {
  overview: {
    name: "Khushi Borde",
    role: "AI/ML Engineer & Full-Stack Builder",
    education: "B.Tech in Computer Science & Engineering (Minor in AI/ML) at MGM's JNEC (CGPA: 9.15)",
    location: "Chhatrapati Sambhajinagar, Maharashtra, India",
    availability: "Available for Internships & Full-time Roles",
    experience: "MERN Stack development, Deep Learning Pipelines, and Automation webhooks",
    projects: "AarogyaMitra, Fire Detection CNN, FoodBridge, Tarang Platform",
    achievements: "SIH (Smart India Hackathon) National Finalist 2023, 40+ Certifications on Infosys Springboard",
    skills: "React, Node.js, Python, TensorFlow, PyTorch, n8n, Firebase, MERN Stack",
    certifications: "Infosys Springboard AI/ML Minor, Neural Networks and Deep Learning (Coursera)"
  },
  aiAnalysis: {
    executiveSummary: "Khushi Borde is a high-potential AI/ML and Full-Stack developer who bridges the gap between deep learning models and production web deployments. With a stellar academic record (CGPA 9.15) and proven hackathon excellence (SIH finalist), she demonstrates advanced engineering discipline and quick adaptability.",
    hiringRecommendation: "Strong Hire for Junior AI/ML Developer, Full-Stack Engineer, or AI Integrations Specialist roles.",
    strengths: [
      "End-to-end AI/ML deployment: builds models (CNNs) and wraps them in robust React/MERN frontends",
      "Hackathon-proven rapid prototyping and technical leadership under pressure (SIH 2023 finalist)",
      "Exceptional academic consistency and self-driven continuous learning (40+ certificates)"
    ],
    risks: [
      "Limited exposure to enterprise production clusters (Kubernetes/AWS) at scale",
      "Primarily independent/academic projects rather than long-term team maintenance"
    ],
    bestFitRoles: ["AI Engineer", "Full-Stack Developer", "AI integrations Specialist", "Machine Learning Prototyper"],
    careerGrowth: "High trajectory; ready to advance into ML Ops or Senior AI Architect paths as she handles large-scale distributed cloud systems.",
    engineeringMaturity: 88,
    aiReadiness: 95,
    leadershipPotential: 85,
    communication: 90
  },
  skillsAnalysis: {
    frontend: 90,
    backend: 88,
    aiml: 95,
    cloud: 75,
    database: 85,
    devops: 70,
    problemSolving: 92,
    systemDesign: 80
  },
  projectInsights: [
    {
      name: "AarogyaMitra",
      complexity: "High",
      architecture: "MERN Stack with n8n Webhook Automations & Claude Symptom Triage",
      scalability: "High modular workflow engine",
      innovation: "Reduces manual intake overhead by 50% using agentic workflows",
      businessImpact: "Provides immediate healthcare triage accessibility",
      technicalDepth: "Custom integration of LLM-based triage rules and live messaging services"
    },
    {
      name: "Fire Detection",
      complexity: "Very High",
      architecture: "Custom 18-layer CNN + React camera processing frontend",
      scalability: "Edge-optimized real-time video inference",
      innovation: "Custom layer stacking to prevent frame drops in live React cameras",
      businessImpact: "Saves critical emergency response time during early fires",
      technicalDepth: "TensorFlow CNN architecture optimization, frame interpolation"
    },
    {
      name: "Tarang Platform",
      complexity: "Medium-High",
      architecture: "Firebase geospatial indexing + real-time ocean hazard maps",
      scalability: "Real-time sync of hazard hot-spots",
      innovation: "Collaborative real-time danger updates for coastal communities",
      businessImpact: "Enables immediate rescue coordination in hazardous coastal conditions",
      technicalDepth: "GeoSync indexing, Firebase realtime database, responsive GIS maps"
    },
    {
      name: "FoodBridge",
      complexity: "Medium",
      architecture: "Surplus food verification MERN application",
      scalability: "Real-time coordinator dashboard",
      innovation: "AI-based food quality image checks",
      businessImpact: "Reduces regional food wastage by coordinating donation logistics",
      technicalDepth: "Quality checking heuristics, database coordinator hooks"
    }
  ],
  interviewReadiness: {
    strongAreas: ["Neural Networks / CNN layer stacking", "Workflow automation with n8n/webhooks", "Frontend React/Tailwind performance", "AI integration pipelines"],
    weakAreas: ["Distributed queues (Kafka/RabbitMQ)", "Large scale database clustering", "Docker/Kubernetes orchestration"],
    questions: [
      "How did you resolve camera processing frame drops in the React interface for your Fire Detection model?",
      "Can you explain the trade-offs of using n8n for agentic webhook orchestration in AarogyaMitra?",
      "How does the Firebase geospatial synchronization handle network dropouts in Tarang?"
    ],
    preparationSuggestions: [
      "Review Docker container builds and simple deployments on AWS ECS or GCP Cloud Run.",
      "Practice system design mock interviews focusing on load balancing and message queues."
    ]
  },
  atsAnalysis: {
    compatibilityScore: 92,
    keywordCoverage: 88,
    missingKeywords: ["Docker", "Kubernetes", "AWS ECS", "Kafka", "CI/CD pipelines"],
    optimizationSuggestions: [
      "Add a dedicated 'DevOps/Cloud' section highlighting experience with Docker, even if academic.",
      "Integrate mentions of testing frameworks (e.g. Jest, Vitest, PyTest) in project summaries.",
      "Quantify metrics more: for example, explicitly list dataset sizes used for Fire Detection CNN training."
    ]
  }
};

router.post("/workspace", async (req, res, next) => {
  const providerName = config.DEFAULT_PROVIDER;

  if (providerName === "mock") {
    // Return structured analyzer data immediately
    return res.json(STATIC_WORKSPACE_ANALYSIS);
  }

  try {
    const provider = getProvider(providerName);
    const model = config.PROVIDER_MODELS[providerName];
    const apiKey = config.PROVIDER_API_KEYS[providerName];
    const baseUrl = providerName === "gemini" ? config.GEMINI_BASE_URL : config.OPENAI_BASE_URL;

    if (!apiKey) {
      logger.warn("No active LLM API key configured for workspace analyze. Using cached high-fidelity report.");
      return res.json(STATIC_WORKSPACE_ANALYSIS);
    }

    const systemPrompt = `You are a certified Talent Acquisition Partner & Senior AI Architect.
Analyze the candidate Khushi Borde's resume and portfolio context and output a fully filled JSON matching this exact layout schema:
{
  "overview": {
    "name": "Khushi Borde",
    "role": "AI/ML Engineer & Full-Stack Builder",
    "education": "B.Tech in Computer Science & Engineering (Minor in AI/ML) at MGM's JNEC (CGPA: 9.15)",
    "location": "Chhatrapati Sambhajinagar, Maharashtra, India",
    "availability": "Available for Internships & Full-time Roles",
    "experience": "MERN Stack development, Deep Learning Pipelines, and Automation webhooks",
    "projects": "AarogyaMitra, Fire Detection CNN, FoodBridge, Tarang Platform",
    "achievements": "SIH (Smart India Hackathon) National Finalist 2023, 40+ Certifications on Infosys Springboard",
    "skills": "React, Node.js, Python, TensorFlow, PyTorch, n8n, Firebase, MERN Stack",
    "certifications": "Infosys Springboard AI/ML Minor, Neural Networks and Deep Learning (Coursera)"
  },
  "aiAnalysis": {
    "executiveSummary": string (detailed 2-3 sentences),
    "hiringRecommendation": string,
    "strengths": string[] (3 points),
    "risks": string[] (2 points),
    "bestFitRoles": string[],
    "careerGrowth": string,
    "engineeringMaturity": number (0-100),
    "aiReadiness": number (0-100),
    "leadershipPotential": number (0-100),
    "communication": number (0-100)
  },
  "skillsAnalysis": {
    "frontend": number,
    "backend": number,
    "aiml": number,
    "cloud": number,
    "database": number,
    "devops": number,
    "problemSolving": number,
    "systemDesign": number
  },
  "projectInsights": [
    {
      "name": string,
      "complexity": string,
      "architecture": string,
      "scalability": string,
      "innovation": string,
      "businessImpact": string,
      "technicalDepth": string
    }
  ],
  "interviewReadiness": {
    "strongAreas": string[],
    "weakAreas": string[],
    "questions": string[] (3 questions),
    "preparationSuggestions": string[]
  },
  "atsAnalysis": {
    "compatibilityScore": number,
    "keywordCoverage": number,
    "missingKeywords": string[],
    "optimizationSuggestions": string[]
  }
}

Important: Return ONLY a raw JSON string. Do not wrap it in markdown codeblocks. Do not add any text before or after the JSON.
Ground truth candidate info to use:
${JSON.stringify(req.body.portfolioDigest || STATIC_WORKSPACE_ANALYSIS.overview)}`;

    let responseContent = "";
    const stream = provider.streamChat({
      messages: [{ role: "user", content: systemPrompt }],
      model,
      apiKey,
      baseUrl,
      temperature: 0.2
    });

    for await (const chunk of stream) {
      responseContent += chunk;
    }

    // Clean up markdown block wraps if model generated them
    let clean = responseContent.trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    }

    const parsed = JSON.parse(clean);
    return res.json(parsed);
  } catch (err) {
    logger.error({ err }, "Workspace analysis generation failed. Falling back to cached static analysis.");
    return res.json(STATIC_WORKSPACE_ANALYSIS);
  }
});

router.get("/telemetry", (req, res) => {
  try {
    const { getTelemetryReport } = require("../lib/telemetry");
    const report = getTelemetryReport();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: "Failed to load SRE telemetry report" });
  }
});

module.exports = router;
