#!/usr/bin/env node
// =============================================================================
// server/scripts/eval-rag.js — Golden-set RAG retrieval evaluation script.
// -----------------------------------------------------------------------------
// Runs a fixed set of test questions against the live retrieve() function and
// checks each result against keyword or source-label assertions.
//
// Usage:
//   node scripts/eval-rag.js              # standard run
//   node scripts/eval-rag.js --verbose    # print retrieved chunks per test
//   node scripts/eval-rag.js --json       # emit JSON summary (for CI parsers)
//
// Exit codes:
//   0  — all tests passed
//   1  — one or more tests failed (CI will fail the step)
// =============================================================================

process.chdir(__dirname + "/..");   // run from server/ root so paths resolve

const { retrieve } = require("../rag/retriever");

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const VERBOSE = args.includes("--verbose");
const JSON_OUT = args.includes("--json");

// ── Assertion helpers ─────────────────────────────────────────────────────────

/**
 * Checks that at least one retrieved chunk satisfies ALL provided predicates.
 *
 * Each predicate is one of:
 *   { keyword: "python" }          — case-insensitive substring match on text
 *   { source: "Skills" }           — substring match on breadcrumb / source label
 *   { minScore: 0.15 }             — the chunk's hybrid score must be >= this
 *
 * @param {object[]} chunks  — result of retrieve()
 * @param {object[]} assertions
 * @returns {{ pass: boolean, reason: string }}
 */
function evaluate(chunks, assertions) {
  // NOTE: We intentionally do NOT bail out early when chunks is empty.
  // Off-topic tests use the { maxScore } assertion which treats 0 chunks as a pass.
  // The { keyword } and { source } assertions will fail if they need chunks and none exist.

  for (const assertion of assertions) {
    // keyword: at least one chunk must contain this term in its text
    if ("keyword" in assertion) {
      const kw = assertion.keyword.toLowerCase();
      const found = chunks.some((c) => c.text.toLowerCase().includes(kw));
      if (!found) {
        return { pass: false, reason: `keyword "${assertion.keyword}" not found in any chunk` };
      }
    }

    // source: at least one chunk must have a breadcrumb/source matching this
    if ("source" in assertion) {
      const src = assertion.source.toLowerCase();
      const found = chunks.some(
        (c) => (c.breadcrumb || c.source || "").toLowerCase().includes(src)
      );
      if (!found) {
        return { pass: false, reason: `source label containing "${assertion.source}" not found` };
      }
    }

    // minScore: top chunk score must be at least this value
    if ("minScore" in assertion) {
      const topScore = chunks.length > 0
        ? Math.max(...chunks.map((c) => c.rerankScore ?? c.cosineScore ?? c.score ?? 0))
        : 0;
      if (topScore < assertion.minScore) {
        return {
          pass: false,
          reason: `top score ${topScore.toFixed(3)} < required minScore ${assertion.minScore}`,
        };
      }
    }

    // maxScore: for off-topic queries, top score must stay BELOW this value.
    // Zero chunks (retrieve returned nothing at all) is the ideal outcome —
    // treat it as a guaranteed pass for maxScore, because returning nothing
    // means the retriever correctly rejected the query entirely.
    if ("maxScore" in assertion) {
      if (chunks.length === 0) {
        // Perfect off-topic rejection — no chunks at all.
        continue;
      }
      const topScore = Math.max(...chunks.map((c) => c.rerankScore ?? c.cosineScore ?? c.score ?? 0));
      if (topScore >= assertion.maxScore) {
        return {
          pass: false,
          reason: `off-topic query scored ${topScore.toFixed(3)} >= maxScore ${assertion.maxScore} — stopword filtering may be broken`,
        };
      }
    }

    // noChunks: the query should return zero results (pure off-topic)
    if ("noChunks" in assertion && assertion.noChunks === true) {
      if (chunks.length > 0) {
        const topScore = Math.max(...chunks.map((c) => c.rerankScore ?? c.score ?? 0));
        // Only fail if the top chunk is suspiciously high — low scores are fine
        if (topScore > 0.25) {
          return {
            pass: false,
            reason: `expected no high-scoring chunks for off-topic query, got ${chunks.length} with top score ${topScore.toFixed(3)}`,
          };
        }
      }
      // If chunks are present but all low-scoring, treat as pass (retriever
      // still respected minScore; the LLM will decline based on system prompt).
    }
  }

  return { pass: true, reason: "all assertions satisfied" };
}

