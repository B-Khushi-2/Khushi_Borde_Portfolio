// ============================================================================
// Lightweight Okapi BM25 Scorer
// ----------------------------------------------------------------------------
// Calculates Okapi BM25 relevance scores for document records given a query.
// Formula:
//   BM25(D, Q) = sum_{t in Q} IDF(t) * (f(t,D) * (k1 + 1)) / (f(t,D) + k1 * (1 - b + b * (|D| / avgdl)))
//
// Parameters:
//   k1 = 1.2 (term frequency saturation control)
//   b  = 0.75 (document length normalization control)
// ============================================================================

const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
  "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
  "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
  "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
  "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
  "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
  "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
  "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
  "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
  "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
  "they've", "this", "those", "through", "to", "too", "under", "until", "up",
  "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
  "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
  "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
  "yourself", "yourselves"
]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/**
 * Computes BM25 score for each record in records.
 * @param {Array<{text: string, id: string}>} records
 * @param {string} queryText
 * @param {object} [opts]
 * @returns {Array<number>} array of normalized BM25 scores in [0, 1] aligned with records
 */
function scoreBM25(records, queryText, opts = {}) {
  if (!records || records.length === 0 || !queryText) {
    return (records || []).map(() => 0);
  }

  const k1 = opts.k1 ?? 1.2;
  const b = opts.b ?? 0.75;

  const queryTerms = tokenize(queryText);
  if (queryTerms.length === 0) {
    return records.map(() => 0);
  }

  const N = records.length;
  const docTokensList = records.map((r) => tokenize(`${r.breadcrumb || ""} ${r.text || ""}`));
  const docLengths = docTokensList.map((tokens) => tokens.length);
  const avgdl = docLengths.reduce((sum, len) => sum + len, 0) / (N || 1);

  // Document frequency count per term
  const df = {};
  for (const term of queryTerms) {
    let count = 0;
    for (const tokens of docTokensList) {
      if (tokens.includes(term)) count++;
    }
    df[term] = count;
  }

  // Calculate raw BM25 for each document
  const rawScores = docTokensList.map((docTokens, i) => {
    const docLen = docLengths[i];
    const tfMap = {};
    for (const token of docTokens) {
      tfMap[token] = (tfMap[token] || 0) + 1;
    }

    let score = 0;
    for (const term of queryTerms) {
      const n_t = df[term] || 0;
      if (n_t === 0) continue;

      // Robertson-Spärck Jones IDF
      const idf = Math.log((N - n_t + 0.5) / (n_t + 0.5) + 1);
      const tf = tfMap[term] || 0;

      const num = tf * (k1 + 1);
      const denom = tf + k1 * (1 - b + b * (docLen / (avgdl || 1)));

      score += idf * (num / denom);
    }
    return Math.max(score, 0);
  });

  const maxScore = Math.max(...rawScores, 0);
  if (maxScore === 0) {
    return rawScores.map(() => 0);
  }

  // Normalize scores to [0, 1] relative to the max candidate score
  return rawScores.map((score) => parseFloat((score / maxScore).toFixed(4)));
}

module.exports = { scoreBM25, tokenize };
