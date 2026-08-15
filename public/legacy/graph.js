/* ============================================================================
   KNOWLEDGE GRAPH ENGINE
   A small self-contained force-directed graph renderer on <canvas>.
   No external libraries — reads straight from PORTFOLIO in data.js.

   LAYOUT MODEL (v2)
   ------------------
   Every node has a fixed "anchor" — a target position computed once from a
   radial sector tree: the core sits at the centre, each hub owns a wedge of
   the circle sized to how many children it has, and each hub's children fan
   out evenly across that wedge on two alternating radii (a "petal" layout).
   Physics only pulls nodes toward their own anchor + gentle mutual repulsion
   + a slow idle breathing motion — nothing pulls nodes toward each other via
   the knowledge-graph cross-links, which is what caused the old sim to
   collapse everything into one clump. Cross-links are still drawn and still
   drive hover/selection highlighting; they just don't participate in physics.
   ============================================================================ */

(function () {
  "use strict";

  const COLORS = {};
  function readColors() {
    const CSS = getComputedStyle(document.documentElement);
    COLORS.core        = CSS.getPropertyValue("--c-core").trim()        || "#F5F0E6";
    COLORS.hub          = CSS.getPropertyValue("--c-hub").trim()         || "#4C5875";
    COLORS.skill        = CSS.getPropertyValue("--c-skill").trim()       || "#6FE3C4";
    COLORS.project       = CSS.getPropertyValue("--c-project").trim()     || "#F2A65A";
    COLORS.experience   = CSS.getPropertyValue("--c-experience").trim()  || "#C792EA";
    COLORS.achievement  = CSS.getPropertyValue("--c-achievement").trim() || "#F2789E";
    COLORS.text          = CSS.getPropertyValue("--c-text").trim()        || "#EDEFF5";
    COLORS.textDim       = CSS.getPropertyValue("--c-text-dim").trim()    || "#5A6379";
    const textRgb = CSS.getPropertyValue("--c-text-rgb").trim() || "237,239,245";
    const bgRgb   = CSS.getPropertyValue("--c-bg-rgb").trim()   || "10,14,24";
    COLORS.textRgb = textRgb;
    COLORS.bgRgb   = bgRgb;
    COLORS.border  = `rgba(${textRgb},0.14)`;
    COLORS.hubFill = `rgba(${textRgb},0.07)`;
    COLORS.hubStroke = `rgba(${textRgb},0.4)`;
    COLORS.faintEdge = `rgba(${textRgb},0.06)`;
    COLORS.hotEdge = `rgba(${textRgb},0.6)`;
    COLORS.labelPill = `rgba(${bgRgb},0.72)`;
  }
  readColors();
  document.addEventListener("themechange", readColors);

  const RADIUS = { core: 28, hub: 15, skill: 7, project: 11, experience: 10, achievement: 9.5 };
  const EASE_OUT_BACK = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---- Small decorative badges drawn inside a node's circle --------------
  const TYPE_BADGE = { hub: "\u25A3", project: "\u2708", experience: "\uD83D\uDCBC", achievement: "\uD83C\uDFC6" };
  const SKILL_BADGE = {
    skill_python: "\uD83D\uDC0D", skill_javascript: "\uD83D\uDFE8", skill_typescript: "\uD83D\uDD37",
    skill_sql: "\uD83D\uDDC4", skill_dart: "\uD83C\uDFAF", skill_cpp: "\u2795",
    skill_ml: "\uD83E\uDDE0", skill_dl_cnn: "\uD83E\uDDE0", skill_genai: "\u2728", skill_rag: "\uD83D\uDD0E",
    skill_agentic: "\uD83E\uDD16", skill_promptEng: "\uD83D\uDCAC", skill_tensorflow: "\uD83D\uDD36",
    skill_huggingface: "\uD83E\uDD17", skill_llmpipe: "\uD83D\uDD17", skill_cv: "\uD83D\uDC41",
    skill_n8n: "\uD83D\uDD01", skill_react: "\u269B", skill_node: "\uD83D\uDFE2", skill_express: "\uD83D\uDE82",
    skill_flask: "\uD83E\uDDEA", skill_mongodb: "\uD83C\uDF43", skill_firebase: "\uD83D\uDD25",
    skill_restapi: "\uD83C\uDF10", skill_git: "\uD83D\uDC19", skill_docker: "\uD83D\uDC33", skill_gcp: "\u2601"
  };
  function badgeFor(n) { return SKILL_BADGE[n.id] || TYPE_BADGE[n.type] || null; }

  // ---- Relationship phrasing for edge tooltips ----------------------------
  const TYPE_PRIORITY = { skill: 0, experience: 1, achievement: 2, project: 3, hub: 4, core: 5 };
  function relationshipLabel(a, b, isStructural) {
    if (isStructural) {
      if (a.type === "core" || b.type === "core") return "Category of";
      return "Includes";
    }
    const types = [a.type, b.type];
    const has = t => types.includes(t);
    if (has("skill") && has("project")) return "Used in";
    if (has("skill") && has("experience")) return "Learned during";
    if (has("skill") && has("achievement")) return "Proven by";
    if (has("project") && has("achievement")) return "Recognized by";
    if (has("experience") && has("achievement")) return "Led to";
    return "Connected to";
  }
  function orderedPair(a, b) {
    return TYPE_PRIORITY[a.type] <= TYPE_PRIORITY[b.type] ? [a, b] : [b, a];
  }

  // ---- Build node/edge model from PORTFOLIO -------------------------------
  function buildModel() {
    const rawNodes = [
      ...PORTFOLIO.nodes.hubs,
      ...PORTFOLIO.nodes.skills,
      ...PORTFOLIO.nodes.projects,
      ...PORTFOLIO.nodes.experience,
      ...PORTFOLIO.nodes.achievements
    ];

    const nodes = rawNodes.map((n, i) => ({
      ...n,
      x: 0, y: 0, vx: 0, vy: 0,
      ax: 0, ay: 0,               // anchor (target) position
      r: RADIUS[n.type] || 9,
      phase: Math.random() * Math.PI * 2,
      spawnDelay: 0,
      dimAlpha: 1,                // smoothed dim value used for rendering
      visAlpha: 1,                // smoothed filter-visibility (fades instead of popping)
      hotAlpha: 0,                // smoothed "connected to focus" glow strength
      order: i
    }));

    const nodeById = new Map(nodes.map(n => [n.id, n]));

    const edges = PORTFOLIO.edges
      .filter(([a, b]) => nodeById.has(a) && nodeById.has(b))
      .map(([a, b]) => ({ a: nodeById.get(a), b: nodeById.get(b) }));

    // structural edges = the ones that define the sector tree (core->hub, hub->child)
    // everything else is a "cross-link" (project used skill X, etc.)
    const structuralIds = new Set();
    edges.forEach(e => {
      if (e.a.type === "core" || e.a.type === "hub") structuralIds.add(e.a.id + "|" + e.b.id);
    });

    // adjacency for panel + hover highlight (uses ALL edges, structural + cross-link)
    const adjacency = new Map();
    nodes.forEach(n => adjacency.set(n.id, new Set()));
    edges.forEach(e => {
      adjacency.get(e.a.id).add(e.b.id);
      adjacency.get(e.b.id).add(e.a.id);
    });

    return { nodes, edges, nodeById, adjacency, structuralIds };
  }

  // ---- Radial sector layout: compute fixed anchors ------------------------
  function computeLayout(nodes, w, h) {
    const cx = w / 2, cy = h / 2;
    const minDim = Math.max(Math.min(w, h), 320);

    const core = nodes.find(n => n.type === "core");
    core.ax = cx; core.ay = cy;

    const hubs = nodes.filter(n => n.type === "hub");
    const childrenByHub = new Map();
    hubs.forEach(hb => childrenByHub.set(hb.id, []));
    nodes.forEach(n => {
      if (n.cluster && childrenByHub.has(n.cluster)) childrenByHub.get(n.cluster).push(n);
    });

    const hubRadius  = minDim * 0.24;
    const leafRadiusA = minDim * 0.40;
    const leafRadiusB = minDim * 0.485;

    // weight each hub's sector by how many children it owns (min floor so
    // small hubs like "Experience" still get a readable wedge)
    const weights = hubs.map(hb => Math.max(childrenByHub.get(hb.id).length, 2.4));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const gapAngle = (Math.PI * 2) * 0.018;

    let angle = -Math.PI / 2 - 0.001; // start just above 12 o'clock, going clockwise
    hubs.forEach((hub, i) => {
      const rawSpan = (weights[i] / totalWeight) * Math.PI * 2;
      const sectorAngle = Math.max(rawSpan - gapAngle, 0.18);
      const startAngle = angle;
      const midAngle = startAngle + sectorAngle / 2;

      hub.ax = cx + Math.cos(midAngle) * hubRadius;
      hub.ay = cy + Math.sin(midAngle) * hubRadius;
      hub.sectorMid = midAngle;

      const kids = childrenByHub.get(hub.id);
      // sort by node "order" so re-layout is stable/deterministic
      kids.sort((a, b) => a.order - b.order);
      const n = kids.length;
      const pad = sectorAngle * 0.14;
      const usableStart = startAngle + pad;
      const usableEnd = startAngle + sectorAngle - pad;
      const usableSpan = Math.max(usableEnd - usableStart, 0.001);

      kids.forEach((kid, j) => {
        const t = n <= 1 ? 0.5 : j / (n - 1);
        const a = usableStart + t * usableSpan;
        // alternate two ring radii so labels/nodes in dense sectors don't overlap
        const ring = (j % 2 === 0) ? leafRadiusA : leafRadiusB;
        kid.ax = cx + Math.cos(a) * ring;
        kid.ay = cy + Math.sin(a) * ring;
        kid.sectorMid = a;
      });

      angle += sectorAngle + gapAngle;
    });
  }

  // ---- Spawn stagger: BFS-ish order so the graph "grows" outward ----------
  function assignSpawnDelays(nodes, nodeById) {
    const hubs = nodes.filter(n => n.type === "hub").sort((a, b) => a.order - b.order);
    const core = nodes.find(n => n.type === "core");
    if (core) core.spawnDelay = 0;
    hubs.forEach((hub, i) => {
      hub.spawnDelay = 90 + i * 70;
    });
    const byHub = new Map();
    hubs.forEach(hb => byHub.set(hb.id, []));
    nodes.forEach(n => { if (n.cluster && byHub.has(n.cluster)) byHub.get(n.cluster).push(n); });
    hubs.forEach(hub => {
      const kids = byHub.get(hub.id).sort((a, b) => a.order - b.order);
      kids.forEach((kid, j) => {
        kid.spawnDelay = hub.spawnDelay + 130 + j * 26;
      });
    });
  }

  function initGraph(canvas, panelEls, filtersEl, hintEl, extras) {
    extras = extras || {};
    const ctx = canvas.getContext("2d");
    let { nodes, edges, nodeById, adjacency, structuralIds } = buildModel();
    nodes.forEach(n => { n.degree = (adjacency.get(n.id) || new Set()).size; });

    let canvasRect = null;
    let width = 0, height = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const forceX = new Float64Array(nodes.length);
    const forceY = new Float64Array(nodes.length);
    let view = { scale: 1, ox: 0, oy: 0 };
    let viewAnim = null;
    let activeFilter = "all";
    let selected = null;
    let hovered = null;
    let hoveredEdge = null;
    let selectedAt = 0;
    let dragNode = null;
    let dragOffset = { x: 0, y: 0 };
    let didDrag = false;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let mouse = { x: -9999, y: -9999 };
    let startTime = 0;
    let now = 0;
    let breadcrumbPath = [];
    let pulses = new Map(); // nodeId -> pulse start time
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The graph is the heaviest thing on the page (O(n²) force simulation +
    // a full canvas repaint every frame) and it sits well below the fold, so
    // pausing it while it's scrolled off screen is a meaningful CPU/battery
    // saving, not just a nicety.
    let graphVisible = true;
    let loopRafId = null;

    // ---- Stats bar (counts feed the existing count-up-on-scroll script) ----
    if (extras.stats) {
      const s = extras.stats;
      if (s.skills) s.skills.dataset.countTo = PORTFOLIO.nodes.skills.length;
      if (s.projects) s.projects.dataset.countTo = PORTFOLIO.nodes.projects.length;
      if (s.experience) s.experience.dataset.countTo = PORTFOLIO.nodes.experience.length;
      if (s.achievements) s.achievements.dataset.countTo = PORTFOLIO.nodes.achievements.length;
      if (s.connections) s.connections.dataset.countTo = edges.length;
    }

    function resize() {
      canvasRect = canvas.getBoundingClientRect();
      width = canvasRect.width; height = canvasRect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      computeLayout(nodes, width, height);
    }

    function screenToWorld(sx, sy) {
      return { x: (sx - view.ox) / view.scale, y: (sy - view.oy) / view.scale };
    }

    function isVisible(n) {
      if (activeFilter === "all") return true;
      if (n.type === "core" || n.type === "hub") return true;
      return n.type === activeFilter;
    }

    function spawnT(n) {
      if (reducedMotion) return 1;
      const t = (now - startTime - n.spawnDelay) / 420;
      return clamp(t, 0, 1);
    }

    // ---- Physics tick: anchor springs + gentle repulsion + breathing -----
    function tick(dtMs) {
      const ANCHOR_SPRING = 0.052;
      const REPEL = 420;
      const REPEL_DIST = 70;
      const REPEL_DIST_SQ = REPEL_DIST * REPEL_DIST;
      const DAMP = 0.82;
      const BREATH_AMPL = 3.2;
      const BREATH_SPEED = 0.00045;

      const n = nodes.length;
      const fxs = forceX, fys = forceY;
      fxs.fill(0); fys.fill(0);

      // mild local repulsion so densely packed leaves don't overlap.
      // Computed once per pair (i<j) and applied equal-and-opposite to both
      // sides, instead of the old i-scans-all-j / j-scans-all-i approach
      // which did the same sqrt+divide work twice per pair.
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
          fxs[i] += fx; fys[i] += fy;
          fxs[j] -= fx; fys[j] -= fy;
        }
      }

      for (let i = 0; i < n; i++) {
        const node = nodes[i];
        const t = spawnT(node);
        if (t <= 0) { node.x = node.ax; node.y = node.ay; continue; }
        if (node === dragNode) continue;

        let fx = fxs[i], fy = fys[i];

        // breathing: tiny idle drift around the anchor so it never looks frozen
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

    // ---- Render --------------------------------------------------------
    function render() {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(view.ox, view.oy);
      ctx.scale(view.scale, view.scale);

      const highlightSet = selected ? adjacency.get(selected.id) : (hovered ? adjacency.get(hovered.id) : null);
      const focus = selected || hovered;

      // ambient glow behind the core
      const core = nodeById.get("core");
      if (core) {
        const g = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, Math.min(width, height) * 0.34);
        g.addColorStop(0, "rgba(111,227,196,0.10)");
        g.addColorStop(1, "rgba(111,227,196,0)");
        ctx.fillStyle = g;
        ctx.fillRect(core.x - 500, core.y - 500, 1000, 1000);
      }

      // edges
      edges.forEach(e => {
        const at = spawnT(e.a), bt = spawnT(e.b);
        if (at <= 0 || bt <= 0) return;
        const visA = e.a.visAlpha, visB = e.b.visAlpha;
        const vis = Math.min(visA, visB);
        if (vis <= 0.01) return;
        const isHot = focus && (e.a === focus || e.b === focus);
        e._hotAlpha = lerp(e._hotAlpha || 0, isHot ? 1 : 0, 0.18);
        const isHoveredEdge = hoveredEdge === e;
        const isStructural = structuralIds.has(e.a.id + "|" + e.b.id);
        ctx.beginPath();
        ctx.moveTo(e.a.x, e.a.y);
        ctx.lineTo(e.b.x, e.b.y);
        const hotMix = e._hotAlpha;
        ctx.strokeStyle = isHoveredEdge ? (COLORS[e.a.type] || COLORS.text) : (hotMix > 0.02 ? hexToRgba(COLORS.text, hotMix * 0.6) : (isStructural ? COLORS.border : COLORS.faintEdge));
        ctx.lineWidth = isHoveredEdge ? 2.2 : lerp(isStructural ? 0.85 : 0.6, 1.5, hotMix);
        ctx.globalAlpha = Math.min(at, bt) * vis;
        ctx.stroke();

        // a small particle gliding along edges touching the current focus —
        // reinforces "this is a live connection", not just a highlighted line
        if (hotMix > 0.4 && !reducedMotion) {
          const cycle = 1100;
          const dir = focus === e.a ? 1 : -1;
          const local = (((now + (e.a.order + e.b.order) * 90) % cycle) / cycle);
          const tt = dir === 1 ? local : 1 - local;
          const px = lerp(e.a.x, e.b.x, tt);
          const py = lerp(e.a.y, e.b.y, tt);
          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(COLORS[focus.type] || COLORS.text, hotMix * 0.85);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // pulse rings around the selected node
      if (selected && isVisible(selected)) {
        const el = ((now - selectedAt) % 1800) / 1800;
        for (let k = 0; k < 2; k++) {
          const local = (el + k * 0.5) % 1;
          const rr = selected.r + 6 + local * 30;
          ctx.beginPath();
          ctx.arc(selected.x, selected.y, rr, 0, Math.PI * 2);
          ctx.strokeStyle = hexToRgba(COLORS[selected.type] || COLORS.text, 0.35 * (1 - local));
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      // reveal pulses on newly-discovered neighbor nodes (fired from focusNode)
      pulses.forEach((startedAt, id) => {
        const n = nodeById.get(id);
        const age = now - startedAt;
        if (!n || age > 900) { pulses.delete(id); return; }
        if (!isVisible(n)) return;
        const local = clamp(age / 900, 0, 1);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 4 + local * 16, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(COLORS[n.type] || COLORS.text, 0.5 * (1 - local));
        ctx.lineWidth = 1.6;
        ctx.stroke();
      });

      // nodes
      nodes.forEach(n => {
        if (n.visAlpha <= 0.01) return;
        const t = spawnT(n);
        if (t <= 0) return;

        const isConnected = isHotNode(n, focus, highlightSet);
        const wantDim = focus && !isConnected;
        n.dimAlpha = lerp(n.dimAlpha, wantDim ? 0.22 : 1, 0.18);
        // connected-but-not-the-focus-itself nodes get their own soft halo,
        // eased in/out, so "this skill/project/achievement is linked" reads
        // as a distinct state rather than just "not dimmed"
        const isFocused = n === focus;
        n.hotAlpha = lerp(n.hotAlpha, (isConnected && !isFocused) ? 1 : 0, 0.15);
        // a quick, independent lift for whatever's directly under the cursor
        // right now, on top of (and faster than) the click-selection state
        n._hoverT = lerp(n._hoverT || 0, n === hovered ? 1 : 0, 0.28);

        const color = COLORS[n.type] || COLORS.hub;
        const pop = EASE_OUT_BACK(t);
        const r = n.r * clamp(pop, 0, 1.15) * (1 + n._hoverT * 0.08);

        ctx.globalAlpha = n.dimAlpha * t * n.visAlpha;

        if (isFocused) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 9, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(color, 0.16);
          ctx.fill();
        } else if (n.hotAlpha > 0.02) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 5, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(color, 0.13 * n.hotAlpha);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 5, 0, Math.PI * 2);
          ctx.lineWidth = 1;
          ctx.strokeStyle = hexToRgba(color, 0.35 * n.hotAlpha);
          ctx.stroke();
        }

        if (n.type !== "hub") {
          ctx.shadowBlur = isFocused ? 18 : lerp(7, 13, n.hotAlpha);
          ctx.shadowColor = hexToRgba(color, isFocused ? 0.7 : lerp(0.35, 0.55, n.hotAlpha));
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(r, 0), 0, Math.PI * 2);
        ctx.fillStyle = n.type === "hub" ? COLORS.hubFill : hexToRgba(color, n.type === "core" ? 1 : 0.88);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = n.type === "hub" ? 1 : 1.5;
        ctx.strokeStyle = n.type === "hub" ? COLORS.hubStroke : color;
        ctx.stroke();

        // labels: always for core/hub, else on hover/selected/or when zoomed in
        const showLabel = n.type === "core" || n.type === "hub" || isFocused || (highlightSet && highlightSet.has(n.id)) || view.scale > 1.35;

        // small badge glyph centered in the circle — skip on "core" (its name
        // already reads outside) and on skills unless their label is showing
        // (too small otherwise to read as anything but noise)
        const badge = badgeFor(n);
        if (badge && n.type !== "core" && (n.type !== "skill" || showLabel) && r > 5) {
          ctx.font = `${Math.round(clamp(r * 0.95, 7, 13))}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(badge, n.x, n.y + 0.5);
        }

        if (showLabel && t > 0.6) {
          ctx.globalAlpha = n.dimAlpha * ((t - 0.6) / 0.4) * n.visAlpha;
          ctx.font = n.type === "core" ? "600 17px Fraunces, serif" : n.type === "hub" ? "600 11.5px 'JetBrains Mono', monospace" : "500 11.5px 'IBM Plex Sans', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          const label = n.type === "hub" ? n.label.toUpperCase() : n.label;
          if (n.type === "hub") {
            // small pill behind hub labels so they read clearly over the web of lines
            const tw = ctx.measureText(label).width;
            ctx.fillStyle = COLORS.labelPill;
            ctx.fillRect(n.x - tw / 2 - 6, n.y + r + 4, tw + 12, 16);
            ctx.fillStyle = COLORS.textDim;
            ctx.fillText(label, n.x, n.y + r + 6);
          } else if (n.type !== "core") {
            // same "pill behind the text" treatment for leaf labels — without
            // it, labels sit directly on the crossing edge-lines and are
            // noticeably harder to read the moment more than one is showing
            const tw = ctx.measureText(label).width;
            ctx.fillStyle = COLORS.labelPill;
            ctx.fillRect(n.x - tw / 2 - 5, n.y + r + 4, tw + 10, 15);
            ctx.fillStyle = COLORS.text;
            ctx.fillText(label, n.x, n.y + r + 6);
          } else {
            ctx.fillStyle = COLORS.text;
            ctx.fillText(label, n.x, n.y + r + 6);
          }
        }
        ctx.globalAlpha = 1;
      });

      ctx.restore();
    }

    function isHotNode(n, focus, highlightSet) {
      if (n === focus) return true;
      if (highlightSet && highlightSet.has(n.id)) return true;
      return false;
    }

    function hexToRgba(hex, alpha) {
      hex = hex.replace("#", "");
      if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    // ---- Hit testing -----------------------------------------------------
    function nodeAt(sx, sy) {
      const w = screenToWorld(sx, sy);
      let best = null, bestD = Infinity;
      for (const n of nodes) {
        if (n.visAlpha < 0.5) continue;
        if (spawnT(n) < 0.5) continue;
        const dx = n.x - w.x, dy = n.y - w.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= n.r + 6 && d < bestD) { best = n; bestD = d; }
      }
      return best;
    }

    function distToSegment(px, py, ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay;
      const lenSq = dx * dx + dy * dy;
      let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
      t = clamp(t, 0, 1);
      const cx = ax + t * dx, cy = ay + t * dy;
      return Math.hypot(px - cx, py - cy);
    }

    function edgeAt(sx, sy) {
      const w = screenToWorld(sx, sy);
      const threshold = 5 / view.scale;
      let best = null, bestD = Infinity;
      for (const e of edges) {
        if (spawnT(e.a) < 0.6 || spawnT(e.b) < 0.6) continue;
        if (e.a.visAlpha < 0.5 || e.b.visAlpha < 0.5) continue;
        const d = distToSegment(w.x, w.y, e.a.x, e.a.y, e.b.x, e.b.y);
        if (d <= threshold && d < bestD) { best = e; bestD = d; }
      }
      return best;
    }

    // ---- Panel -------------------------------------------------------------
    const TYPE_LABEL = { skill: "Skill", project: "Project", experience: "Experience", achievement: "Achievement", hub: "Category", core: "Profile" };

    function openPanel(n, opts) {
      opts = opts || {};
      selected = n;
      selectedAt = now;
      panelEls.empty.hidden = true;
      panelEls.content.hidden = false;
      panelEls.content.classList.remove("is-animating");
      // restart the CSS entrance animation on every new selection
      void panelEls.content.offsetWidth;
      panelEls.content.classList.add("is-animating");

      panelEls.type.textContent = TYPE_LABEL[n.type] || n.type;
      panelEls.type.style.color = COLORS[n.type] || COLORS.text;
      panelEls.type.style.background = hexToRgba(COLORS[n.type] || COLORS.hub, 0.14);
      panelEls.title.textContent = n.label;

      if (panelEls.degree) {
        panelEls.degree.textContent = n.degree ? `${n.degree} connection${n.degree === 1 ? "" : "s"}` : "";
      }

      let meta = "";
      if (n.date) meta = n.date;
      if (n.org) meta = n.org + (n.date ? " · " + n.date : "");
      panelEls.meta.textContent = meta;
      panelEls.meta.style.display = meta ? "block" : "none";

      panelEls.desc.textContent = n.description || n.summary || descriptionFor(n);

      // "Why it's here" — only meaningful for skills, generated from who uses them
      if (panelEls.why && panelEls.whyText) {
        const why = whyText(n);
        panelEls.why.hidden = !why;
        if (why) panelEls.whyText.textContent = why;
      }

      // Impact / Learned — project nodes only, sourced from data.js
      if (panelEls.impact && panelEls.impactList) {
        const has = n.type === "project" && n.impact && n.impact.length;
        panelEls.impact.hidden = !has;
        panelEls.impactList.innerHTML = "";
        if (has) n.impact.forEach(t => { const li = document.createElement("li"); li.textContent = t; panelEls.impactList.appendChild(li); });
      }
      if (panelEls.learned && panelEls.learnedList) {
        const has = n.type === "project" && n.learned && n.learned.length;
        panelEls.learned.hidden = !has;
        panelEls.learnedList.innerHTML = "";
        if (has) n.learned.forEach(t => { const li = document.createElement("li"); li.textContent = t; panelEls.learnedList.appendChild(li); });
      }

      panelEls.tags.innerHTML = "";
      if (n.tags && n.tags.length) {
        n.tags.forEach(t => {
          const span = document.createElement("span");
          span.textContent = t;
          panelEls.tags.appendChild(span);
        });
      }

      panelEls.connections.innerHTML = "";
      const conn = Array.from(adjacency.get(n.id) || []).map(id => nodeById.get(id)).filter(Boolean);
      conn.sort((a, b) => a.type.localeCompare(b.type));
      conn.forEach(c => {
        const li = document.createElement("li");
        li.textContent = c.label;
        li.style.setProperty("--dot-color", COLORS[c.type] || COLORS.hub);
        li.addEventListener("click", () => focusNode(c));
        panelEls.connections.appendChild(li);
      });
      if (panelEls.connCount) panelEls.connCount.textContent = conn.length ? `(${conn.length})` : "";

      if (n.link && n.link !== "#" && n.link !== null) {
        panelEls.link.href = n.link;
        panelEls.link.hidden = false;
      } else {
        panelEls.link.hidden = true;
      }

      hintEl.style.opacity = "0";
      if (!opts.silent) addBreadcrumb(n);
    }

    function whyText(n) {
      if (n.type !== "skill") return "";
      const conn = Array.from(adjacency.get(n.id) || []).map(id => nodeById.get(id)).filter(Boolean);
      const projects = conn.filter(c => c.type === "project").map(c => c.label);
      const exp = conn.filter(c => c.type === "experience").map(c => c.label);
      const ach = conn.filter(c => c.type === "achievement").map(c => c.label);
      const parts = [];
      if (projects.length) parts.push(`used in ${projects.join(", ")}`);
      if (exp.length) parts.push(`built up during ${exp.join(", ")}`);
      if (ach.length) parts.push(`proven by ${ach.join(", ")}`);
      if (!parts.length) return "";
      return n.label + " — " + parts.join("; ") + ".";
    }

    function descriptionFor(n) {
      if (n.type === "hub") return "A category cluster — click any node inside it to explore what " + PORTFOLIO.profile.name.split(" ")[0] + " has built or learned there.";
      if (n.type === "core") return PORTFOLIO.profile.tagline;
      return "";
    }

    // ---- Smart zoom / focus: center + zoom to a node, open its panel, -----
    // ---- pulse its neighbors, and record the step on the breadcrumb -------
    function focusNode(n, opts) {
      opts = opts || {};
      if (!n) return;
      if (!isVisible(n) && activeFilter !== "all") {
        activeFilter = "all";
        filtersEl.querySelectorAll(".filter-chip").forEach(b => b.classList.toggle("is-active", b.dataset.filter === "all"));
      }
      openPanel(n);
      const targetScale = clamp(opts.zoom || Math.max(view.scale, 1.5), 0.6, 2.4);
      animateViewTo(n.x, n.y, targetScale);
      pulseNeighbors(n);
    }

    function animateViewTo(wx, wy, targetScale) {
      if (reducedMotion) {
        view.scale = targetScale;
        view.ox = width / 2 - wx * targetScale;
        view.oy = height / 2 - wy * targetScale;
        return;
      }
      viewAnim = {
        startOx: view.ox, startOy: view.oy, startScale: view.scale,
        targetOx: width / 2 - wx * targetScale,
        targetOy: height / 2 - wy * targetScale,
        targetScale,
        startTime: now, duration: 560
      };
    }

    function pulseNeighbors(n) {
      const neighbors = Array.from(adjacency.get(n.id) || []);
      neighbors.forEach((id, i) => {
        setTimeout(() => { pulses.set(id, performance.now()); }, i * 55);
      });
    }

    // ---- Breadcrumb trail ---------------------------------------------------
    function addBreadcrumb(n) {
      if (!extras.breadcrumb) return;
      const last = breadcrumbPath[breadcrumbPath.length - 1];
      if (last === n) return;
      breadcrumbPath.push(n);
      if (breadcrumbPath.length > 6) breadcrumbPath.shift();
      renderBreadcrumb();
    }

    function renderBreadcrumb() {
      const el = extras.breadcrumb;
      if (!el) return;
      if (breadcrumbPath.length < 1) { el.hidden = true; el.innerHTML = ""; return; }
      el.hidden = false;
      const core = nodeById.get("core");
      const items = core && breadcrumbPath[0] !== core ? [core, ...breadcrumbPath] : breadcrumbPath;
      el.innerHTML = items.map((node, i) => {
        const isLast = i === items.length - 1;
        // idx maps back into breadcrumbPath; the synthetic home crumb uses -1
        const idx = (items === breadcrumbPath) ? i : i - 1;
        return `<button type="button" class="graph-breadcrumb__item${isLast ? " is-current" : ""}" data-idx="${idx}" ${isLast ? 'aria-current="step"' : ""}>${node.label}</button>`;
      }).join('<span class="graph-breadcrumb__sep">\u203A</span>');
    }

    if (extras.breadcrumb) {
      extras.breadcrumb.addEventListener("click", (e) => {
        const btn = e.target.closest(".graph-breadcrumb__item");
        if (!btn) return;
        const idx = parseInt(btn.dataset.idx, 10);
        const core = nodeById.get("core");
        if (idx < 0) {
          breadcrumbPath = [];
          if (core) { openPanel(core, { silent: true }); animateViewTo(core.x, core.y, Math.max(view.scale, 1.2)); }
          renderBreadcrumb();
          return;
        }
        const node = breadcrumbPath[idx];
        breadcrumbPath = breadcrumbPath.slice(0, idx + 1);
        if (node) {
          // re-open without re-pushing a duplicate breadcrumb entry
          openPanel(node, { silent: true });
          animateViewTo(node.x, node.y, Math.max(view.scale, 1.5));
          renderBreadcrumb();
        }
      });
    }

    // ---- Edge hover tooltip (DOM) -------------------------------------------
    function showEdgeTooltip(edge, sx, sy) {
      const el = extras.tooltip;
      if (!el) return;
      if (!edge) { hideEdgeTooltip(); return; }
      const isStructural = structuralIds.has(edge.a.id + "|" + edge.b.id) || structuralIds.has(edge.b.id + "|" + edge.a.id);
      const [top, bottom] = orderedPair(edge.a, edge.b);
      const verb = relationshipLabel(edge.a, edge.b, isStructural);
      el.innerHTML = `<span class="graph-tooltip__node">${top.label}</span><span class="graph-tooltip__verb">${verb}</span><span class="graph-tooltip__node">${bottom.label}</span>`;
      el.hidden = false;
      positionTooltip(sx, sy);
    }
    function positionTooltip(sx, sy) {
      const el = extras.tooltip;
      if (!el || el.hidden) return;
      el.style.left = `${sx + 14}px`;
      el.style.top = `${sy + 14}px`;
    }
    function hideEdgeTooltip() {
      const el = extras.tooltip;
      if (el) el.hidden = true;
    }

    // ---- Search: filter, list matches, auto-focus best match ---------------
    if (extras.search && extras.search.input) {
      const input = extras.search.input;
      const resultsEl = extras.search.results;
      let searchTimer = null;

      function matches(query) {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return nodes
          .filter(n => n.type !== "core" && n.type !== "hub" && n.label.toLowerCase().includes(q))
          .sort((a, b) => a.label.toLowerCase().indexOf(q) - b.label.toLowerCase().indexOf(q))
          .slice(0, 6);
      }

      function renderResults(list) {
        if (!resultsEl) return;
        if (!list.length) { resultsEl.hidden = true; resultsEl.innerHTML = ""; return; }
        resultsEl.hidden = false;
        resultsEl.innerHTML = list.map(n =>
          `<li data-id="${n.id}"><span class="graph-search__dot" style="background:${COLORS[n.type] || COLORS.hub}"></span>${n.label}<span class="graph-search__type">${TYPE_LABEL[n.type] || n.type}</span></li>`
        ).join("");
      }

      input.addEventListener("input", () => {
        const list = matches(input.value);
        renderResults(list);
        clearTimeout(searchTimer);
        if (list.length) {
          // "smart" auto-focus: zoom/highlight/open panel/pulse the top match
          // as the person types, debounced so it doesn't fight fast typing
          searchTimer = setTimeout(() => focusNode(list[0]), 320);
        }
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const list = matches(input.value);
          if (list.length) { clearTimeout(searchTimer); focusNode(list[0]); }
        } else if (e.key === "Escape") {
          input.value = "";
          renderResults([]);
          input.blur();
        }
      });

      if (resultsEl) {
        resultsEl.addEventListener("click", (e) => {
          const li = e.target.closest("li[data-id]");
          if (!li) return;
          const n = nodeById.get(li.dataset.id);
          if (n) { clearTimeout(searchTimer); focusNode(n); }
          renderResults([]);
        });
      }

      document.addEventListener("click", (e) => {
        if (resultsEl && !resultsEl.hidden && !resultsEl.contains(e.target) && e.target !== input) {
          renderResults([]);
        }
      });
    }

    // ---- Events --------------------------------------------------------
    canvas.addEventListener("pointerdown", (e) => {
      viewAnim = null;
      if (!canvasRect) canvasRect = canvas.getBoundingClientRect();
      const sx = e.clientX - canvasRect.left, sy = e.clientY - canvasRect.top;
      const n = nodeAt(sx, sy);
      didDrag = false;
      if (n) {
        dragNode = n;
        const w = screenToWorld(sx, sy);
        dragOffset.x = n.x - w.x;
        dragOffset.y = n.y - w.y;
        canvas.classList.add("is-dragging");
      } else {
        isPanning = true;
        panStart.x = sx - view.ox;
        panStart.y = sy - view.oy;
        canvas.classList.add("is-dragging");
      }
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!canvasRect) canvasRect = canvas.getBoundingClientRect();
      const sx = e.clientX - canvasRect.left, sy = e.clientY - canvasRect.top;
      mouse.x = sx; mouse.y = sy;

      if (dragNode) {
        didDrag = true;
        const w = screenToWorld(sx, sy);
        const newX = w.x + dragOffset.x, newY = w.y + dragOffset.y;
        dragNode._relVX = newX - dragNode.x;
        dragNode._relVY = newY - dragNode.y;
        dragNode.x = newX;
        dragNode.y = newY;
        // dropping should "rearrange" — move the anchor too, so the node
        // settles where the user put it instead of springing back
        dragNode.ax = dragNode.x;
        dragNode.ay = dragNode.y;
        dragNode.vx = 0; dragNode.vy = 0;
      } else if (isPanning) {
        didDrag = true;
        view.ox = sx - panStart.x;
        view.oy = sy - panStart.y;
      } else {
        const n = nodeAt(sx, sy);
        if (n !== hovered) {
          hovered = n;
          canvas.style.cursor = n ? "pointer" : "grab";
        }
        if (!n) {
          const edge = edgeAt(sx, sy);
          if (edge !== hoveredEdge) {
            hoveredEdge = edge;
            showEdgeTooltip(edge, sx, sy);
          } else if (edge) {
            positionTooltip(sx, sy);
          }
        } else if (hoveredEdge) {
          hoveredEdge = null;
          hideEdgeTooltip();
        }
      }
    });

    function endDrag() {
      canvas.classList.remove("is-dragging");
      if (dragNode) {
        dragNode.vx = (dragNode._relVX || 0) * 0.5;
        dragNode.vy = (dragNode._relVY || 0) * 0.5;
      }
      dragNode = null;
      isPanning = false;
    }

    canvas.addEventListener("pointerup", (e) => {
      if (!canvasRect) canvasRect = canvas.getBoundingClientRect();
      const sx = e.clientX - canvasRect.left, sy = e.clientY - canvasRect.top;
      const wasDrag = didDrag;
      endDrag();
      if (!wasDrag) {
        const n = nodeAt(sx, sy);
        if (n) focusNode(n);
      }
    });

    canvas.addEventListener("dblclick", (e) => {
      if (!canvasRect) canvasRect = canvas.getBoundingClientRect();
      const sx = e.clientX - canvasRect.left, sy = e.clientY - canvasRect.top;
      const n = nodeAt(sx, sy);
      if (n) focusNode(n, { zoom: 1.85 });
    });

    canvas.addEventListener("pointerleave", () => { hovered = null; hoveredEdge = null; hideEdgeTooltip(); });

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      viewAnim = null;
      if (!canvasRect) canvasRect = canvas.getBoundingClientRect();
      const sx = e.clientX - canvasRect.left, sy = e.clientY - canvasRect.top;
      const before = screenToWorld(sx, sy);
      const delta = -e.deltaY * 0.0012;
      view.scale = Math.min(2.4, Math.max(0.45, view.scale * (1 + delta)));
      const after = screenToWorld(sx, sy);
      view.ox += (after.x - before.x) * view.scale;
      view.oy += (after.y - before.y) * view.scale;
    }, { passive: false });

    // filters
    filtersEl.querySelectorAll(".filter-chip").forEach(btn => {
      btn.addEventListener("click", () => {
        filtersEl.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        activeFilter = btn.dataset.filter;
      });
    });

    // ---- Main loop -------------------------------------------------------
    let lastT = 0;
    function loop(ts) {
      if (!lastT) lastT = ts;
      const dtMs = clamp(ts - lastT, 1, 48);
      lastT = ts;
      now = ts;
      applyViewAnim();
      tick(dtMs);
      render();
      if (graphVisible) loopRafId = requestAnimationFrame(loop);
      else loopRafId = null;
    }

    function applyViewAnim() {
      if (!viewAnim) return;
      const t = clamp((now - viewAnim.startTime) / viewAnim.duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      view.ox = lerp(viewAnim.startOx, viewAnim.targetOx, eased);
      view.oy = lerp(viewAnim.startOy, viewAnim.targetOy, eased);
      view.scale = lerp(viewAnim.startScale, viewAnim.targetScale, eased);
      if (t >= 1) viewAnim = null;
    }

    function start() {
      resize();
      // seed initial position AT the anchor (offscreen tiny) so the pop-in
      // animation reads as "growing" rather than "flying in from nowhere"
      nodes.forEach(n => { n.x = n.ax; n.y = n.ay; });
      assignSpawnDelays(nodes, nodeById);
      startTime = performance.now();
      loopRafId = requestAnimationFrame((ts) => { startTime = ts; loop(ts); });
    }

    let resizeRaf = null;
    window.addEventListener("resize", () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => { resizeRaf = null; resize(); });
    });

    let scrollRaf = null;
    window.addEventListener("scroll", () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => { scrollRaf = null; if (canvas) canvasRect = canvas.getBoundingClientRect(); });
    }, { passive: true });

    if ("IntersectionObserver" in window) {
      const visibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          graphVisible = entry.isIntersecting;
          if (graphVisible && loopRafId === null) loopRafId = requestAnimationFrame(loop);
        });
      }, { threshold: 0 });
      visibilityObserver.observe(canvas);
    }

    start();

    // populate the side panel immediately so it's never empty on load —
    // open on the core profile node instead of waiting for a click
    const defaultNode = nodeById.get("core") || nodes[0];
    if (defaultNode) openPanel(defaultNode, { silent: true });

    return { openPanel, focusNode, nodeById };
  }

  window.KnowledgeGraph = { init: initGraph };
})();
