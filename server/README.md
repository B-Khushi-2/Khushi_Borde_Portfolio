# Recruiter Copilot — backend

Plain Express server providing two features:

- `POST /api/contact` — existing contact-form email sender.
- `POST /api/chat`, `POST /api/chat/stream` — new AI Recruiter Copilot chat API.
- `GET /api/health` — boot/config status.

The chat API is retrieval-augmented (RAG): every reply is grounded in a
knowledge base generated from the portfolio's own project/experience/skills
data, so the assistant answers from real content instead of guessing. See
[`rag/ARCHITECTURE.md`](rag/ARCHITECTURE.md) for the full pipeline
explanation (Markdown generation → chunking → embeddings → vector store →
retriever → prompt templates).

## Run it

```bash
cd server
npm install
cp .env.example .env   # fill in at least one of OPENAI_API_KEY / GEMINI_API_KEY

npm run kb:generate    # portfolio data -> Markdown knowledge base
npm run kb:build       # chunk + embed + write the vector index
# (or both: npm run kb:rebuild)

npm run dev             # or: npm start
```

Visit `http://localhost:3000/api/health` to confirm it booted and which
provider is configured. Re-run `npm run kb:rebuild` any time
`public/legacy/data.js` (projects/experience/skills/achievements) changes.

## API

### `POST /api/chat/stream` — Server-Sent Events

```json
{ "messages": [{ "role": "user", "content": "What's her tech stack?" }] }
```

Optional `"provider": "openai" | "gemini"` overrides `LLM_PROVIDER` for that
one request.

Response is `text/event-stream`:

```
event: delta
data: {"text":"Core "}

event: delta
data: {"text":"strengths..."}

event: done
data: [DONE]
```

or, if something fails:

```
event: error
data: {"message":"...", "code":"UPSTREAM_ERROR"}
```

`code` is one of `VALIDATION_ERROR`, `INVALID_PROVIDER`, `CONFIG_MISSING`
(no API key set), `UPSTREAM_ERROR` / `UPSTREAM_UNREACHABLE` (provider call
failed), `STREAM_INTERRUPTED` (failed mid-reply, after some text already
reached the client), `RATE_LIMITED`.

### `POST /api/chat` — same input, single JSON response

```json
{ "role": "assistant", "content": "...", "provider": "openai" }
```

### `GET /api/health`

```json
{ "ok": true, "uptimeSeconds": 42, "provider": "openai", "providerConfigured": true }
```

## Architecture

```
config/env.js            all env vars in one place, with sane defaults
lib/
  logger.js               pino, redacts secrets, pretty locally / JSON in prod
  errors.js               AppError, LLMError (status + machine-readable code)
  retry.js                generic exponential-backoff-with-jitter helper
  llm/
    sse.js                shared Server-Sent-Events line reader
    providers/
      openai.js            OpenAI /chat/completions, streamed
      gemini.js             Gemini streamGenerateContent, streamed
    index.js               provider registry — the Gemini/OpenAI abstraction point
    chatService.js          retrieval-augmented prompt + connect-time retry + provider dispatch
rag/                       retrieval-augmented generation pipeline — see rag/ARCHITECTURE.md
  chunker.js                Markdown -> heading-aware, overlap-windowed chunks
  vectorStore.js             flat-file JSON vector store + cosine similarity search
  retriever.js                embeds a query, searches the store, returns ranked chunks
  promptTemplates.js           strict "answer only from context" system prompt
  embeddings/
    providers/openai.js        OpenAI /embeddings
    providers/gemini.js         Gemini batchEmbedContents
    index.js                    embedding provider registry + batching/retry
scripts/
  generate-knowledge.js       portfolio data.js -> server/data/knowledge/*.md
  build-index.js               knowledge/*.md -> chunk -> embed -> data/index/store.json
data/
  knowledge/                   generated Markdown knowledge base (gitignored, regenerable)
  index/store.json             generated vector index (gitignored, regenerable)
middleware/
  security.js              helmet + CORS allowlist
  rateLimiter.js            express-rate-limit — strict on /api/chat*, looser globally
  requestLogger.js          pino-http, per-request id (X-Request-Id)
  errorHandler.js           404 + centralized JSON error responses
api/
  chat.js                   validation, SSE wiring, abort/timeout, /stream + /
  health.js
  contact.js                unchanged
```

**Adding a third provider** (e.g. Anthropic): write one file matching the
`{ name, streamChat({ messages, model, apiKey, signal, temperature,
maxTokens, baseUrl }) -> AsyncGenerator<string> }` contract, register it in
`lib/llm/index.js`, add its key/model/base-URL to `config/env.js`. Nothing
in `chatService.js`, `api/chat.js`, or the route layer needs to change.

**Retry vs. abort:** retry only covers *establishing* the stream — an
async generator's body doesn't run until its first `.next()`, so retrying
that first call covers connection failures, 429s, and 5xxs with backoff,
without ever double-sending tokens the client already received. Abort is
wired to two things: the client disconnecting (`req.on('close')`) and a
hard `LLM_STREAM_TIMEOUT_MS` ceiling — whichever fires first cancels the
upstream `fetch` via `AbortController`.

## Environment variables

See `.env.example` for the full list with defaults and comments. Nothing
is hardcoded — provider, model, base URL, retry counts, timeouts, rate
limits, and message-size limits are all configurable there.
