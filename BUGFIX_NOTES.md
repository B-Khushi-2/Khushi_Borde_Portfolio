# RAG Chatbot Bugfix Notes

Audit performed by walking the full pipeline end-to-end (booted the real
server, hit `/api/chat/stream` over HTTP, and called `retrieve()` directly)
rather than just reading the code. Three real, reproducible bugs were found
and fixed — all in the "Embedding & Chunker" and "Retriever & Vector Store"
layers, which is why the bot was retrieving nothing (or the wrong thing) for
almost every real question.

## Bug 1 — `RAG_MIN_SCORE` threshold too high for the local embedder
**File:** `server/config/env.js`

The built-in zero-setup `local` (bag-of-words hashing) embedding provider
produces much lower cosine-similarity scores than a real semantic embedder —
a genuine, correct match typically scored **0.10–0.25**, not 0.7+. The
default `RAG_MIN_SCORE` was `0.2`, sitting in the middle of that range, so
`retrieve()` silently returned **zero chunks** for most real, answerable
questions ("summarize her work experience", "contact information", "tell me
about her education"). The bot correctly fell back to "I don't have that
information" every time — which is exactly the symptom reported.

**Fix:** lowered the default to `0.08`, chosen empirically against this
knowledge base (verified every real query below now returns hits, while
clearly off-topic queries still score near zero).

## Bug 2 — no stopword filtering in the local embedder
**File:** `server/rag/embeddings/providers/local.js`

The tokenizer didn't strip common function words ("the", "is", "you",
"can", "tell"...). Since those words appear in nearly every chunk *and*
nearly every question, they dominated the bag-of-words vectors — bad enough
that a completely off-topic query like *"tell me a joke"* was scoring
**higher** than a genuinely relevant one like *"what are her skills"*,
purely from stopword overlap.

**Fix:** added a stopword list and filtered tokens before hashing. Also
bumped the hash space from 512 → 2048 buckets to reduce collision noise
between unrelated terms (a real, if secondary, source of mismatched
scores at the original bucket count).

## Bug 3 — mock LLM provider silently dropped the top retrieved chunk
**File:** `server/lib/llm/providers/mock.js`

This is the bug that made "How can I contact her?" fail even after fixes
1–2, despite `retrieve()` correctly finding the contact-info chunk.

`extractRetrievedChunks()` located the context block with
`system.content.indexOf("RETRIEVED CONTEXT")` — but that exact phrase also
appears earlier in the system prompt, inside ground rule #1's quoted text
("...using ONLY the information inside the *RETRIEVED CONTEXT* block...").
`indexOf` matched that first (wrong) occurrence, so the extracted block
started mid-sentence in the rules text, not at the real context header. On
top of that, even after switching to `lastIndexOf`, the block still included
the header line itself ("RETRIEVED CONTEXT (ranked by relevance...):")
before the first `[1] (...)` chunk — and the chunk-parsing regex requires
the string to *start* with `[N]`, so it never matched.

Net effect: **the single highest-relevance chunk was silently dropped on
every request**, and any query that only retrieved one chunk (like a
narrow, specific question) got the "I don't have that information" fallback
even when the correct answer was sitting right there in the prompt.

**Fix:** switched to `lastIndexOf` (the real context block is always
appended last) and explicitly stripped the header line before parsing
chunks.

Note: this bug only affects the `mock` provider (the zero-setup dev/test
fallback) — the real OpenAI/Gemini providers receive the full, correct
system prompt as-is via `chatService.js` and were never affected by this
particular bug. It was still worth fixing since `mock` is the only path
testable without live network access to the LLM providers, and it's the
first thing anyone running `npm run dev` with a fresh `.env` will see.

## Verified after fixes (via `mock` provider, full HTTP + SSE stack)
| Query | Before | After |
|---|---|---|
| "Can you summarize Khushi work experience?" | ❌ "I don't have that information" | ✅ relevant content |
| "How can I contact her?" | ❌ "I don't have that information" | ✅ contact info |
| "What are her skills?" | ❌ "I don't have that information" | ✅ skills list |
| "Tell me about her education" | ❌ "I don't have that information" | ✅ degree/college/CGPA |
| "What is her CGPA?" | ❌ "I don't have that information" | ✅ correct answer |
| "tell me a joke" (off-topic) | scored *higher* than real matches | correctly low-scoring, model declines per prompt rule #4 |

## What wasn't changed, and why
- **`server/rag/vectorStore.js`, `retriever.js`, `chunker.js`,
  `promptTemplates.js`, `chatService.js`, `sse.js`, `api/chat.js`,
  `streamChat.ts`, `useCopilotChat.ts`** — read closely, exercised with
  real requests, and found correct. Cosine similarity, provider/model
  consistency checks, SSE framing (both server write side and client parse
  side), and React state patching all behave as intended.
- **Real Gemini/OpenAI network calls** couldn't be exercised in the review
  sandbox (network egress there is restricted to package registries, not
  `generativelanguage.googleapis.com`/`api.openai.com`). The provider code
  was reviewed line-by-line against each API's documented contract and
  looks correct, but test it against the live APIs from your own machine
  before relying on it in production.

## One known, honest limitation (not a bug — a design tradeoff)
The zero-setup `local` embedder is a dependency-free bag-of-words hash —
it has no real semantic understanding, and its cosine scores have a mild
"shorter chunk wins" length bias (a short contact-info chunk can slightly
outrank a longer, more substantively relevant chunk on some phrasings).
It's now meaningfully better and reliably surfaces the right general area
of the knowledge base, but it isn't as sharp as a real embedding model.

**Recommended next step for production-quality retrieval:** you already
have a working `GEMINI_API_KEY` in `.env`. Since your knowledge base is
tiny, switching costs nothing but one env change + one rebuild:

```bash
# server/.env
EMBEDDING_PROVIDER=gemini

# then, from server/:
npm run kb:build
```

Real Gemini embeddings (`text-embedding-004`) will resolve the residual
ranking quirks entirely — no other code changes needed, the whole pipeline
was built to swap providers with zero other changes.

## Security note
Your uploaded `.env` contains a live `GEMINI_API_KEY`. It's good practice
to rotate any key that's been shared outside your own machine/CI, and to
confirm `.env` is in `.gitignore` so it's never committed.
