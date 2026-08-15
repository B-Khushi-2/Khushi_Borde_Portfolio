# 🤖 AI Recruiter Copilot — Technical & Architecture Documentation

## 1. Overview & Purpose

The **AI Recruiter Copilot** is a retrieval-augmented generation (RAG) assistant built into the portfolio site. It empowers recruiters, hiring managers, and visitors to interact with a natural-language AI interface to explore technical skills, project architecture, work experience, hackathons, and resume highlights.

### Key Features
- 🎯 **Strictly Grounded (Zero Hallucination)**: Formulates replies using ONLY facts indexed from the portfolio's knowledge base.
- ⚡ **Real-Time Streaming**: Employs Server-Sent Events (SSE) to deliver responses token-by-token for responsive, low-latency UX.
- 🎙️ **Hands-Free Voice Mode**: Fully integrated voice conversation loop with Speech-to-Text, audio metering, and sentence-chunked Text-to-Speech playback.
- 🔄 **Multi-Provider LLM Engine**: Supports both OpenAI (`gpt-4o-mini`) and Google Gemini (`gemini-1.5-flash`), with robust connection retry logic and exponential backoff.
- 🧠 **Agentic Execution & Intelligence Panel**: Features interactive side drawer displaying multi-agent routing visualizers, step plans, and follow-up query suggestions.

---

## 2. System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                      │
│                                                                   │
│  [FloatingButton] ──▶ [RecruiterCopilot] ──▶ [ChatPanel]          │
│                              │                      │             │
│                     [IntelligenceContext]    [VoiceModeOverlay]   │
│                              │                      │             │
│                    useCopilotChat()          useVoiceMode()       │
└──────────────────────────────┬────────────────────────────────────┘
                               │ POST /api/chat/stream (SSE)
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│                   Backend (Express Node.js)                       │
│                                                                   │
│  [api/chat.js] ──▶ [chatService.js]                               │
│                          │                                        │
│     ┌────────────────────┴────────────────────┐                   │
│     ▼                                         ▼                   │
│  [retriever.js]                       [LLM Provider Registry]     │
│     │ (Cosine Similarity search)              ├─ OpenAI           │
│     ▼                                         └─ Gemini           │
│  [vectorStore.js] (data/index/store.json)                         │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. RAG (Retrieval-Augmented Generation) Pipeline

Located under `server/rag/`, the RAG subsystem turns portfolio data into an offline-indexed vector database:

```
Single Source of Truth (public/legacy/data.js)
  │
  ▼  (npm run kb:generate)
[server/scripts/generate-knowledge.js] ──▶ Markdown Knowledge Base (server/data/knowledge/*.md)
  │
  ▼  (npm run kb:build)
[server/rag/chunker.js] ──▶ Heading-Aware Chunks
  │
  ▼
[server/rag/embeddings/] ──▶ Vector Embeddings (OpenAI / Gemini)
  │
  ▼
[server/rag/vectorStore.js] ──▶ In-Memory Flat File Vector Index (server/data/index/store.json)
```

### Request-Time Retrieval Flow
1. **Query Vectorization**: `retriever.js` embeds the user's latest query using the specified embedding provider (`text-embedding-3-small` or `text-embedding-004`).
2. **Similarity Scoring**: `vectorStore.js` performs cosine similarity comparison across indexed vectors in memory.
3. **Retrieval Thresholding**: Chunks below `RAG_MIN_SCORE` (`0.20`) are filtered out.
4. **Context Injection**: `promptTemplates.js` constructs a grounded system prompt containing top `RAG_TOP_K` (`4`) matching context blocks. If no content clears the score threshold, an explicit "No relevant information found" clause is passed to prevent fabrication.

---

## 4. Backend API & Server Layer

The Express backend (`server/server.js`) exposes the following endpoints:

### Endpoints