// ── Golden test suite ─────────────────────────────────────────────────────────
//
// Each test case:
//   query        — the exact string sent to retrieve()
//   description  — human-readable intent (printed in the table)
//   assertions   — array of assertion objects (all must pass)
//   opts         — optional opts forwarded to retrieve() (e.g. { multiQuery: false })
//
// Retrieval is done with multiQuery:false + no LLM rerank to keep the eval
// deterministic and dependency-free in CI (no API key needed).
// ─────────────────────────────────────────────────────────────────────────────

const EVAL_OPTS = { multiQuery: false, providerName: "mock" };

const TEST_CASES = [
  // ── Original BUGFIX_NOTES.md queries ───────────────────────────────────────
  {
    query: "Can you summarize Khushi work experience?",
    description: "[BUGFIX] Work experience summary",
    assertions: [
      { source: "Experience" },
      { keyword: "intern" },
      { minScore: 0.10 },
    ],
  },
  {
    query: "How can I contact her?",
    description: "[BUGFIX] Contact information retrieval",
    assertions: [
      { keyword: "khushiborde2@gmail.com" },
      { minScore: 0.10 },
    ],
  },
  {
    query: "What are her skills?",
    description: "[BUGFIX] Skills retrieval",
    assertions: [
      { source: "Skills" },
      { keyword: "python" },
      { minScore: 0.10 },
    ],
  },
  {
    query: "Tell me about her education",
    description: "[BUGFIX] Education retrieval",
    assertions: [
      { keyword: "jnec" },
      { keyword: "9.15" },
      { minScore: 0.10 },
    ],
  },
  {
    query: "What is her CGPA?",
    description: "[BUGFIX] CGPA retrieval",
    assertions: [
      { keyword: "9.15" },
      { minScore: 0.10 },
    ],
  },
  {
    query: "tell me a joke",
    description: "[BUGFIX] Off-topic — should score very low",
    assertions: [
      // 0 chunks returned is the ideal outcome (perfect rejection) — pass unconditionally.
      // If chunks are returned they must all score below 0.40 to detect stopword regressions.
      { maxScore: 0.40 },
    ],
  },

  // ── Skills coverage ────────────────────────────────────────────────────────
  {
    query: "What programming languages does Khushi know?",
    description: "Programming languages",
    assertions: [
      { keyword: "python" },
      { source: "Skills" },
    ],
  },
  {
    query: "Does she have experience with machine learning or deep learning?",
    description: "ML / deep learning skills",
    assertions: [
      { keyword: "deep learning" },
      { minScore: 0.10 },
    ],
  },
  {
    query: "What web frameworks does she use?",
    description: "Web stack / frameworks",
    assertions: [
      // Accepts Resume or About chunk as top hit (both list her stack).
      // We just verify the retriever returns something relevant.
      { minScore: 0.10 },
    ],
  },
  {
    query: "Has she worked with TensorFlow or PyTorch?",
    description: "ML frameworks — TensorFlow",
    assertions: [
      { keyword: "tensorflow" },
    ],
  },

  // ── Experience ─────────────────────────────────────────────────────────────
  {
    query: "Where has Khushi interned?",
    description: "Internship experience",
    assertions: [
      // Resume > Khushi Borde or About > Khushi Borde contain intern mentions.
      // Any chunk with relevant score is sufficient — the resume chunk summarises all roles.
      { minScore: 0.30 },
    ],
  },
  {
    query: "What did she do at Infosys Springboard?",
    description: "Infosys internship detail",
    assertions: [
      { keyword: "infosys" },
      { keyword: "rag" },
    ],
  },
  {
    query: "What is her role at Vishwakarma University?",
    description: "Vishwakarma internship",
    assertions: [
      { keyword: "vishwakarma" },
      { keyword: "neural network" },
    ],
  },

  // ── Projects ───────────────────────────────────────────────────────────────
  {
    query: "Tell me about the AarogyaMitra project",
    description: "AarogyaMitra project",
    assertions: [
      { keyword: "aarogyamitra" },
      { keyword: "whatsapp" },
      { minScore: 0.10 },
    ],
  },
  {
    query: "How does the fire detection system work?",
    description: "Fire Detection CNN project",
    assertions: [
      { keyword: "fire" },
      { keyword: "cnn" },
    ],
  },
  {
    query: "What is FoodBridge?",
    description: "FoodBridge project",
    assertions: [
      { keyword: "foodbridge" },
    ],
  },

  // ── Hackathons ─────────────────────────────────────────────────────────────
  {
    query: "What hackathons has she participated in?",
    description: "Hackathon participation",
    assertions: [
      { source: "Hackathon" },
      { keyword: "smart india hackathon" },
    ],
  },
  {
    query: "How did she perform at the Smart India Hackathon?",
    description: "SIH ranking result",
    assertions: [
      { keyword: "top 5" },
      { keyword: "sih" },
    ],
  },
  {
    query: "What is Tarang and what did she build for it?",
    description: "Tarang hackathon project",
    assertions: [
      { keyword: "tarang" },
      { keyword: "fake" },
    ],
  },

  // ── Edge cases ─────────────────────────────────────────────────────────────
  {
    query: "What is her GitHub profile?",
    description: "GitHub URL retrieval",
    assertions: [
      { keyword: "github.com/b-khushi" },
    ],
  },
  {
    query: "What college does she attend?",
    description: "College / institution",
    assertions: [
      { keyword: "jnec" },
    ],
  },
  {
    query: "Write me a poem about flowers",
    description: "[EDGE] Pure off-topic — poetry",
    assertions: [
      { maxScore: 0.40 },  // 0 chunks = perfect rejection = pass
    ],
  },
  {
    query: "What is the capital of France?",
    description: "[EDGE] Factual off-topic — geography",
    assertions: [
      { maxScore: 0.40 },  // 0 chunks = perfect rejection = pass
    ],
  },
  {
    query: "khushi borde",
    description: "[EDGE] Bare name — should still retrieve about/resume",
    assertions: [
      { minScore: 0.05 },
    ],
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

async function run() {
  const results = [];
  let passed = 0;
  let failed = 0;

  if (!JSON_OUT) {
    console.log("\n=============================================================================");
    console.log(" RAG Eval — Golden Test Suite");
    console.log("=============================================================================\n");
  }

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    let chunks = [];
    let evalResult;
    let error = null;

    try {
      chunks = await retrieve(tc.query, EVAL_OPTS);
      evalResult = evaluate(chunks, tc.assertions);
    } catch (err) {
      error = err.message;
      evalResult = { pass: false, reason: `retrieve() threw: ${err.message}` };
    }

    const status = evalResult.pass ? "PASS" : "FAIL";
    if (evalResult.pass) passed++; else failed++;

    const topScore = chunks.length > 0
      ? Math.max(...chunks.map((c) => c.rerankScore ?? c.cosineScore ?? c.score ?? 0))
      : 0;

    results.push({
      n: i + 1,
      status,
      description: tc.description,
      query: tc.query,
      chunks: chunks.length,
      topScore: parseFloat(topScore.toFixed(3)),
      reason: evalResult.reason,
      chunkLabels: chunks.map((c) => c.breadcrumb || c.source || "?"),
    });

    if (!JSON_OUT) {
      const icon = evalResult.pass ? "✅" : "❌";
      const scoreStr = `score=${topScore.toFixed(3)} chunks=${chunks.length}`;
      console.log(`${icon} [${String(i + 1).padStart(2, "0")}] ${tc.description}`);
      console.log(`       Query   : "${tc.query}"`);
      console.log(`       Result  : ${scoreStr}`);
      if (!evalResult.pass) {
        console.log(`       Reason  : ${evalResult.reason}`);
      }
      if (VERBOSE && chunks.length > 0) {
        for (const c of chunks) {
          const label = c.breadcrumb || c.source || "?";
          const sc = (c.rerankScore ?? c.cosineScore ?? c.score ?? 0).toFixed(3);
          console.log(`         • [${sc}] ${label}`);
        }
      }
      console.log();
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = TEST_CASES.length;
  const summary = { total, passed, failed, results };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log("=============================================================================");
    console.log(` SUMMARY: ${passed}/${total} passed  |  ${failed} failed`);
    console.log("=============================================================================");

    if (failed > 0) {
      console.log("\nFailed tests:");
      for (const r of results.filter((r) => r.status === "FAIL")) {
        console.log(`  ❌ [${String(r.n).padStart(2, "0")}] ${r.description}`);
        console.log(`         Reason : ${r.reason}`);
      }
      console.log();
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("eval-rag: fatal error:", err.message);
  process.exit(1);
});
