# Optimization pass — summary

No functionality was changed. Everything below is either a performance/
bundle optimization, a security hardening, an accessibility fix, or an SEO
addition. Where a new dependency was added, `npm install` needs to be run
again in the relevant folder (`/` for the client, `/server` for the API).

## Frontend

**Code splitting / lazy loading**
- `src/App.tsx` — the Recruiter Copilot widget (framer-motion, markdown
  rendering, syntax highlighting, voice mode) is now `React.lazy()`-loaded
  instead of bundled into the main chunk. It's not needed for first paint.
- `src/features/copilot/components/RecruiterCopilot.tsx` — `VoiceModeOverlay`
  (speech recognition/synthesis + its UI, ~900 lines) is now lazy-loaded and
  only mounted the first time a user opens voice mode, instead of always
  being part of the copilot's initial chunk.

**Bundle optimization**
- `vite.config.ts` — added `manualChunks` to split `react`/`react-dom` into
  a `vendor-react` chunk and `framer-motion`/`lucide-react` into their own
  chunks (better long-term browser caching across deploys), set
  `build.target: 'es2020'` (smaller output, no legacy-browser polyfills),
  and disabled sourcemaps in the shipped build.

**Memoization**
- `src/features/copilot/components/Markdown.tsx` — this was the one real
  performance bug found: `parseMarkdown()` and `highlightCode()` were
  re-running on the *entire accumulated message* on every single streamed
  token (effectively O(n²) work over the course of a long streamed reply).
  Both are now wrapped in `useMemo`, and `Markdown`, `CodeBlock`,
  `TableBlock`, and `InlineNodes` are wrapped in `React.memo`.
- `src/features/copilot/components/MessageBubble.tsx` /
  `MessageList.tsx` — `MessageBubble` is wrapped in `React.memo`, and the
  per-message `onRegenerate` handler is no longer re-allocated as a new
  closure on every render of the list (which previously defeated any
  memoization on `MessageBubble`).

**Accessibility**
- `src/features/legacy-site/components/Nav.tsx` — added a keyboard-focusable
  "Skip to main content" link (jumps to the existing `#top` hero section).

**SEO**
- `index.html` — added Open Graph + Twitter Card meta tags, a JSON-LD
  `Person` structured-data block, `robots`/`theme-color` meta, and a
  `canonical` link. These use a `REPLACE_WITH_DEPLOYED_URL` placeholder —
  fill in the real production URL once deployed.
- `index.html` — added `preconnect` (already present) plus a
  `rel="preload"` for the hero poster image (likely LCP element) so the
  browser fetches it earlier.

## Backend (`/server`)

**Security**
- `middleware/security.js` — the Content-Security-Policy was previously
  disabled entirely (`contentSecurityPolicy: false`). Replaced with a real,
  scoped policy: `script-src 'self'` plus an exact SHA-256 hash for the one
  inline anti-FOUC theme script (not `'unsafe-inline'`), Google Fonts
  allow-listed for styles/fonts, `object-src 'none'`, `frame-ancestors
  'none'`, `base-uri 'self'`. **If the inline theme script in `index.html`
  is ever edited, its hash in `security.js` must be recomputed** (a
  comment there explains this).

**Rate limiting**
- `middleware/rateLimiter.js` / `config/env.js` — added a dedicated
  `contactLimiter` (5 requests / 10 min by default, configurable via
  `CONTACT_RATE_LIMIT_*` env vars) for `/api/contact`, which previously
  only shared the generous 100 req/min global limiter. A contact form is a
  common spam target and each submission sends a real email.
- `api/contact.js` (the standalone Vercel serverless function variant,
  which bypasses `server.js`'s Express middleware entirely) — added a
  small self-contained in-memory sliding-window limiter, since it has no
  access to the Express app's limiter. Best-effort only (resets on a cold
  start), but still raises the bar against scripted abuse at zero cost.

**Performance / caching**
- `server.js` — added `compression` middleware (gzip/brotli negotiation)
  for all responses except `text/event-stream` (SSE streaming would be
  defeated by buffering for compression). **Requires `npm install` in
  `/server`** to pull in the new `compression` dependency.
- `server.js` — `express.static` now sets `Cache-Control: max-age=1y,
  immutable` for static assets, and `Cache-Control: no-cache` specifically
  for `.html` files (so browsers cache hashed build assets aggressively
  while always revalidating the HTML that references them).
