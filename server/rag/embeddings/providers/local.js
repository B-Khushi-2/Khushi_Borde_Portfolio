// ============================================================================
// "local" embedding provider — no API key, no network call.
// ----------------------------------------------------------------------------
// A dependency-free hashing-trick bag-of-words embedding: tokenize ->
// hash each token into one of N fixed buckets -> term-frequency vector ->
// L2-normalize. It's not as semantically rich as a real OpenAI/Gemini
// embedding, but it's a legitimate vector space where cosine similarity
// rewards keyword/topic overlap — good enough to make the RAG pipeline
// fully functional out of the box with zero setup, zero cost, and zero
// external dependency. Swap EMBEDDING_PROVIDER to "openai"/"gemini" (with
// a real key) any time for stronger semantic retrieval; nothing else in
// the app needs to change — same contract as every other provider here.
// ============================================================================

const DIMENSIONS = 2048;

// Common English function words carry almost no topical signal but appear
// in nearly every chunk *and* nearly every question ("what is...", "tell
// me about...", "can you..."). Left in, they dominate the bag-of-words
// vector and drown out the actual keywords ("experience", "projects",
// "skills") that should be driving the match — to the point where a
// generic query like "tell me a joke" was scoring *higher* than a genuine
// one like "what are her skills" purely on stopword overlap. Stripping
// them out is what makes cosine similarity here track real relevance.
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "on", "at", "for", "with", "and", "or", "but", "if",
  "then", "so", "that", "this", "these", "those", "it", "its", "as", "by",
  "from", "about", "into", "over", "after", "before", "can", "could",
  "will", "would", "should", "may", "might", "do", "does", "did", "you",
  "your", "yours", "i", "me", "my", "we", "our", "he", "she", "they",
  "them", "his", "her", "their", "what", "which", "who", "whom", "when",
  "where", "why", "how", "tell", "please", "summarize", "give", "show",
  "have", "has", "had", "am", "not", "any", "all",
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token));
}

// FNV-1a — fast, dependency-free, good distribution for this bucket count.
function hashToken(token) {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function embedOne(text) {
  const vector = new Array(DIMENSIONS).fill(0);
  const tokens = tokenize(text);

  // Unigrams, weighted 1.0
  for (const token of tokens) {
    vector[hashToken(token) % DIMENSIONS] += 1;
  }
  // Bigrams too, weighted lighter — captures a little word-order/context
  // ("recruiter copilot" vs "recruiter" + "copilot" separately) without a
  // real language model.
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]}_${tokens[i + 1]}`;
    vector[hashToken(bigram) % DIMENSIONS] += 0.5;
  }

  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vector.map((v) => v / norm);
}

/**
 * Same contract as every other embeddings provider: embed a batch of
 * texts, return one vector per input in the same order. Purely local
 * computation — `apiKey`/`baseUrl` are accepted but ignored so this
 * still fits the shared `embedTexts({ providerName, model, apiKey,
 * baseUrl })` call site without special-casing it.
 *
 * @param {{ texts: string[] }} params
 * @returns {Promise<number[][]>}
 */
async function embed({ texts }) {
  return texts.map(embedOne);
}

module.exports = { name: "local", embed, DIMENSIONS };
