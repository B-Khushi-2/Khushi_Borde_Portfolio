// ============================================================================
// "mock" chat provider — no API key, no network call.
// ----------------------------------------------------------------------------
// Lets the whole pipeline (React UI -> chat hook -> API -> RAG retrieval ->
// "LLM" -> streamed response -> rendering) work end to end with zero setup
// and zero cost: no OpenAI/Gemini account needed.
//
// In this upgraded version, it functions as a highly tailored local agent
// for Khushi Borde's portfolio:
//   - Intercepts advanced chat tools (Interview Mode, Compare Projects,
//     Explain Architecture, Growth Roadmap, Code/Project Explainers) and returns
//     pre-crafted, professional markdown responses.
//   - Matches common query keywords (experience, skills, contact, education,
//     achievements) to answer standard recruiter questions with polished copy.
//   - Falls back to RAG matching against data/knowledge/*.md for anything else.
// ============================================================================

const config = require("../../../config/env");
const { classifyIntent } = require("../planner");

function smallTalkReply(question) {
  const intents = classifyIntent(question);
  if (intents.includes("Greeting")) {
    return (
      "Hi! I'm the Recruiter Copilot — ask me anything about Khushi Borde's projects, experience, skills, " +
      "achievements, or resume, and I'll answer using the knowledge base."
    );
  }
  if (intents.includes("General Conversation")) {
    const clean = question.toLowerCase();
    if (clean.includes("how are you")) {
      return "I'm doing great, thank you! I'm here and ready to help you analyze Khushi Borde's qualifications. Ask me anything about her portfolio!";
    }
    if (clean.includes("who are you") || clean.includes("who is the creator")) {
      return "I'm the Recruiter Copilot, a custom AI agent designed to help recruiters evaluate Khushi Borde's engineering skillset. I was built by Khushi to showcase her skills and projects!";
    }
    return "You're welcome! Let me know if there's anything else you'd like to know.";
  }
  return null;
}

function extractRetrievedChunks(messages) {
  const system = messages.find((m) => m.role === "system");
  if (!system) return [];

  const marker = system.content.includes("<context>") ? "<context>" : "RETRIEVED CONTEXT";
  const idx = system.content.lastIndexOf(marker);
  if (idx === -1) return [];

  const block = system.content.slice(idx);
  if (block.includes("No relevant information was found")) return [];

  const headerEnd = block.indexOf("\n");
  const chunksText = headerEnd === -1 ? block : block.slice(headerEnd + 1);

  return chunksText
    .split(/\n\n---\n\n/)
    .map((piece) => {
      const match = /^\[\d+\]\s*\(([^)]*)\)\n([\s\S]*)$/.exec(piece.trim());
      if (!match) return null;
      return { label: match[1], text: match[2].replace(/<\/context>$/, "").trim() };
    })
    .filter(Boolean);
}

function lastUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

const FALLBACK_LINE =
  "I don't have that specific detail recorded in Khushi's portfolio database yet. However, I'd be happy to share details about her core AI/ML stack, key engineering projects (like Moltress or Fire Detection), or internship experience! For specific inquiries beyond what's documented here, feel free to reach out directly via the Contact section below — she'd love to connect!";

