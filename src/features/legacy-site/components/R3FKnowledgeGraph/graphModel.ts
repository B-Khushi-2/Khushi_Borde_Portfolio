import PORTFOLIO from "@/content/profile";

export interface GraphNode {
  id: string;
  type: "core" | "hub" | "skill" | "project" | "experience" | "achievement";
  label: string;
  cluster?: string;
  date?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  impact?: string[];
  learned?: string[];
  github?: string | null;
  link?: string | null;
  org?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  r: number;
  phase: number;
  spawnDelay: number;
  dimAlpha: number;
  visAlpha: number;
  hotAlpha: number;
  order: number;
  degree: number;
  sectorMid?: number;
  _hoverT?: number;
  _relVX?: number;
  _relVY?: number;
}

export interface GraphEdge {
  a: GraphNode;
  b: GraphNode;
  _hotAlpha?: number;
}

export const RADIUS: Record<string, number> = {
  core: 28,
  hub: 15,
  skill: 7,
  project: 11,
  experience: 10,
  achievement: 9.5,
};

export const COLORS: Record<string, string> = {
  core: "#F5F0E6",
  hub: "#4C5875",
  skill: "#6FE3C4",
  project: "#F2A65A",
  experience: "#C792EA",
  achievement: "#F2789E",
  text: "#EDEFF5",
  textDim: "#5A6379",
  textRgb: "237,239,245",
  bgRgb: "10,14,24",
};

export const TYPE_BADGE: Record<string, string> = {
  hub: "▣",
  project: "✈",
  experience: "💼",
  achievement: "🏆",
};

export const SKILL_BADGE: Record<string, string> = {
  skill_python: "🐍",
  skill_javascript: "🟨",
  skill_typescript: "🔷",
  skill_sql: "🗄️",
  skill_dart: "🎯",
  skill_cpp: "➕",
  skill_ml: "🧠",
  skill_dl_cnn: "🧠",
  skill_genai: "✨",
  skill_rag: "🔎",
  skill_agentic: "🤖",
  skill_promptEng: "💬",
  skill_tensorflow: "🔶",
  skill_huggingface: "🤗",
  skill_llmpipe: "🔗",
  skill_cv: "👁️",
  skill_n8n: "🔄",
  skill_react: "⚛️",
  skill_node: "🟢",
  skill_express: "🚂",
  skill_flask: "🧪",
  skill_mongodb: "🍃",
  skill_firebase: "🔥",
  skill_restapi: "🌐",
  skill_git: "🐙",
  skill_docker: "🐳",
  skill_gcp: "☁️",
};

export function badgeFor(n: GraphNode): string | null {
  return SKILL_BADGE[n.id] || TYPE_BADGE[n.type] || null;
}

const TYPE_PRIORITY: Record<string, number> = {
  skill: 0,
  experience: 1,
  achievement: 2,
  project: 3,
  hub: 4,
  core: 5,
};

export function relationshipLabel(a: GraphNode, b: GraphNode, isStructural: boolean): string {
  if (isStructural) {
    if (a.type === "core" || b.type === "core") return "Category of";
    return "Includes";
  }
  const types: string[] = [a.type, b.type];
  const has = (t: string) => types.includes(t);
  if (has("skill") && has("project")) return "Used in";
  if (has("skill") && has("experience")) return "Learned during";
  if (has("skill") && has("achievement")) return "Proven by";
  if (has("project") && has("achievement")) return "Recognized by";
  if (has("experience") && has("achievement")) return "Led to";
  return "Connected to";
}

export function orderedPair(a: GraphNode, b: GraphNode): [GraphNode, GraphNode] {
  const pA = TYPE_PRIORITY[a.type] ?? 99;
  const pB = TYPE_PRIORITY[b.type] ?? 99;
  return pA <= pB ? [a, b] : [b, a];
}

