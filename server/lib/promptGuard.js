// =============================================================================
// server/lib/promptGuard.js — Lightweight pre-filter for the chat pipeline.
// -----------------------------------------------------------------------------
// Runs BEFORE any LLM call and catches two distinct threat classes:
//
//   1. Prompt-injection attempts  — messages that try to override system
//      instructions, reveal the system prompt, or jailbreak the assistant.
//
//   2. Clearly off-topic content  — messages that are unambiguously unrelated
//      to a professional portfolio context (e.g. write me malware, extreme
//      political debate requests, explicit content requests).
//
// Design principle: bias strongly toward ALLOWING through.
// ─────────────────────────────────────────────────────────────────────────────
// • The LLM already has grounding rules in the system prompt that cover the
//   vast majority of misdirection.  This guard only catches the highest-signal,
//   lowest-false-positive patterns.
// • Ambiguous or borderline messages are NEVER blocked here — they pass through
//   to the LLM which is much better at handling nuance.
// • Each flagged request is logged via pino so you can monitor abuse patterns
//   without affecting legitimate users.
//
// Adding a new rule: append to INJECTION_PATTERNS or OFF_TOPIC_PATTERNS below.
// Rules are matched case-insensitively against the full user message text.
// Short-circuit on FIRST match — more specific rules go first.
// =============================================================================

const logger = require("./logger");

// ── Canned decline responses ──────────────────────────────────────────────────

const INJECTION_DECLINE =
  "I'm here to help you learn about Khushi Borde's portfolio, skills, and experience. " +
  "I can't help with requests that ask me to override my instructions or reveal internal details. " +
  "Feel free to ask anything about her background!";

const OFF_TOPIC_DECLINE =
  "I'm a specialist assistant focused on Khushi Borde's portfolio and professional background. " +
  "That topic is a bit outside my scope — but I'm happy to answer questions about her skills, " +
  "projects, experience, or how to get in touch.";

// ── Rule definitions ──────────────────────────────────────────────────────────
//
// Each rule is: { pattern: RegExp, type: "injection" | "off_topic", label: string }
//
// Keep rules TIGHT.  Don't add anything that could plausibly appear in a
// legitimate recruiter question.

/** @type {Array<{ pattern: RegExp, type: string, label: string }>} */
const INJECTION_PATTERNS = [
  // Classic override / jailbreak phrases
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier|your)\s+(instructions?|rules?|prompts?|context|system\s+prompt)/i,
    type: "injection",
    label: "ignore-previous-instructions",
  },
  {
    pattern: /disregard\s+(?:\w+\s+){0,2}(instructions?|rules?|prompts?|constraints?)/i,
    type: "injection",
    label: "disregard-instructions",
  },
  {
    pattern: /forget\s+(all\s+)?(previous|prior|your)\s+(instructions?|rules?|constraints?|context)/i,
    type: "injection",
    label: "forget-instructions",
  },
  {
    pattern: /\byou\s+are\s+now\s+(a\s+|an\s+)?(new|different|unrestricted|free|jailbroken|DAN)\b/i,
    type: "injection",
    label: "persona-override",
  },
  {
    pattern: /\bact\s+as\s+(if\s+you\s+are\s+|a\s+|an\s+)?(?:unrestricted|jailbroken|DAN|evil|uncensored|unfiltered)\b/i,
    type: "injection",
    label: "act-as-jailbreak",
  },
  {
    pattern: /\bDAN\b.*\bdo\s+anything\s+now\b/i,
    type: "injection",
    label: "DAN-jailbreak",
  },
  // System-prompt extraction
  {
    pattern: /reveal\s+(your\s+)?(system\s+prompt|initial\s+prompt|instructions?|prompt\s+template|hidden\s+instructions?)/i,
    type: "injection",
    label: "reveal-system-prompt",
  },
  {
    pattern: /show\s+(me\s+)?(your\s+)?(system\s+prompt|initial\s+prompt|full\s+prompt|hidden\s+context)/i,
    type: "injection",
    label: "show-system-prompt",
  },
  {
    pattern: /print\s+(your\s+)?(system\s+prompt|instructions?|full\s+(?:instructions?|prompt|context)|hidden\s+instructions?)/i,
    type: "injection",
    label: "print-system-prompt",
  },
  {
    pattern: /what\s+(is|are|were)\s+your\s+(system\s+prompt|original\s+instructions?|full\s+instructions?|base\s+instructions?)/i,
    type: "injection",
    label: "query-system-prompt",
  },
  // Injection via pretend/roleplay framing
  {
    pattern: /pretend\s+(you\s+)?(have\s+)?(no\s+)?(restrictions?|limits?|rules?|guidelines?)/i,
    type: "injection",
    label: "pretend-no-restrictions",
  },
  {
    pattern: /\[?(system|sys|admin|developer|owner)\]?\s*:\s*(?:new\s+)?instructions?/i,
    type: "injection",
    label: "fake-system-turn",
  },
  // Adversarial context stuffing
  {
    pattern: /\{+\s*system\s*:/i,
    type: "injection",
    label: "context-stuffing-system",
  },
  {
    pattern: /<\s*system\s*>/i,
    type: "injection",
    label: "xml-system-tag",
  },
];