function composeReply(messages) {
  const question = lastUserMessage(messages).trim();

  // Detect hiring report request and return a structured JSON mock report
  if (/generating a structured hiring report/i.test(question)) {
    let score = 88;
    let rationale = "Khushi Borde possesses strong technical capabilities in AI/ML, TensorFlow, RAG, and full-stack development that map directly to modern engineering requirements.";
    
    if (/ai|machine learning|deep learning|python|rag|model|cnn/i.test(question)) {
      score = 94;
      rationale = "Exceptional fit for AI/ML roles: candidate has hands-on deep learning experience (18-layer CNN in TensorFlow, 94% accuracy), RAG architectures, and AI/ML internships at Vishwakarma University & Infosys Springboard.";
    } else if (/react|frontend|web|typescript|javascript|full stack|mern/i.test(question)) {
      score = 92;
      rationale = "Strong fit for Full-Stack / React roles: candidate has shipped production web apps (FoodBridge, AarogyaMitra) with real-time sync, state management, and modern UI components.";
    }

    return JSON.stringify({
      hiringSummary: "Khushi Borde is an AI/ML Engineer and Full-Stack Builder with a 9.15 CGPA from JNEC (Minor in AI/ML) and Top 5 national finalist recognition at Smart India Hackathon.",
      suitabilityScore: score,
      suitabilityRationale: rationale,
      resumeSummary: "Education from MGM's JNEC (B.Tech CSE, Minor in AI/ML, CGPA 9.15) with AI/ML internships at Infosys Springboard and Vishwakarma University.",
      projectsAssessment: "Substantial technical depth demonstrated across Moltress (GraphRAG desktop assistant), Fire Detection (18-layer CNN), AarogyaMitra (n8n WhatsApp triage), and FoodBridge (MERN surplus food platform).",
      technicalSkillsAssessment: "Strong proficiency in Python, TensorFlow, React, Node.js/Express, MongoDB, n8n automation, and REST APIs.",
      leadershipAssessment: "Demonstrated team leadership as Smart India Hackathon Team Lead, guiding team to Top 5 in India at SIH National Finals.",
      communicationAssessment: "Proven technical communication — facilitated Gen AI Study Jam for 100+ participants with Google Developers Group.",
      strengths: [
        "End-to-end AI/ML model training and deployment",
        "Full-stack MERN & React engineering with real-time features",
        "National hackathon leadership (SIH Top 5 in India)",
        "Strong academic standing (CGPA 9.15)"
      ],
      gaps: [
        "Lacks multi-year enterprise production experience",
        "Limited large-scale Kubernetes cluster management"
      ]
    });
  }

  const { isStructuredEvalQuery } = require("../structuredEval");
  if (isStructuredEvalQuery(question)) {
    if (/python/i.test(question)) {
      return JSON.stringify({
        skill: "Python",
        evidence: "Khushi Borde has verified hands-on experience with Python across deep learning model training (TensorFlow, PyTorch, 18-layer CNN for Fire Detection) and AI/ML internship projects at Vishwakarma University and Infosys Springboard.",
        confidenceScore: 92
      });
    }
    if (/react/i.test(question)) {
      return JSON.stringify({
        skill: "React / Frontend Engineering",
        evidence: "Khushi has built production React frontends for multiple major projects (AarogyaMitra, FoodBridge, Fire Detection live camera interface) with state management, webhooks, and real-time Socket.io/Firebase sync.",
        confidenceScore: 90
      });
    }
    const targetSkill = question.replace(/^(does\s+she\s+(?:know|have|use|work\s+with)|is\s+she\s+(?:good\s+at|proficient\s+in|experienced\s+in|familiar\s+with|qualified\s+for)|rate\s+her\s+(?:fit|suitability|skills?)\s*(?:for)?|assess\s+her\s+(?:fit|suitability|skills?)\s*(?:for)?)\s*/i, "").replace(/[?.]/g, "").trim() || "Skill & Fit Assessment";
    const skillLabel = targetSkill ? targetSkill.charAt(0).toUpperCase() + targetSkill.slice(1) : "Skill & Fit Assessment";
    return JSON.stringify({
      skill: skillLabel,
      evidence: `Khushi's portfolio demonstrates strong technical capability for ${skillLabel}, backed by a 9.15 CGPA in CSE (Minor in AI/ML) and proven hackathon excellence (Smart India Hackathon Top 5 finalist).`,
      confidenceScore: 85
    });
  }

  const smallTalk = smallTalkReply(question);
  if (smallTalk) return smallTalk;

  // 1. Tool Action: Interview Mode
  if (/interview mode|answer AS Khushi/i.test(question)) {
    if (/project|build|work/i.test(question)) {
      return "As Khushi Borde, I'm really proud of the projects I've built! For instance, in **Moltress**, I built a privacy-preserving local enterprise AI desktop assistant using Electron, ChromaDB, and Neo4j GraphRAG. In **AarogyaMitra**, I built n8n webhook automation and Claude API symptom triage pipelines that reduced manual overhead by 50%. In **Fire Detection**, I built a custom 18-layer CNN that achieved 94% accuracy. Would you like to know more about how I built them?";
    }
    if (/skill|python|javascript|react|ml|ai/i.test(question)) {
      return "In my research and projects, I primarily use **Python** for machine learning (using TensorFlow/Keras, Hugging Face, and PyTorch) and **JavaScript/TypeScript** with **React** and **Node.js** for building web frontends, APIs, and Electron desktop tools. I also design agentic workflows using n8n. What specific technologies are you looking for in this role?";
    }
    return "Hi! I'm Khushi Borde. Thank you so much for taking the time to interview me today!\n\nI am currently a B.Tech Computer Science & Engineering student at MGM's Jawaharlal Nehru Engineering College (JNEC), pursuing a minor in AI/ML. My passion lies in bridging AI/ML research and full-stack development.\n\nFeel free to ask me anything about my projects (like Moltress, Fire Detection, AarogyaMitra, or FoodBridge), my hackathon experiences, or my technical skillset!";
  }

  // Notable & Key Projects Handler
  if (/notable project|key project|tell me about.*project|her project|what.*project|list.*project|best project|top project/i.test(question) && !/compare|table/i.test(question)) {
    return "Here is a breakdown of Khushi Borde's most notable engineering projects:\n\n" +
      "1. **Moltress (Local Enterprise AI Assistant)**\n" +
      "   - **Tech Stack**: Electron, RAG, ChromaDB, Neo4j Knowledge Graph, Fine-Tuned LLM\n" +
      "   - **Highlight**: Local-first GraphRAG desktop application for querying enterprise codebases offline with Neo4j structured graph retrieval and anti-hallucination guardrails.\n\n" +
      "2. **Fire Detection (Deep Learning Safety System)**\n" +
      "   - **Tech Stack**: TensorFlow, 18-layer CNN, React, Node/Express\n" +
      "   - **Highlight**: Custom 18-layer CNN trained on 42,000+ images achieving **94% validation accuracy** with real-time live camera feed analysis.\n\n" +
      "3. **AarogyaMitra (AI Healthcare Symptom Triage)**\n" +
      "   - **Tech Stack**: n8n Webhooks, WhatsApp Business API, Claude API, React\n" +
      "   - **Highlight**: Automated patient symptom triage reducing manual intake overhead by 50%; selected among Top Teams nationwide at Anveshan National Round.\n\n" +
      "4. **Tarang Hazard Response (SIH National Finalist - Top 5 in India)**\n" +
      "   - **Tech Stack**: ML Fake-Report Classification, Firebase Realtime Sync, Python\n" +
      "   - **Highlight**: 90%+ accurate ML fake-report detection model with real-time geospatial hazard mapping; awarded Top 5 in India at Smart India Hackathon.\n\n" +
      "5. **FoodBridge (Food Redistribution Platform)**\n" +
      "   - **Tech Stack**: React, Express, MongoDB, Socket.io, AI Quality Verification\n" +
      "   - **Highlight**: Full-stack MERN platform connecting food donors & recipients with live map tracking and AI image quality inspection.";
  }

  // 2. Tool Action: Compare Projects
  if (/compare.*project|table.*project/i.test(question)) {
    return "Here is a side-by-side comparison of my key projects:\n\n" +
      "| Project | Tech Stack | Problem Solved | Technical Highlight |\n" +
      "|---|---|---|---|\n" +
      "| **Moltress** | Electron, RAG, ChromaDB, Neo4j, Fine-Tuned LLM | Enterprise code privacy & search. | Local GraphRAG + Neo4j knowledge graph with offline anti-hallucination. |\n" +
      "| **Fire Detection** | TensorFlow, CNN, React, Node.js | Unreliable fire detection from static images. | Custom 18-layer CNN trained on 42,000+ images (94% accuracy). |\n" +
      "| **AarogyaMitra** | n8n, WhatsApp API, Claude API, React | Manual symptom triage and intake overhead. | WhatsApp-native intake with Claude API cutting overhead by 50%. |\n" +
      "| **FoodBridge** | React, Express, MongoDB, Socket.io | Disconnected food redistribution networks. | Real-time map tracking + AI image food quality checks. |\n" +
      "| **Tarang (SIH Top 5)** | ML, Firebase, Real-time sync | Fake ocean hazard report flooding. | 90%+ accurate fake report classification model. |";
  }

  // 3. Tool Action: Explain Architecture
  if (/explain.*architecture|architecture.*project/i.test(question)) {
    if (/moltress/i.test(question)) {
      return "Let's walk through the architecture of **Moltress**, a local-first enterprise AI desktop assistant:\n\n" +
        "1. **Desktop Shell (Electron)**: Provides an offline-first, privacy-preserving desktop container for enterprise source code & docs.\n" +
        "2. **Vector Store (ChromaDB)**: Local vector database indexing files for semantic similarity search.\n" +
        "3. **Knowledge Graph (Neo4j)**: Structured graph database representing dependencies, code entities, and documentation.\n" +
        "4. **Fine-Tuned Local LLM**: Executes model inference on local hardware without sending data to external APIs.\n" +
        "5. **Anti-Hallucination Guard**: Automated verification pass ensuring answers stay strictly grounded in local context.";
    }
    if (/tarang/i.test(question)) {
      return "Let's walk through the architecture of **Tarang Hazard Response**, an SIH Top 5 national finalist project:\n\n" +
        "1. **Report Ingestion Layer**: Collects community ocean hazard incident reports via web interface.\n" +
        "2. **ML Verification Engine**: Evaluates incoming reports with a custom classification model (**90%+ accuracy**) to filter out fake submissions.\n" +
        "3. **Geospatial & Hotspot Mapping**: Aggregates verified hazard locations onto interactive maps.\n" +
        "4. **Real-Time Data Layer (Firebase)**: Syncs hazard status instantly across emergency response teams.";
    }
    if (/foodbridge/i.test(question)) {
      return "Let's walk through the architecture of **FoodBridge**:\n\n" +
        "1. **React Frontend**: Role-based web interface for donors, recipients, and admins with live map tracking.\n" +
        "2. **Node/Express API & MongoDB**: Handles authentication, listings, and order matching.\n" +
        "3. **AI Quality Inspection**: Automated image check assessing donated food quality.\n" +
        "4. **Real-time Map & Chat**: Live order tracking and Socket.io messaging.";
    }
    if (/aarogyamitra/i.test(question)) {
      return "Let's walk through the architecture of **AarogyaMitra**:\n\n" +
        "1. **Ingestion Layer (WhatsApp Business API)**: Receives patient symptom inputs directly from WhatsApp.\n" +
        "2. **Automation Pipeline (n8n Webhooks)**: Triggers asynchronous workflow pipelines without manual intervention.\n" +
        "3. **Symptom Triage Engine (Claude API)**: Processes symptoms through prompt-engineered medical triage logic.\n" +
        "4. **Patient & Doctor Dashboard (React)**: Displays organized intake data for medical staff review.";
    }
    return "Let's walk through the architecture of **Fire Detection**, a custom deep-learning full-stack application:\n\n" +
      "1. **Client Layer (React)**:\n" +
      "   - Accesses user camera via browser APIs (`getUserMedia`).\n" +
      "   - Projects video frames to canvas and submits regular frame updates to the API.\n" +
      "2. **API Layer (Node/Express)**:\n" +
      "   - Exposes camera stream processing and static image upload endpoints.\n" +
      "   - Manages asynchronous upload buffers and handles classification queries.\n" +
      "3. **Deep Learning Engine (TensorFlow/Keras)**:\n" +
      "   - Feeds image pixels into a custom **18-layer Convolutional Neural Network (CNN)**.\n" +
      "   - Resolves classification scores (fire, smoke, or neutral) in real-time.\n" +
      "4. **Model Performance**:\n" +
      "   - Trained on 42,000+ images to reach **94% validation accuracy**, avoiding overfitting through dropout layers.";
  }

  // 4. Tool Action: Growth Roadmap
  if (/roadmap|suggest.*roadmap|growth/i.test(question)) {
    return "Based on my background in computer science, AI/ML minor, and n8n/React experience, here is a realistic roadmap for my next growth steps:\n\n" +
      "1. **Phase 1: Advanced Agentic AI Frameworks (Short-term)**\n" +
      "   - Move from simple n8n webhooks to multi-agent Python frameworks like CrewAI or LangGraph for autonomous task execution.\n" +
      "2. **Phase 2: Model Optimization & MLOps (Medium-term)**\n" +
      "   - Gain hands-on experience in model serving engines (e.g., vLLM) and quantizing custom models for production deployments.\n" +
      "3. **Phase 3: Production LLM Evaluation & Guardrails (Long-term)**\n" +
      "   - Build strict evaluation metrics (e.g. using Ragas) and deploy automated guardrails to shield customer-facing models from adversarial prompts.";
  }

  // 5. Tool Action: Code Explainer
  if (/explain.*code|code-heavy.*project/i.test(question)) {
    if (/moltress/i.test(question)) {
      return "Let's break down the code structure of **Moltress**:\n\n" +
        "- **Electron Main & Preload (`main.ts`, `preload.ts`)**: Controls native window lifecycle and IPC communication.\n" +
        "- **GraphRAG Pipeline (`graph_rag.py`)**: Interconnects ChromaDB vector queries with Neo4j graph traversal.\n" +
        "- **Local LLM Runner (`inference.py`)**: Interfaces with local model weights and runs anti-hallucination checks.";
    }
    if (/tarang/i.test(question)) {
      return "Let's break down the code structure of **Tarang**:\n\n" +
        "- **ML Classification (`model.py`)**: Preprocesses hazard report text/metadata and predicts authenticity (90%+ accuracy).\n" +
        "- **Firebase Realtime Listener (`mapSync.js`)**: Subscribes to database changes to update map pins in real time.\n" +
        "- **Geospatial Map (`HazardMap.tsx`)**: Renders active hazard hotspots.";
    }
    if (/foodbridge/i.test(question)) {
      return "Let's break down the code structure of **FoodBridge**:\n\n" +
        "- **Backend Controllers (`controllers/foodController.js`)**: Manages donation creation, status transitions, and queries.\n" +
        "- **Socket.io Server (`socket/chat.js`)**: Implements real-time messaging between donor and recipient.\n" +
        "- **AI Verification Hook (`useFoodVerification.ts`)**: Sends images to inference endpoint for quality validation.";
    }
    if (/aarogyamitra/i.test(question)) {
      return "Let's break down the code structure of **AarogyaMitra**:\n\n" +
        "- **n8n Workflow JSON (`workflows/triage.json`)**: Configures webhook nodes, error handling, and payload transformations.\n" +
        "- **Claude Triage Runner (`triageEngine.js`)**: Sends formatted symptom prompts to Claude API and parses structured responses.\n" +
        "- **Patient Dashboard (`PatientList.tsx`)**: Displays real-time triage priority.";
    }
    return "Let's break down the code structure of the **Fire Detection** app:\n\n" +
      "- **CNN Training script (`train.py`)**:\n" +
      "  - Loads and preprocesses 42,000+ images.\n" +
      "  - Configures an 18-layer sequential model in TensorFlow/Keras with convolutional, pooling, dropout, and dense layers.\n" +
      "  - Exports model as a serialized HDF5/SavedModel file.\n" +
      "- **Backend Server (`server.js`)**:\n" +
      "  - Handles routes for uploading images.\n" +
      "  - Executes model predictions using TensorFlow's Node.js binding (`@tensorflow/tfjs-node`).\n" +
      "- **React Client (`App.tsx`)**:\n" +
      "  - Loops camera feed captures and streams canvas image updates to backend asynchronously.";
  }

  // 6. Tool Action: Project Explainer
  if (/explain.*strongest.*project|explain.*project/i.test(question)) {
    if (/moltress/i.test(question)) {
      return "Let's look at **Moltress**, a privacy-preserving local enterprise AI assistant:\n\n" +
        "- **The Problem**: Enterprise teams want an AI assistant that understands their internal codebases and docs — without sending proprietary source code to third-party cloud APIs.\n" +
        "- **The Solution**: Fully offline-first Electron desktop app pairing a fine-tuned LLM with a ChromaDB RAG pipeline and a Neo4j knowledge graph.\n" +
        "- **The Impact**: Complete privacy and zero data egress over enterprise codebases.";
    }
    if (/tarang/i.test(question)) {
      return "Let's look at **Tarang**, an ocean hazard response platform:\n\n" +
        "- **The Problem**: False or fake incident reports flood emergency response systems during disasters.\n" +
        "- **The Solution**: Built an ML model achieving **90%+ accuracy** for fake-report detection with real-time Firebase map sync.\n" +
        "- **The Impact**: Awarded **Top 5 in India** at the Smart India Hackathon (SIH) National Finals.";
    }
    if (/foodbridge/i.test(question)) {
      return "Let's look at **FoodBridge**, a food redistribution platform:\n\n" +
        "- **The Problem**: Surplus food donors and recipients exist on disconnected sides without real-time coordination.\n" +
        "- **The Solution**: Full MERN stack app featuring AI image quality checks, real-time chat, and live map tracking.\n" +
        "- **The Impact**: End-to-end operational platform connecting food donors and recipients safely.";
    }
    return "Let's look at **AarogyaMitra**, an AI healthcare platform for symptom triage:\n\n" +
      "- **The Problem**: Manual intake for triaging symptoms is highly repetitive, slow, and prone to routing errors.\n" +
      "- **The Solution**: Built n8n webhook workflows integrated with the WhatsApp Business API. Symptoms are captured from chat, processed through Claude API triage prompt pipelines, and displayed on a doctor/patient dashboard.\n" +
      "- **The Impact**: Reduced manual onboarding overhead by **50%**, and selected among the top teams nationwide at the Anveshan National Round.";
  }

  // 7. Tool Action: Skill Search
  if (/Search her skills for:\s*(.*)/i.test(question)) {
    const term = question.replace(/Search her skills for:/i, "").trim().toLowerCase();
    const skillsList = [
      "python", "javascript", "typescript", "sql", "dart", "c++", "cpp",
      "machine learning", "ml", "deep learning", "cnn", "generative ai", "genai",
      "rag", "agentic ai", "prompt engineering", "tensorflow", "hugging face",
      "llm pipelines", "react", "node", "express", "mongodb", "firebase", "n8n"
    ];
    if (!term) {
      return "Khushi Borde's skill set includes: Python, JavaScript, TypeScript, SQL, Dart, C++, TensorFlow, React, Node.js, Express, MongoDB, Firebase, and n8n webhook automation. What specific skill would you like to search for?";
    }
    const matched = skillsList.some(s => term.includes(s) || s.includes(term));
    if (matched) {
      return `Yes! Khushi Borde has verified experience with **${term}**. It is featured in her core skillset and used across her key projects (such as *AarogyaMitra* or *Fire Detection*).`;
    } else {
      return `I couldn't find a direct match for **${term}** in Khushi Borde's documented skillset. She is proficient in related areas like Python, React, and general AI/ML engineering, and is highly capable of picking up new technologies quickly.`;
    }
  }

  // 8. Tool Action: Suggested Questions
  if (/highly relevant, non-obvious questions/i.test(question)) {
    return "Here are some highly relevant, technically deep questions you could ask Khushi Borde in an interview:\n\n" +
      "1. **CNN Optimization**: *'How did you design the 18-layer CNN for Fire Detection, and how did you resolve camera processing frame drops in the React interface?'*\n" +
      "2. **Agentic Workflows**: *'What metrics did you track to verify that the Claude symptom triage pipeline cut manual intake overhead by 50% in AarogyaMitra?'*\n" +
      "3. **Geospatial Geosync**: *'How did you implement the real-time hazard hotspot map sync on Firebase for the Tarang ocean hazard response platform?'*\n" +
      "4. **Image Verification**: *'How does FoodBridge verify surplus food quality using AI image checks before accepting donations?'*";
  }

  // 9. Tool Action: Conversation Memory
  if (/context or topics we've discussed so far|conversation memory/i.test(question)) {
    return "In this session, we have been exploring Khushi Borde's candidate profile, with a focus on her AI/ML projects and full-stack capabilities. \n\n" +
      "So far, we have discussed:\n" +
      "- Her core stack: Python, React, n8n, and TensorFlow.\n" +
      "- Her primary projects: *AarogyaMitra* (WhatsApp symptom triage) and *Fire Detection* (18-layer CNN).\n" +
      "- Her strong academic standing (CGPA 9.15) and national hackathon achievements (SIH Top 5).\n\n" +
      "Please let me know if you would like to deep dive into any of these areas!";
  }

  // Direct project queries (e.g., "what about moltress", "and tarang?", "tell me about foodbridge")
  if (/moltress/i.test(question)) {
    return "### **Moltress** (2026 – Present)\n\n" +
      "**Summary**: Local-first enterprise AI desktop assistant.\n\n" +
      "- **Problem**: Enterprise teams need an AI assistant that understands internal codebases and docs without sending proprietary code to third-party cloud APIs.\n" +
      "- **Solution**: An Electron desktop application pairing a fine-tuned LLM with a ChromaDB RAG pipeline and a Neo4j knowledge graph for structured retrieval, plus a built-in hallucination-detection pass — keeping inference fully offline and privacy-preserving.\n" +
      "- **Key Highlights**: GraphRAG architecture, Electron desktop app, ChromaDB, Neo4j, fine-tuned LLM.";
  }

  if (/tarang/i.test(question)) {
    return "### **Tarang Hazard Response Platform** (Smart India Hackathon Top 5 Finalist)\n\n" +
      "**Summary**: AI/ML ocean hazard report verification and real-time mapping platform.\n\n" +
      "- **Problem**: False or fake incident reports flood emergency response systems during ocean hazards.\n" +
      "- **Solution**: An ML model for fake-report detection at **90%+ accuracy**, paired with a Firebase-backed hazard hotspot mapping system with real-time sync.\n" +
      "- **Key Highlights**: Awarded **Top 5 in India** at the SIH National Finals as Team Lead.";
  }

  if (/foodbridge/i.test(question)) {
    return "### **FoodBridge** (Feb 2026 – May 2026)\n\n" +
      "**Summary**: MERN-stack surplus food redistribution platform.\n\n" +
      "- **Problem**: Surplus food from donors and demand from recipients exist on disconnected sides; coordinating them with trust in food quality is key.\n" +
      "- **Solution**: A full MERN-stack platform connecting donors and recipients end-to-end with real-time chat, live map-based order tracking, and AI image-quality checks.\n" +
      "- **Key Highlights**: Full MERN stack (React, Node/Express, MongoDB), Socket.io real-time chat, live map tracking.";
  }

  if (/aarogyamitra/i.test(question)) {
    return "### **AarogyaMitra** (Dec 2025 – Present)\n\n" +
      "**Summary**: AI healthcare platform for symptom triage.\n\n" +
      "- **Problem**: Symptom triage over WhatsApp needs fast, scalable automation; manual intake is slow and prone to errors.\n" +
      "- **Solution**: n8n webhook automation wired to the WhatsApp Business API, with Claude API prompt pipelines for symptom triage — cutting manual overhead by 50%.\n" +
      "- **Key Highlights**: Selected among top teams nationwide at Anveshan National Round; 50% overhead reduction.";
  }

  // Dedicated Internship handler
  if (/internship|internships|intern\b/i.test(question)) {
    return "### **Khushi Borde's AI/ML Internships**\n\n" +
      "Khushi Borde has completed / is actively pursuing the following **AI/ML Internships**:\n\n" +
      "1. **AI/ML Intern — Infosys Springboard** (Aug 2026 – Present)\n" +
      "   - **Focus**: Artificial Intelligence & Machine Learning pipelines, RAG architectures, LLM fine-tuning, and agentic workflows.\n" +
      "   - **Highlights**: Selected for the exclusive AI Empow(h)er advanced program; completed 40+ AI/ML courses on Infosys Springboard.\n\n" +
      "2. **AI & Data Science Intern — Vishwakarma University** (Jun 2026 – Jul 2026)\n" +
      "   - **Focus**: Custom Deep Neural Network (DNN) models on real-world datasets.\n" +
      "   - **Responsibilities**: Owned the full ML pipeline end-to-end — data preprocessing, model training, evaluation, and optimization using Python & TensorFlow.\n\n" +
      "She is actively open to full-time AI/ML internship opportunities, research collaborations, and engineering roles!";
  }

  // Work Experience & Career History handler
  if (/experience|job|work history|career|past roles/i.test(question)) {
    return "### **Khushi Borde's Work Experience & Leadership**\n\n" +
      "#### **1. AI/ML Internships**\n" +
      "- **AI/ML Intern — Infosys Springboard** (Aug 2026 – Present): Deep learning pipelines, RAG architectures, fine-tuning, and agentic AI workflows.\n" +
      "- **AI & Data Science Intern — Vishwakarma University** (Jun 2026 – Jul 2026): Custom deep neural network modeling, dataset preprocessing, and evaluation in Python & TensorFlow.\n\n" +
      "#### **2. Technical Leadership & Community**\n" +
      "- **Team Lead — Smart India Hackathon (SIH)** (Sept – Dec 2025): Led team to **Top 5 in India** at SIH National Finals; engineered 90%+ accurate ML fake-report detection model with real-time Firebase sync.\n" +
      "- **Technical Team Member — Google Developers Group (GDG)** (Dec 2024 – Sept 2025): Facilitated Gen AI Study Jam for 100+ participants; completed GCP MLOps workshop at MIT-WPU.\n\n" +
      "#### **3. Featured Key Projects**\n" +
      "- **Moltress**: Privacy-preserving local enterprise AI assistant (Electron, ChromaDB, Neo4j GraphRAG).\n" +
      "- **AarogyaMitra**: AI healthcare symptom triage platform (n8n webhooks, WhatsApp API, Claude API).\n" +
      "- **Fire Detection**: 18-layer CNN in TensorFlow (94% accuracy) with live camera React frontend.\n" +
      "- **FoodBridge**: MERN-stack food redistribution platform with AI quality checks.";
  }

  if (/education|college|degree|cgpa|study|university|student/i.test(question)) {
    return "Here are the details of Khushi Borde's education:\n\n" +
      "- **Institution**: MGM's Jawaharlal Nehru Engineering College (JNEC)\n" +
      "- **Degree**: B.Tech in Computer Science & Engineering (with a Minor in AI/ML)\n" +
      "- **Dates**: June 2023 – June 2027\n" +
      "- **Academic Performance**: Current CGPA of **9.15**";
  }

  if (/contact|email|phone|github|linkedin/i.test(question)) {
    return "You can contact Khushi Borde through the following channels:\n\n" +
      "- **Email**: khushiborde2@gmail.com\n" +
      "- **Phone**: +91 8010648383\n" +
      "- **GitHub**: [github.com/B-Khushi-2](https://github.com/B-Khushi-2)\n" +
      "- **LinkedIn**: [linkedin.com/in/khushi-borde-759258303](https://linkedin.com/in/khushi-borde-759258303)\n\n" +
      "Feel free to drop her an email or send a message through the contact form on the home page!";
  }

  if (/skill|technology|languages|framework/i.test(question)) {
    return "Khushi Borde's skill set spans AI/ML and Full-Stack Engineering:\n\n" +
      "- **Languages**: Python, JavaScript, TypeScript, SQL, Dart, C++\n" +
      "- **AI / ML**: Machine Learning, Deep Learning (CNN), Generative AI, RAG, Agentic AI, Prompt Engineering, TensorFlow, Hugging Face, LLM Pipelines\n" +
      "- **Full Stack**: React, Node.js, Express, MongoDB, Firebase, Tailwind CSS, Git, n8n webhook automation";
  }

  if (/achievements|award|competition/i.test(question)) {
    return "Some of Khushi Borde's primary achievements include:\n\n" +
      "- **Smart India Hackathon (SIH)**: Awarded **Top 5 in India** at the SIH National Finals as Team Lead for Tarang (Ocean Hazard Response platform).\n" +
      "- **Anveshan National Round**: Selected among the top teams nationwide for AarogyaMitra (WhatsApp symptom triage platform).\n" +
      "- **CGPA**: Maintains a strong academic record of **9.15** in her B.Tech studies.";
  }

  if (/strong.*point|strength|good at|best qualities|why hire/i.test(question)) {
    return "Here are Khushi Borde's primary technical and professional strengths:\n\n" +
      "1. **AI/ML & Deep Learning**: Experienced in training custom models (like an 18-layer CNN in TensorFlow) and building inference pipelines.\n" +
      "2. **Agentic Workflows & Automation**: Proficient in designing Claude API prompt pipelines and n8n webhook automation, reducing manual overhead by 50%.\n" +
      "3. **Full-Stack Engineering**: Capable of building and deploying complete MERN-stack apps (React, Node.js, Express, MongoDB, Socket.io) from scratch.\n" +
      "4. **Proven Leadership**: Demonstrated technical leadership as SIH Team Lead, managing execution to achieve a Top 5 national ranking.";
  }

  if (/tell me about yourself|introduce|who are you|summary|profile/i.test(question)) {
    return "Khushi Borde is an **AI/ML Engineer & Full-Stack Builder** pursuing a B.Tech in Computer Science & Engineering (with a Minor in AI/ML) at MGM's JNEC (CGPA: 9.15).\n\n" +
      "She specializes in turning AI/ML research into production-grade applications — building deep learning models, prompt-engineered pipelines, and automated n8n workflows wrapped in responsive React frontends.\n\n" +
      "Feel free to ask about her projects (like *AarogyaMitra* or *Fire Detection*), skills, timeline, or contact info!";
  }

  if (/weakness|gap|improve/i.test(question)) {
    return "While Khushi Borde has strong technical experience through substantial projects and national hackathons, some honest areas of growth include:\n\n" +
      "1. **Enterprise Scale**: She has limited exposure to multi-year enterprise production environments and large-scale legacy codebases.\n" +
      "2. **Cloud Infrastructure**: While she has deployed projects using Firebase and static hosting, she is looking to gain deeper experience with AWS/GCP and Kubernetes clusters.\n\n" +
      "She is actively learning and looking for internships where she can bridge these gaps!";
  }

  // 10. Tool Action: Interviewer Mode (agent asking questions to the user based on resume)
  if (/interview me|ask me.*question|ask.*interview question|test me/i.test(question)) {
    const questions = [
      "For Khushi's **Fire Detection** project, she built a custom 18-layer CNN that achieved 94% accuracy. How would you design a CNN architecture for real-time edge safety alerts, and what layers/activation functions would you select to minimize latency?",
      "In **AarogyaMitra**, she built an n8n webhook automation and Claude API symptom triage pipeline. How would you design an agentic workflow to handle asynchronous user inputs via a messaging API and route them to different downstream LLM models?",
      "For **Tarang**, she implemented a fake ocean hazard report classification model (90%+ accuracy) with real-time Firebase sync. What strategies would you use to validate incoming data to prevent fake reports or spam in a collaborative geosync system?",
      "In **FoodBridge**, AI image quality checks were used for verifying surplus food before donation. How would you design the image verification pipeline and coordinate donor-recipient matches in real-time?"
    ];
    const index = Math.floor(Math.random() * questions.length);
    return `**[Technical Interview Agent]**\n\nBased on Khushi Borde's resume and projects, here is a technical interview question for you:\n\n${questions[index]}\n\nHow would you approach this problem?`;
  }

  // 11. Tool Action: Interviewer Answer Evaluation
  if (/approach|design|architecture|layer|n8n|webhook|firebase/i.test(question) && messages.some(m => m.role === "assistant" && m.content.includes("Technical Interview Agent"))) {
    return `**[Technical Interview Agent]**\n\nThat's a very solid approach! You correctly highlighted the core architectural choices (such as optimization techniques, modular workflows, or real-time sync strategies).\n\nIn Khushi's actual implementation:\n- For the **Fire Detection CNN**, she optimized the TensorFlow/Keras layers and managed browser camera frames to prevent UI lag.\n- For **AarogyaMitra**, the n8n webhook pipelines decoupled the ingestion from LLM processing to achieve 50% lower overhead.\n\nWould you like to try another resume-based question or evaluate another aspect of her profile?`;
  }

  const chunks = extractRetrievedChunks(messages);

  if (chunks.length === 0) {
    if (/quantum/i.test(question)) {
      return "Quantum computing is a field of computer science focused on developing technology based on the principles of quantum mechanics (such as superposition and quantum entanglement) to solve complex computational problems faster than classical supercomputers.";
    }
    return FALLBACK_LINE;
  }

  // Select the chunk that best matches the target project if specified
  let top = chunks[0];
  const qLower = question.toLowerCase();
  const matchedChunk = chunks.find((c) => {
    const textL = (c.text + " " + (c.label || "")).toLowerCase();
    if (qLower.includes("moltress") && textL.includes("moltress")) return true;
    if (qLower.includes("tarang") && textL.includes("tarang")) return true;
    if (qLower.includes("foodbridge") && textL.includes("foodbridge")) return true;
    if (qLower.includes("aarogyamitra") && textL.includes("aarogyamitra")) return true;
    if (qLower.includes("fire") && textL.includes("fire")) return true;
    return false;
  });
  if (matchedChunk) {
    top = matchedChunk;
  }

  const intro = question
    ? `Here's what I found relevant to "${question.slice(0, 120)}"${question.length > 120 ? "…" : ""}:`
    : "Here's what I found relevant to that:";

  // Strip raw vector-store header metadata (e.g. "Section: Resume > Khushi Borde")
  let cleanText = top.text;
  if (cleanText.startsWith("Section:")) {
    const doubleNewline = cleanText.indexOf("\n\n");
    if (doubleNewline !== -1) {
      cleanText = cleanText.slice(doubleNewline + 2);
    }
  }

  const body = cleanText.length > 700 ? `${cleanText.slice(0, 700).trim()}…` : cleanText;

  const more =
    chunks.length > 1
      ? `\n\nThere's also related information under: ${chunks
          .slice(1, 4)
          .map((c) => c.label)
          .join(", ")}.`
      : "";

  return `${intro}\n\n${body}${more}`;
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
      },
      { once: true }
    );
  });
}

/**
 * Same contract as every other provider: `streamChat({ messages, signal,
 * ... }) -> AsyncGenerator<string>`. Ignores `apiKey`/`baseUrl`/`model`
 * entirely — there's nothing to authenticate to or route.
 *
 * @param {{ messages: {role: string, content: string}[], signal?: AbortSignal }} params
 */
async function* streamChat({ messages, signal }) {
  const reply = composeReply(messages);
  const words = reply.split(/(\s+)/); // keep whitespace tokens so spacing round-trips exactly

  for (const word of words) {
    if (signal?.aborted) {
      throw Object.assign(new Error("Aborted"), { name: "AbortError" });
    }
    yield word;
    // Small delay so the frontend's streaming UI (typing cursor, thinking
    // indicator, etc.) behaves the same way it would against a real
    // streaming provider, instead of the whole reply landing in one tick.
    await sleep(18, signal);
  }
}

module.exports = { name: "mock", streamChat };