export function buildModel() {
  const rawNodes = [
    ...PORTFOLIO.nodes.hubs,
    ...PORTFOLIO.nodes.skills,
    ...PORTFOLIO.nodes.projects,
    ...PORTFOLIO.nodes.experience,
    ...PORTFOLIO.nodes.achievements,
  ];

  const nodes: GraphNode[] = rawNodes.map((n, i) => {
    const nodeType = (n.type || "skill") as GraphNode["type"];
    return {
      ...n,
      type: nodeType,
      x: 0, y: 0, vx: 0, vy: 0,
      ax: 0, ay: 0,
      r: RADIUS[nodeType] || 9,
      phase: Math.random() * Math.PI * 2,
      spawnDelay: 0,
      dimAlpha: 1,
      visAlpha: 1,
      hotAlpha: 0,
      order: i,
      degree: 0,
      impact: Array.isArray(n.impact) ? n.impact : n.impact ? [n.impact] : undefined,
      learned: Array.isArray(n.learned) ? n.learned : n.learned ? [n.learned] : undefined,
    };
  });

  const nodeById = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));

  const edges: GraphEdge[] = PORTFOLIO.edges
    .filter(([a, b]) => nodeById.has(a) && nodeById.has(b))
    .map(([a, b]) => ({ a: nodeById.get(a)!, b: nodeById.get(b)! }));

  const structuralIds = new Set<string>();
  edges.forEach(e => {
    if (e.a.type === "core" || e.a.type === "hub") structuralIds.add(e.a.id + "|" + e.b.id);
  });

  const adjacency = new Map<string, Set<string>>();
  nodes.forEach(n => adjacency.set(n.id, new Set()));
  edges.forEach(e => {
    adjacency.get(e.a.id)!.add(e.b.id);
    adjacency.get(e.b.id)!.add(e.a.id);
  });

  nodes.forEach(n => { n.degree = (adjacency.get(n.id) || new Set()).size; });

  return { nodes, edges, nodeById, adjacency, structuralIds };
}

export function computeLayout(nodes: GraphNode[], w: number, h: number) {
  const cx = w / 2, cy = h / 2;
  const minDim = Math.max(Math.min(w, h), 320);

  const core = nodes.find(n => n.type === "core");
  if (core) { core.ax = cx; core.ay = cy; }

  const hubs = nodes.filter(n => n.type === "hub");
  const childrenByHub = new Map<string, GraphNode[]>();
  hubs.forEach(hb => childrenByHub.set(hb.id, []));
  nodes.forEach(n => {
    if (n.cluster && childrenByHub.has(n.cluster)) childrenByHub.get(n.cluster)!.push(n);
  });

  const hubRadius = minDim * 0.24;
  const leafRadiusA = minDim * 0.40;
  const leafRadiusB = minDim * 0.485;

  const weights = hubs.map(hb => Math.max(childrenByHub.get(hb.id)?.length || 0, 2.4));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const gapAngle = (Math.PI * 2) * 0.018;

  let angle = -Math.PI / 2 - 0.001;
  hubs.forEach((hub, i) => {
    const rawSpan = (weights[i] / totalWeight) * Math.PI * 2;
    const sectorAngle = Math.max(rawSpan - gapAngle, 0.18);
    const startAngle = angle;
    const midAngle = startAngle + sectorAngle / 2;

    hub.ax = cx + Math.cos(midAngle) * hubRadius;
    hub.ay = cy + Math.sin(midAngle) * hubRadius;
    hub.sectorMid = midAngle;

    const kids = childrenByHub.get(hub.id) || [];
    kids.sort((a, b) => a.order - b.order);
    const n = kids.length;
    const pad = sectorAngle * 0.14;
    const usableStart = startAngle + pad;
    const usableEnd = startAngle + sectorAngle - pad;
    const usableSpan = Math.max(usableEnd - usableStart, 0.001);

    kids.forEach((kid, j) => {
      const t = n <= 1 ? 0.5 : j / (n - 1);
      const a = usableStart + t * usableSpan;
      const ring = (j % 2 === 0) ? leafRadiusA : leafRadiusB;
      kid.ax = cx + Math.cos(a) * ring;
      kid.ay = cy + Math.sin(a) * ring;
      kid.sectorMid = a;
    });

    angle += sectorAngle + gapAngle;
  });
}

