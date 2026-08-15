const config = require("../config/env");
const { getProvider } = require("../lib/llm");
const logger = require("../lib/logger");

const VALID_ROUTES = new Set(["CANDIDATE_FACT", "META", "GENERAL", "CHITCHAT"]);

/** Heuristic classifier fallback when LLM is unavailable or mock provider active */
function classifyHeuristic(query) {
  const clean = query.trim().toLowerCase();

  // 1. Chitchat
  if (/^(hi|hello|hey|greetings|thanks|thank you|bye|goodbye|good morning|good evening|howdy|sup|how are you|how's it going)\b/i.test(clean) && clean.length < 40) {
    return "CHITCHAT";
  }

  // 2. Meta questions about the chatbot
  if (/(who are you|what can you do|what are your instructions|how do you work|are you an ai|what model are you|what is your system prompt|who built you)/i.test(clean)) {
    return "META";
  }

  // 3. Candidate-specific keywords (including pronouns, verbs, tech & domain terms)
  if (/(khushi|borde|she|her|candidate|applicant|project|experience|skill|resume|education|aarogyamitra|fire detection|foodbridge|tarang|moltress|moltres|sih|smart india hackathon|jnec|btech|internship|hiring|candidacy|cgpa|contact|email|phone|github|linkedin|work|background|built|build|create|created|developed|design|designed|implement|implemented|system|model|app|application|code|tech|technology|computer vision|vision|safety|ai|ml|deep learning|cnn|n8n|bot|chatbot)/i.test(clean)) {
    return "CANDIDATE_FACT";
  }

  // 4. Otherwise general knowledge
  return "GENERAL";
}

/** Extracts 1-3 topic tags per turn for display in the Intelligence Panel */
function extractTopicTags(query) {
  const clean = query.toLowerCase();
  const tags = [];

  if (clean.includes("react")) tags.push("React");
  if (clean.includes("python")) tags.push("Python");
  if (clean.includes("cnn") || clean.includes("deep learning") || clean.includes("fire")) tags.push("Deep Learning");
  if (clean.includes("n8n") || clean.includes("aarogyamitra") || clean.includes("webhook")) tags.push("Automation");
  if (clean.includes("tarang") || clean.includes("sih") || clean.includes("hackathon")) tags.push("Leadership");
  if (clean.includes("experience") || clean.includes("work") || clean.includes("job")) tags.push("Experience");
  if (clean.includes("skill") || clean.includes("stack")) tags.push("Skills");
  if (clean.includes("education") || clean.includes("degree") || clean.includes("cgpa")) tags.push("Education");
  if (clean.includes("contact") || clean.includes("email") || clean.includes("phone")) tags.push("Contact");

  if (tags.length === 0) tags.push("General");
  return Array.from(new Set(tags)).slice(0, 3);
}

function fallbackHeuristicRewrite(query, userMessages = []) {
  if (!userMessages || userMessages.length <= 1) return query;

  const keywords = [
    "Fire Detection",
    "AarogyaMitra",
    "Tarang",
    "FoodBridge",
    "Moltress",
    "React",
    "CNN",
    "Python",
    "SIH"
  ];

  const queryLower = query.toLowerCase();

  // If the query ALREADY mentions a specific project/tech keyword, DO NOT append previous turn's topic!
  const queryHasKeyword = keywords.some((kw) => queryLower.includes(kw.toLowerCase()));
  if (queryHasKeyword) {
    return query;
  }

  // Only append if the query uses ambiguous pronouns or reference words
  const hasVagueRef = /\b(it|its|this|that|the project|the app|the architecture|the stack|the code|tell me more|how about|what about)\b/i.test(queryLower);
  if (!hasVagueRef) {
    return query;
  }

  const previousTurnsText = userMessages
    .slice(-4, -1)
    .map((m) => m.content)
    .join(" ");

  const matchedKeyword = keywords.find((kw) =>
    previousTurnsText.toLowerCase().includes(kw.toLowerCase())
  );

  if (matchedKeyword) {
    return `${query} (regarding ${matchedKeyword} project by Khushi Borde)`;
  }

  return query;
}

/**
 * Consolidated single LLM call for Route Classification, Topic Tag Extraction, and Follow-Up Query Rewriting.
 * Logs explicit path taken ("route: LLM" vs "route: heuristic (no API key)").
 */
async function classifyAndRewrite(userMessages, providerName = config.DEFAULT_PROVIDER) {
  const rawQuery = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : "";
  const heuristicRoute = classifyHeuristic(rawQuery);
  const heuristicTags = extractTopicTags(rawQuery);
  const heuristicRewritten = fallbackHeuristicRewrite(rawQuery, userMessages);

  const startedAt = Date.now();
  const apiKey = config.PROVIDER_API_KEYS[providerName];

  if (!apiKey && providerName !== "mock") {
    const routePath = "route: heuristic (no API key)";
    logger.info({ rawQuery, routePath, route: heuristicRoute, topicTags: heuristicTags }, "classifyAndRewrite stage path decision");
    return {
      route: heuristicRoute,
      topicTags: heuristicTags,
      rewrittenQuery: heuristicRewritten,
      durationMs: Date.now() - startedAt,
      routePath
    };
  }

  const routePath = "route: LLM";
  const recentHistory = userMessages.length > 1
    ? userMessages.slice(-5, -1).map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")
    : "None";

  const systemPrompt = `You are an intent classifier, topic tagger, and query rewriter for an AI portfolio chatbot.
Given the recent conversation history and the latest user query:

1. Classify into EXACTLY ONE route:
   - CANDIDATE_FACT: Questions about the candidate (Khushi Borde), her projects, experience, skills, resume, achievements, or contact info.
   - META: Questions about the chatbot itself or its instructions.
   - GENERAL: General knowledge, science, programming concepts, or trivia unrelated to the candidate.
   - CHITCHAT: Greetings, thanks, polite small talk, or farewells.

2. Extract 1 to 3 short topic tags (e.g. ["React", "Deep Learning"]).

3. If the user message contains pronouns or unresolved references (e.g., "how accurate is it?"), rewrite it into a complete, self-contained standalone search query resolving all pronouns. If already standalone, return the query unchanged.

Output ONLY a single valid JSON object. Do not include markdown formatting, codeblocks, or extra text.
Format: {"route":"CANDIDATE_FACT","topicTags":["React"],"rewrittenQuery":"What is Khushi Borde's experience with React?"}`;

  const userPrompt = `History:\n${recentHistory}\n\nLatest Query: "${rawQuery}"`;

  try {
    const provider = getProvider(providerName);
    const model = config.PROVIDER_MODELS[providerName];

    let responseText = "";
    for await (const chunk of provider.streamChat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model,
      apiKey,
      maxTokens: 100,
      temperature: 0
    })) {
      if (!chunk.startsWith("__")) {
        responseText += chunk;
      }
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let routeVal = (parsed.route || "").trim().toUpperCase().replace(/[^A-Z_]/g, "");
      if (!VALID_ROUTES.has(routeVal)) {
        routeVal = heuristicRoute;
      }
      const topicTags = Array.isArray(parsed.topicTags) && parsed.topicTags.length > 0
        ? parsed.topicTags.slice(0, 3)
        : heuristicTags;
      const rewrittenQuery = parsed.rewrittenQuery && parsed.rewrittenQuery.trim().length > 0
        ? parsed.rewrittenQuery.trim()
        : heuristicRewritten;

      const durationMs = Date.now() - startedAt;
      logger.info({ rawQuery, rawLLMResponse: responseText, parsedRoute: routeVal, topicTags, rewrittenQuery, durationMs, routePath }, "classifyAndRewrite RAW LLM RESPONSE & PARSED ROUTE");

      return { route: routeVal, topicTags, rewrittenQuery, durationMs, routePath };
    }
  } catch (err) {
    const fallbackPath = "route: heuristic (fallback)";
    logger.warn({ err: err.message, query: rawQuery, routePath: fallbackPath }, "classifyAndRewrite failed, falling back to heuristic");
    return {
      route: heuristicRoute,
      topicTags: heuristicTags,
      rewrittenQuery: heuristicRewritten,
      durationMs: Date.now() - startedAt,
      routePath: fallbackPath
    };
  }

  return {
    route: heuristicRoute,
    topicTags: heuristicTags,
    rewrittenQuery: heuristicRewritten,
    durationMs: Date.now() - startedAt,
    routePath: "route: heuristic (default)"
  };
}

module.exports = { classifyAndRewrite, classifyHeuristic, extractTopicTags, VALID_ROUTES };