/** @type {Array<{ pattern: RegExp, type: string, label: string }>} */
const OFF_TOPIC_PATTERNS = [
  // Malware / hacking / illegal activity — very specific phrasing only
  {
    pattern: /(?:write|create|generate|give\s+me|build)\s+(?:me\s+)?(?:a\s+)?(?:ransomware|malware|virus|trojan|keylogger|exploit|sql\s+injection\s+code|phishing\s+(?:email|page|kit))/i,
    type: "off_topic",
    label: "malware-request",
  },
  {
    pattern: /\bhow\s+(?:do\s+i|to|can\s+i)\s+hack\s+(?:into\s+)?(?:a|an|the)\s+(?:server|database|website|account|system|network)/i,
    type: "off_topic",
    label: "hacking-howto",
  },
  // Explicit content
  {
    pattern: /(?:write|generate|create|describe|produce)\s+(?:some\s+|any\s+)?(?:(?:explicit|sexual|adult|nsfw|erotic|pornographic)\s+){1,2}(?:content|story|stories|scene|material|image|images)/i,
    type: "off_topic",
    label: "explicit-content-request",
  },
  // Bomb / weapon making — very literal phrasing
  {
    pattern: /how\s+(?:do\s+i|to)\s+(?:make|build|create|assemble)\s+(?:a\s+)?(?:bomb|explosive|weapon\s+of\s+mass|improvised\s+explosive)/i,
    type: "off_topic",
    label: "weapon-making",
  },
];

// ── Public interface ──────────────────────────────────────────────────────────

/**
 * Scans the most-recent user message in `messages` against all guard rules.
 *
 * Returns:
 *   { blocked: false }                       — message is clean, continue normally
 *   { blocked: true, decline: string, ... }  — message is flagged; send `decline` as the reply
 *
 * @param {Array<{ role: string, content: string }>} messages
 * @param {{ ip?: string }} [meta]  — optional request metadata for log enrichment
 * @returns {{ blocked: boolean, decline?: string, type?: string, label?: string }}
 */
function checkPromptGuard(messages, meta = {}) {
  // Find the most recent user turn
  let userText = "";
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      userText = messages[i].content;
      break;
    }
  }

  if (!userText) return { blocked: false };

  // Injection rules take priority
  for (const rule of INJECTION_PATTERNS) {
    if (rule.pattern.test(userText)) {
      logger.warn(
        {
          guardType: rule.type,
          guardLabel: rule.label,
          // Log first 120 chars only — avoid storing PII or full payloads in logs
          messagePreview: userText.slice(0, 120),
          ip: meta.ip,
        },
        "prompt-guard: injection attempt flagged and declined"
      );
      return {
        blocked: true,
        decline: INJECTION_DECLINE,
        type: rule.type,
        label: rule.label,
      };
    }
  }

  // Off-topic rules
  for (const rule of OFF_TOPIC_PATTERNS) {
    if (rule.pattern.test(userText)) {
      logger.warn(
        {
          guardType: rule.type,
          guardLabel: rule.label,
          messagePreview: userText.slice(0, 120),
          ip: meta.ip,
        },
        "prompt-guard: off-topic request flagged and declined"
      );
      return {
        blocked: true,
        decline: OFF_TOPIC_DECLINE,
        type: rule.type,
        label: rule.label,
      };
    }
  }

  return { blocked: false };
}

/**
 * Convenience helper: produces an async generator that yields a single
 * decline text chunk, exactly matching the shape `streamReply` yields for
 * normal responses.  The caller can yield* this directly.
 *
 * @param {string} declineText
 * @param {string} [label]
 * @yields {string}
 */
async function* yieldDecline(declineText, label = "guard") {
  // Emit a synthetic route so the frontend Intelligence Panel still updates
  yield `__ROUTE__:BLOCKED`;
  yield `__TOPICS__:${JSON.stringify(["security"])}`;
  yield `__AGENTS__:${JSON.stringify([])}`;
  yield `__PLAN__:${JSON.stringify([`Prompt guard [${label}] triggered — returning canned decline`])}`;
  yield `__RAG_METRICS__:${JSON.stringify([])}`;
  // Yield the decline text as a single delta
  yield declineText;
  yield `__PROVIDER__:guard`;
  yield `__FOLLOW_UPS__:${JSON.stringify([])}`;
}

module.exports = { checkPromptGuard, yieldDecline, INJECTION_DECLINE, OFF_TOPIC_DECLINE };
