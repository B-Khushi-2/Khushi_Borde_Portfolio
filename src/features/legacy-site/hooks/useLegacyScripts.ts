import { useEffect } from "react";

/**
 * The original site's data.js / graph.js / main.js are ~2,900 lines of
 * working, already-tuned canvas physics, drag/zoom/search interaction,
 * and DOM-population logic (knowledge graph, skills ecosystem, timeline,
 * terminal, contact form, theme toggle, etc).
 *
 * Rather than hand-rewriting that much untested imperative/canvas code in
 * one pass (real risk of silently breaking drag/zoom/physics behavior),
 * this hook loads the same vetted scripts as classic <script> tags once
 * the React-rendered shell (with matching element ids) is in the DOM —
 * exactly mirroring how they ran in the original static index.html, just
 * bootstrapped from React instead of the HTML parser.
 *
 * Load order matters: data.js defines the global PORTFOLIO object that
 * graph.js and main.js both read.
 *
 * IMPORTANT — this boot sequence is a page-level singleton, not tied to
 * any one component's lifecycle. It's tracked in a module-level promise
 * (outside React state/refs) deliberately: in dev, React StrictMode
 * mounts -> cleans up -> remounts every component once. An earlier version
 * of this hook tracked a per-effect `cancelled` flag set in the cleanup
 * function; StrictMode's near-instant cleanup flipped that flag before the
 * data.js request had even resolved, so the chain silently stopped after
 * step 1 and graph.js/main.js never loaded — leaving the graph, skills,
 * projects, timeline and achievements sections empty in dev (production
 * builds don't double-invoke effects, so this never showed up there).
 * A module-level singleton has no per-mount lifecycle to race against, so
 * it can't be aborted by StrictMode's remount and only ever runs once.
 */
let legacyScriptsBootPromise: Promise<void> | null = null;

function loadScript(src: string, id: string): Promise<void> {
  if (document.getElementById(id)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.id = id;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

function bootLegacyScripts(): Promise<void> {
  if (legacyScriptsBootPromise) return legacyScriptsBootPromise;

  legacyScriptsBootPromise = (async () => {
    await loadScript("/legacy/data.js", "legacy-data-script");
    await loadScript("/legacy/graph.js", "legacy-graph-script");
    await loadScript("/legacy/main.js", "legacy-main-script");
  })().catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Legacy site scripts failed to load:", err);
    // Allow a future call (e.g. a later remount) to retry from scratch.
    legacyScriptsBootPromise = null;
  });

  return legacyScriptsBootPromise;
}

export function useLegacyScripts() {
  useEffect(() => {
    bootLegacyScripts();
  }, []);
}