#### 1. `POST /api/chat/stream` — SSE Streaming Endpoint
- **Header**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "messages": [
      { "role": "user", "content": "Tell me about her React experience." }
    ],
    "provider": "openai" // optional: "openai" | "gemini"
  }
  ```
- **Response Format** (`text/event-stream`):
  ```http
  event: delta
  data: {"text":"She has extensively..."}

  event: done
  data: [DONE]
  ```

#### 2. `POST /api/chat` — Single JSON Response
Standard REST endpoint returning `{ "role": "assistant", "content": "...", "provider": "..." }`.

#### 3. `GET /api/health`
Health check endpoint reporting uptime, active provider, and key configuration status.

### Resiliency & Error Management
- **Connection Retries**: `server/lib/retry.js` applies exponential backoff with jitter on initial connection attempts to gracefully handle rate limits or network blips.
- **Abort Signals**: Requests bind to `req.on('close')` and `LLM_STREAM_TIMEOUT_MS` to terminate unneeded LLM queries immediately upon client disconnection.
- **Machine-Readable Errors**: Standardized machine codes (`VALIDATION_ERROR`, `INVALID_PROVIDER`, `CONFIG_MISSING`, `UPSTREAM_ERROR`, `STREAM_INTERRUPTED`, `RATE_LIMITED`).

---

## 5. Frontend Architecture & React Components

Located under `src/features/copilot/`:

### UI Components (`src/features/copilot/components/`)
- `RecruiterCopilot.tsx`: Root wrapper connecting context and layout.
- `FloatingButton.tsx`: Floating action trigger with keyboard shortcut indicator (`Ctrl + K`).
- `ChatPanel.tsx`: Core window container managing open, minimized, and fullscreen panel modes.
- `ChatHeader.tsx`: Header bar with window controls, mode switcher, and drawer toggle.
- `MessageList.tsx` & `MessageBubble.tsx`: Message stream renderer with Markdown, syntax highlighting, and copy/action tools.
- `ChatInput.tsx`: Auto-expanding textarea with voice controls and submit actions.
- `IntelligencePanel.tsx`: Expandable drawer rendering active agent routing, step plan visualization, topic tags, and context metrics.

### React Hooks & Context
- `IntelligenceContext.tsx`: React Context providing state for messages, drawer visibility, panel dimensions, and voice status.
- `useCopilotChat.ts`: Custom hook managing chat thread history, SSE stream parsing, stream interruption, and message regeneration.
- `useCopilotKeyboardShortcuts.ts`: Global keyboard shortcut handler (`Cmd/Ctrl + K` to toggle chat, `Esc` to close).

---

## 6. Voice Interaction Subsystem

Located under `src/features/copilot/voice/`:

- **Voice Mode Overlay**: `VoiceModeOverlay.tsx` displays a futuristic, full-screen audio interface.
- **Visualizer**: `VoiceOrb.tsx` drives dynamic particle animations responding to real-time mic volume levels via `useMicLevel.ts`.
- **Speech-to-Text**: `useSpeechRecognition.ts` wraps the browser Web Speech API (`webkitSpeechRecognition`) for hands-free prompt capture.
- **Text-to-Speech**: `useSpeechSynthesis.ts` and `sentenceChunk.ts` split incoming assistant stream deltas on sentence boundaries for fluid continuous voice output.

---

## 7. Operations & Maintenance Workflow

### Environment Configuration (`server/.env`)
```env
PORT=3000
LLM_PROVIDER=openai             # "openai" | "gemini"
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
EMBEDDING_PROVIDER=openai        # "openai" | "gemini"
RAG_MIN_SCORE=0.20              # Min cosine similarity score
RAG_TOP_K=4                     # Number of context chunks retrieved
```

### Knowledge Base Regeneration Commands
Execute inside the `portfolio-react/server` directory:

```bash
# Generate Markdown files from public/legacy/data.js
npm run kb:generate

# Build chunk index and generate embeddings
npm run kb:build

# Execute full rebuild workflow (Generate + Build)
npm run kb:rebuild

# Start Express server in development mode
npm run dev
```
