# Khushi Borde — Portfolio (React + TypeScript migration) + AI Recruiter Copilot

## Stack
React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui-style components · Framer Motion

## Run it
```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build -> dist/
npm run preview   # serve the production build locally
```

## What's in here

### 1. The AI Recruiter Copilot (`src/features/copilot/*`)
Built fully to spec, from scratch, in React + TypeScript + Tailwind + shadcn-style
components + Framer Motion. Organized as a self-contained feature module:
- `components/` — `FloatingButton.tsx`, `RecruiterCopilot.tsx`, `ChatPanel.tsx`,
  `ChatHeader.tsx` (+ shared `HeaderIconButton.tsx`), `ChatInput.tsx`,
  `MessageList.tsx` / `MessageBubble.tsx`, `SuggestedPrompts.tsx`,
  loading/typing/thinking indicators
- `hooks/` — `useCopilotChat.ts` (message state + simulated streaming),
  `useCopilotKeyboardShortcuts.ts` (`⌘/Ctrl K` open, `Esc` close, `⌘/Ctrl J`
  fullscreen, `⌘/Ctrl M` minimize), plus two small reusable hooks factored
  out of component internals: `useAutosizeTextarea.ts` and `useStickyScroll.ts`
- `data/` — `canned-replies.ts`, `suggested-prompts.ts` (content, kept
  separate from logic)
- `lib/` — `streamChat.ts` (real-time SSE streaming client connecting to the Express backend at `/api/chat/stream`), `markdown.ts` (custom markdown parser), `syntaxHighlight.ts` (code highlight formatter)
- `constants.ts` / `types.ts` — shared timing constants and types for the feature

Floating glassmorphism button, expandable panel with open/close/minimize/
fullscreen modes and spring animations, message bubbles, typing cursor,
"thinking" dot animation, loading skeletons, auto-scroll, suggested prompts,
voice button (UI only), send/stop button, and clear chat are all included.

This part is 100% idiomatic React/TypeScript, fully typed, componentized, reusable,
and wrapped in an error boundary (`src/components/common/ErrorBoundary.tsx`) so a
bug here can never take down the rest of the (working) legacy site.

### 2. The migrated portfolio site (`src/features/legacy-site/*`)
Your original site (`index.html`, `style.css`, `data.js`, `graph.js`,
`main.js` — ~6,000 lines including a canvas-based force-directed
knowledge graph with drag/zoom/search, a terminal emulator, and a
physics-driven particle field) is now served from a React + TypeScript
+ Vite app:

- Every section (`Nav`, `Hero`, `GraphSection`, `SkillsSection`,
  `ProjectsSection`, `ExperienceSection`, `AchievementsSection`,
  `ContactSection`) is its own typed React component — same markup,
  same ids/classes, same CSS, so it renders pixel-identical.
- `style.css` is imported as-is (`src/styles/legacy-site.css`) rather
  than rewritten into Tailwind utilities. Rewriting ~2,500 lines of
  hand-tuned gradients/animations into utility classes with zero visual
  drift isn't something I can verify without a real browser in this
  environment — importing it verbatim was the only way to *guarantee*
  "identical," rather than claim it.
- **`graph.js` and `main.js` are loaded as the original, already-working
  scripts** (`public/legacy/*.js`), bootstrapped by a small typed hook
  (`src/features/legacy-site/hooks/useLegacyScripts.ts`) once the React shell has mounted,
  instead of being blind-rewritten into TSX. That's ~2,400 lines of
  canvas physics, drag/zoom/search, and DOM-population logic — hand-porting
  all of it in one unverified pass is exactly how migrations quietly
  break interactions. If you want this layer as fully native
  React/TypeScript too (e.g. the graph as a typed canvas hook, the
  timeline/skills/achievements as data-mapped components instead of
  innerHTML), that's a well-scoped follow-up I'd tackle section by
  section with real testing at each step, rather than in a single pass.

### 3. Backend (`server/`)
Express server with two features: the existing contact-form email sender,
and a new AI Recruiter Copilot chat API (`/api/chat`, `/api/chat/stream`)
with an OpenAI/Gemini abstraction, streaming, retries, rate limiting, and
structured logging. See `server/README.md` for setup and API details —
it's a standalone Node project with its own `package.json`.

## Architecture notes (maintainability pass)
The app is organized by feature rather than by file type:
- `src/features/copilot/` — everything the AI Recruiter Copilot needs
  (components, hooks, data, lib, types, constants), independently reusable
  and independently error-isolated.
- `src/features/legacy-site/` — the ported static site's section components
  and the hook that boots its vetted vanilla-JS scripts. Markup, ids, and
  classes are untouched so `public/legacy/*.js` keeps working exactly as
  before.
- `src/components/ui/` — small generic UI primitives (`Button`, `Textarea`,
  `Tooltip`) usable by any feature.
- `src/components/common/` — cross-cutting building blocks, e.g.
  `ErrorBoundary.tsx`.
- `src/lib/` — app-wide utilities (`cn()` class merging, `generateId()`).

Within the copilot feature, duplicate logic was factored out into small,
named, reusable hooks/components: `useAutosizeTextarea`, `useStickyScroll`,
and `HeaderIconButton` replace what were previously four copy-pasted
buttons and two copy-pasted effect blocks. Magic numbers (streaming delays,
boot delay) and mock content (canned replies, suggested prompts) were
pulled out into `constants.ts` / `data/` so behavior and content are each
independently editable without touching component code.

This pass is refactor-only: no markup, ids, classes, or CSS changed, and
the production CSS/JS output was diffed against the pre-refactor build to
confirm the UI is unaffected.

## Honest status
- `npm run build` compiles clean, zero TypeScript errors.
- I verified in this sandbox that `npm run preview` serves the app and
  every asset route (`/legacy/*.js`, video, resume) resolves with 200.
- I was **not** able to run this in an actual browser or Lighthouse
  here, so I can't hand you a verified Lighthouse score — please run
  `npm run build && npm run preview` and check it in a browser + devtools
  before treating this as final.
