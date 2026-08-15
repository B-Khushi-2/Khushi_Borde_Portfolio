# Recruiter Copilot — RAG architecture

This document explains how the portfolio was turned into a retrieval-augmented
knowledge base, so the AI Recruiter Copilot answers **only** from real,
sourced content about Khushi Borde — never from the model's own training data.

## Why RAG, and why this design

The chat backend already existed (`server/api/chat.js`, `server/lib/llm/*`)
but shipped with a plain system prompt and zero real knowledge — the old
`chatService.js` comment said it outright: *"Deliberately minimal — no
résumé/project data is injected here yet."* Anything specific it "answered"
would have been a guess. RAG fixes that by giving the model a fixed,
verifiable set of facts to draw from for every reply, and an explicit
instruction (backed by a scoring threshold) to say "I don't know" rather
than invent something plausible-sounding.

## Pipeline overview

```
public/legacy/data.js  (the single source of truth — same data the
      │                 portfolio UI itself renders from)
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE MARKDOWN KNOWLEDGE                                 │
│    server/scripts/generate-knowledge.js                      │
│    → server/data/knowledge/*.md                              │
│      about · skills · projects · experience ·                │
│      achievements · hackathons · resume                      │
└─────────────────────────────────────────────────────────────┘
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CHUNKING                                                  │
│    server/rag/chunker.js                                     │
│    Splits each .md file on heading boundaries first           │
│    (one project / one role / one achievement per section),    │
│    then on character windows if a section is still too long.  │
│    Every chunk keeps its heading breadcrumb inline.            │
└─────────────────────────────────────────────────────────────┘
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. EMBEDDINGS                                                 │
│    server/rag/embeddings/  (index.js + providers/*.js)        │
│    Same provider-registry pattern as the existing chat LLM     │
│    abstraction. OpenAI (text-embedding-3-small) or Gemini      │
│    (text-embedding-004) — picked by EMBEDDING_PROVIDER.        │
└─────────────────────────────────────────────────────────────┘
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. VECTOR DATABASE                                            │
│    server/rag/vectorStore.js                                  │
│    Flat JSON file: chunk text + metadata + embedding vector.   │
│    Loaded into memory, searched by cosine similarity.          │
│    → server/data/index/store.json                             │
└─────────────────────────────────────────────────────────────┘
      ▼  (built once, offline, by `npm run kb:build`)
      │
      │  ── at request time ──────────────────────────────────
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. RETRIEVER                                                  │
│    server/rag/retriever.js                                    │
│    Embeds the user's latest question with the SAME provider/  │
│    model the index was built with, searches the store, keeps  │
│    only chunks above RAG_MIN_SCORE, returns top RAG_TOP_K.     │
└─────────────────────────────────────────────────────────────┘
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. PROMPT TEMPLATES                                            │
│    server/rag/promptTemplates.js                               │
│    Wraps retrieved chunks (or an explicit "nothing found"      │
│    marker) + strict grounding rules into one system prompt.    │
└─────────────────────────────────────────────────────────────┘
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. LLM (existing chat provider abstraction, unchanged)          │
│    server/lib/llm/chatService.js now calls retrieve() before    │
│    calling the provider — same OpenAI/Gemini streaming code     │
│    as before, just fed a grounded prompt instead of a bare one. │
└─────────────────────────────────────────────────────────────┘
```

## Preventing hallucination — the three-layer approach

1. **Retrieval gate (`RAG_MIN_SCORE`).** A chunk only reaches the prompt if
   its cosine similarity to the question clears a threshold (default `0.2`).
   Off-topic questions ("what's her favorite pizza topping?") score low
   against every chunk and get filtered out before the model ever sees them.
2. **Explicit "nothing found" context.** If nothing clears the bar,
   `promptTemplates.js` inserts a literal *"No relevant information was
   found in the knowledge base for this question"* line — there's never an
   empty context section for the model to improvise into.
3. **Prompt-level rules.** The system prompt tells the model, in order: use
   only the retrieved block; use an exact fallback sentence when the
   context doesn't cover the question; never invent numbers, dates,
   employers, or outcomes; decline anything off-topic.

No combination of these makes hallucination *impossible* — that's not a
solvable problem with prompting alone — but together they make an
ungrounded answer require the model to actively override three
independent, deliberate obstacles, rather than there being nothing in its
way at all.

## Data flow at request time

```
POST /api/chat/stream  { messages: [...] }
        │
        ▼
api/chat.js  (unchanged: validates body, sets up SSE/abort)
        │
        ▼
chatService.streamReply()
        │
        ├─▶ chatService.buildMessages(messages)
        │        │
        │        ├─▶ latestUserMessage(messages)   // what to retrieve for
        │        ├─▶ retriever.retrieve(query)      // steps 5 above
        │        └─▶ promptTemplates.buildSystemPrompt(chunks)  // step 6
        │
        └─▶ provider.streamChat({ messages: [system, ...history] })
                 (openai.js / gemini.js — same providers as before)
```

## Why a flat JSON file instead of a "real" vector database

The knowledge base here is dozens of chunks, not millions — an in-memory
linear cosine-similarity scan is faster than the network round-trip a
hosted vector DB would add, needs no infrastructure to provision or pay
for, and the whole index is one file you can open, diff, or delete and
rebuild. `vectorStore.js` exposes the same shape (`load` / `search` /
`stats`) a Pinecone/Chroma/pgvector client would — if the knowledge base
ever grows enough to need approximate nearest-neighbor search at scale,
only that one file needs to change; `retriever.js` and everything above it
is unaffected.

## Adding a third embeddings provider

Same contract-and-registry pattern the chat LLM abstraction already uses:

1. Write `server/rag/embeddings/providers/<name>.js` exporting
   `{ name, embed({ texts, model, apiKey, baseUrl }) -> Promise<number[][]> }`.
2. Register it in `server/rag/embeddings/index.js`'s `PROVIDERS` map.
3. Add its model env var to `config/env.js`'s `EMBEDDING_MODELS`.

Nothing in `chunker.js`, `vectorStore.js`, `retriever.js`, or
`chatService.js` needs to change.

## Running it

```bash
cd server
npm install
cp .env.example .env       # fill in OPENAI_API_KEY (or GEMINI_API_KEY)

npm run kb:generate        # data.js -> server/data/knowledge/*.md
npm run kb:build           # chunk + embed + write server/data/index/store.json
# or both at once:
npm run kb:rebuild

npm run dev                 # server now answers /api/chat from the KB
```

Re-run `npm run kb:rebuild` any time `public/legacy/data.js` changes —
the copilot's knowledge and the portfolio site's own content come from the
exact same source, so they can't drift apart.
