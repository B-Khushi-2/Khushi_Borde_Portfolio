/**
 * Bridges the React app to the legacy vanilla-JS portfolio site
 * (public/legacy/data.js + graph.js + main.js), which is loaded as classic
 * scripts via useLegacyScripts and populates the DOM/canvas imperatively —
 * see that hook's own comment for why it's kept as-is rather than ported.
 *
 * Two things are exposed there specifically for this bridge:
 *   - `window.PORTFOLIO`      — the same data.js object graph.js/main.js
 *                                 read from (see data.js's trailing line).
 *   - `window.__portfolioGraph` — the initialized Knowledge Graph handle
 *                                 (see main.js, right after `KnowledgeGraph.init`),
 *                                 exposing `focusNode`/`nodeById` so this
 *                                 bridge can pan/zoom/open the canvas graph
 *                                 to a node from outside that closure.
 */

export interface PortfolioNode {
  id: string;
  type?: string;
  label: string;
  cluster?: string;
}

export interface PortfolioData {
  nodes: {
    hubs: PortfolioNode[];
    skills: PortfolioNode[];
    projects: PortfolioNode[];
    experience: PortfolioNode[];
    achievements: PortfolioNode[];
  };
}

export interface PortfolioGraphNode {
  id: string;
  x: number;
  y: number;
}

export interface PortfolioGraphHandle {
  openPanel: (node: PortfolioGraphNode) => void;
  focusNode: (node: PortfolioGraphNode, opts?: { zoom?: number }) => void;
  nodeById: Map<string, PortfolioGraphNode>;
}

declare global {
  interface Window {
    PORTFOLIO?: PortfolioData;
    __portfolioGraph?: PortfolioGraphHandle;
  }
}

import { PORTFOLIO as TYPED_PORTFOLIO } from "@/content/profile";

export function getPortfolioData(): PortfolioData | null {
  if (typeof window !== "undefined" && window.PORTFOLIO) {
    return window.PORTFOLIO;
  }
  return TYPED_PORTFOLIO as unknown as PortfolioData;
}

export function getGraphHandle(): PortfolioGraphHandle | null {
  return typeof window !== "undefined" ? window.__portfolioGraph ?? null : null;
}