export function assignSpawnDelays(nodes: GraphNode[]) {
  const hubs = nodes.filter(n => n.type === "hub").sort((a, b) => a.order - b.order);
  const core = nodes.find(n => n.type === "core");
  if (core) core.spawnDelay = 0;
  hubs.forEach((hub, i) => {
    hub.spawnDelay = 90 + i * 70;
  });
  const byHub = new Map<string, GraphNode[]>();
  hubs.forEach(hb => byHub.set(hb.id, []));
  nodes.forEach(n => { if (n.cluster && byHub.has(n.cluster)) byHub.get(n.cluster)!.push(n); });
  hubs.forEach(hub => {
    const kids = (byHub.get(hub.id) || []).sort((a, b) => a.order - b.order);
    kids.forEach((kid, j) => {
      kid.spawnDelay = hub.spawnDelay + 130 + j * 26;
    });
  });
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function tickPhysics(
  nodes: GraphNode[],
  dtMs: number,
  now: number,
  dragNode: GraphNode | null,
  activeFilter: string,
  reducedMotion: boolean,
  startTime: number
) {
  const ANCHOR_SPRING = 0.052;
  const REPEL = 420;
  const REPEL_DIST = 70;
  const REPEL_DIST_SQ = REPEL_DIST * REPEL_DIST;
  const DAMP = 0.82;
  const BREATH_AMPL = 3.2;
  const BREATH_SPEED = 0.00045;

  const n = nodes.length;
  const forceX = new Float64Array(n);
  const forceY = new Float64Array(n);

  function spawnT(node: GraphNode) {
    if (reducedMotion) return 1;
    const t = (now - startTime - node.spawnDelay) / 420;
    return Math.max(0, Math.min(1, t));
  }

  function isVisible(node: GraphNode) {
    if (activeFilter === "all") return true;
    if (node.type === "core" || node.type === "hub") return true;
    return node.type === activeFilter;
  }

  for (let i = 0; i < n; i++) {
    const a = nodes[i];
    if (spawnT(a) <= 0) continue;
    for (let j = i + 1; j < n; j++) {
      const b = nodes[j];
      if (spawnT(b) <= 0) continue;
      let dx = a.x - b.x, dy = a.y - b.y;
      let d2 = dx * dx + dy * dy;
      if (d2 > REPEL_DIST_SQ) continue;
      if (d2 < 4) d2 = 4;
      const d = Math.sqrt(d2);
      const force = REPEL / d2;
      const fx = (dx / d) * force, fy = (dy / d) * force;
      forceX[i] += fx; forceY[i] += fy;
      forceX[j] -= fx; forceY[j] -= fy;
    }
  }

  for (let i = 0; i < n; i++) {
    const node = nodes[i];
    const t = spawnT(node);
    if (t <= 0) { node.x = node.ax; node.y = node.ay; continue; }
    if (node === dragNode) continue;

    let fx = forceX[i], fy = forceY[i];

    const breathX = reducedMotion ? 0 : Math.cos(now * BREATH_SPEED + node.phase) * BREATH_AMPL;
    const breathY = reducedMotion ? 0 : Math.sin(now * BREATH_SPEED * 1.3 + node.phase) * BREATH_AMPL;
    const targetX = node.ax + breathX;
    const targetY = node.ay + breathY;

    fx += (targetX - node.x) * (ANCHOR_SPRING * 60 / Math.max(dtMs, 1));
    fy += (targetY - node.y) * (ANCHOR_SPRING * 60 / Math.max(dtMs, 1));

    node.vx = (node.vx + fx * 0.02) * DAMP;
    node.vy = (node.vy + fy * 0.02) * DAMP;
  }

  for (let i = 0; i < n; i++) {
    const node = nodes[i];
    if (node === dragNode) continue;
    if (spawnT(node) <= 0) continue;
    node.x += node.vx;
    node.y += node.vy;
  }

  for (let i = 0; i < n; i++) {
    const node = nodes[i];
    node.visAlpha = lerp(node.visAlpha, isVisible(node) ? 1 : 0, 0.15);
  }
}
