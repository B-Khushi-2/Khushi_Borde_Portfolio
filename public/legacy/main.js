/* ============================================================================
   MAIN — page population + interactions
   Reads PORTFOLIO from data.js and fills in every section that isn't the
   graph itself (the graph is handled by graph.js).
   ============================================================================ */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---- Shared perf/a11y helpers ------------------------------------------------
  // Reduced-motion is read once and kept live via the media query's own change
  // event, instead of re-querying matchMedia() in a dozen different IIFEs.
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let prefersReducedMotion = reducedMotionQuery.matches;
  const onReducedMotionChange = (e) => { prefersReducedMotion = e.matches; };
  if (reducedMotionQuery.addEventListener) reducedMotionQuery.addEventListener("change", onReducedMotionChange);
  else if (reducedMotionQuery.addListener) reducedMotionQuery.addListener(onReducedMotionChange); // Safari <14

  // Runs `fn` at most once per animation frame no matter how often it's called —
  // keeps scroll/resize handlers off the main thread's critical path.
  function rafThrottle(fn) {
    let scheduled = false;
    return (...args) => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; fn(...args); });
    };
  }

  // Pauses a rAF-driven animation loop while its element is scrolled off
  // screen (canvases keep costing CPU/GPU/battery otherwise) and resumes it
  // the moment it re-enters the viewport.
  function pauseWhenOffscreen(el, { onEnter, onExit } = {}) {
    if (!("IntersectionObserver" in window) || !el) { onEnter && onEnter(); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => (entry.isIntersecting ? onEnter : onExit)?.());
    }, { threshold: 0 });
    io.observe(el);
    return io;
  }

  // Filled in once the graph initializes (bottom of this file). Any code
  // above can still reference it inside a callback — by the time a user
  // can actually click anything, the graph has already finished setting up.
  let graphHandle = null;

  // ---- Tiny hand-rolled icon set (no external icon library / no network dep) --
  const ICONS = {
    rocket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 19 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`,
    briefcase: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h2.5a2.5 2.5 0 0 1 0 5H17"/><path d="M7 5H4.5a2.5 2.5 0 0 0 0 5H7"/></svg>`,
    grad: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5"/><path d="M22 10v6"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4L2 12l6 8"/><path d="M16 4l6 8-6 8"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
    medal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="15" r="6"/><path d="M12 11l1.5 3 3.3.3-2.5 2.2.8 3.3-3.1-1.8-3.1 1.8.8-3.3-2.5-2.2 3.3-.3z"/><path d="M8.5 8.5L6 2m9.5 6.5L18 2"/></svg>`,
    certificate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21l4-2.5L16 21"/><path d="M7 9h10M7 12.5h6"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    chevronLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`,
    chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`,
    github: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.58.24 2.75.12 3.04.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12c0-6.27-5.23-11.5-11.5-11.5z"/></svg>`,
    externalLink: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>`,
    target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>`,
    bulb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.47c.55.5.99 1.13 1.2 1.83.11.36.17.55.17.7H14.63c0-.15.06-.34.17-.7.21-.7.65-1.33 1.2-1.83A6 6 0 0 0 12 3z"/></svg>`,
    layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.6 4.9L2 18.3 4.7 21l7.1-7.1a4 4 0 0 0 4.9-5.6l-2.5 2.5-2.1-2.1z"/></svg>`,
    scale: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 8h14M5 8l-3 6a3.5 3.5 0 0 0 6 0l-3-6zM19 8l-3 6a3.5 3.5 0 0 0 6 0l-3-6z"/></svg>`,
    trendUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>`,
    server: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="7" rx="1.5"/><rect x="2" y="14" width="20" height="7" rx="1.5"/><path d="M6 6.5h.01M6 17.5h.01"/></svg>`
  };

  // Pick an icon for an experience entry based on its organisation/title.
  function iconForExperience(e) {
    const s = `${e.org} ${e.label}`.toLowerCase();
    if (s.includes("gdg") || s.includes("google") || s.includes("technical team")) return ICONS.code;
    if (s.includes("university") || s.includes("college")) return ICONS.grad;
    return ICONS.rocket;
  }

  // Classifies each experience into a category with its own accent color,
  // purely from keywords already in the label/org — no invented data.
  function typeForExperience(e) {
    const s = `${e.org} ${e.label}`.toLowerCase();
    if (s.includes("technical team") || s.includes("lead") || s.includes("captain")) {
      return { label: "Leadership", varName: "--c-leadership" };
    }
    if (s.includes("hackathon")) return { label: "Hackathon", varName: "--c-skill" };
    if (s.includes("research")) return { label: "Research", varName: "--c-project" };
    return { label: "AI/ML Internship", varName: "--c-experience" };
  }

  // Pulls the skills actually linked to this node in PORTFOLIO.edges — real
  // connections already drawn on the graph, not invented for display here.
  function relatedSkillsFor(nodeId) {
    const skillById = new Map(PORTFOLIO.nodes.skills.map(s => [s.id, s.label]));
    const labels = [];
    PORTFOLIO.edges.forEach(edge => {
      const [a, b] = edge;
      if (a === nodeId && skillById.has(b)) labels.push(skillById.get(b));
      else if (b === nodeId && skillById.has(a)) labels.push(skillById.get(a));
    });
    return [...new Set(labels)];
  }

  // A small monogram badge standing in for a company logo — derived purely
  // from the org name already in the data (uses a "(GDG)"-style acronym if
  // present, else initials). Deliberately not a real logo image: we don't
  // have licensed logo assets to use, and a fabricated/guessed one would be
  // worse than an honest monogram.
  function logoMarkFor(org) {
    const acronym = org.match(/\(([A-Z0-9]{2,5})\)/);
    if (acronym) return acronym[1].slice(0, 4);
    const words = org.replace(/\([^)]*\)/g, "").trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return words.slice(0, 3).map(w => w[0]).join("").toUpperCase();
  }

  // ---- Force the hero video to actually play ---------------------------------
  // It's muted + autoplay + loop in the markup, which covers virtually every
  // browser, but some environments still need play() called explicitly (e.g.
  // if a script runs before the element has finished loading its metadata).
  // This guarantees it starts, and keeps retrying on the first interaction if
  // an autoplay policy blocked the initial attempt.
  (function forcePlayHeroVideo() {
    const video = $("#heroVideo");
    if (!video) return;

    function tryPlay() {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => { /* retried below */ });
    }

    video.muted = true;
    tryPlay();
    video.addEventListener("loadedmetadata", tryPlay);
    video.addEventListener("canplay", tryPlay);

    const retry = () => {
      if (video.paused) tryPlay();
    };
    ["pointerdown", "touchstart", "scroll", "keydown"].forEach(evt =>
      window.addEventListener(evt, retry, { passive: true })
    );
  })();

  // ---- Hero text -----------------------------------------------------------
  const nameParts = PORTFOLIO.profile.name.trim().split(/\s+/);
  const heroFirst = $("#heroNameFirst"), heroLast = $("#heroNameLast");
  if (heroFirst && heroLast) {
    heroFirst.textContent = nameParts[0] || PORTFOLIO.profile.name;
    heroLast.textContent = nameParts.slice(1).join(" ");
    if (!heroLast.textContent) heroLast.style.display = "none";
  }
  $("#heroTagline").textContent = PORTFOLIO.profile.tagline;
  document.title = `${PORTFOLIO.profile.name} — ${PORTFOLIO.profile.role}`;

  // ---- Contact / footer ----------------------------------------------------
  const edu = PORTFOLIO.profile.education;
  $("#contactEducation").textContent = `${edu.degree} · ${edu.school} · ${edu.detail}`;
  $("#contactEmail").href = `mailto:${PORTFOLIO.profile.email}`;
  $("#contactEmail").textContent = PORTFOLIO.profile.email;
  if ($("#contactPhone")) {
    const phoneNum = PORTFOLIO.profile.phone || "8010648383";
    $("#contactPhone").href = `tel:${phoneNum}`;
    $("#contactPhone").textContent = phoneNum.startsWith("+") ? phoneNum : `+91 ${phoneNum}`;
  }
  $("#contactLocation").textContent = PORTFOLIO.profile.location;
  $("#contactGithub").href = PORTFOLIO.profile.links.github;
  $("#contactLinkedin").href = PORTFOLIO.profile.links.linkedin;
  $("#footerName").textContent = `© ${new Date().getFullYear()} ${PORTFOLIO.profile.name}`;

  // Resume buttons — download the PDF directly. Drop a file named
  // "resume.pdf" next to index.html and these will download it as-is;
  // change RESUME_FILE below if you'd rather name it something else.
  const RESUME_FILE = "resume.pdf";
  [$("#navResume"), $("#navResumeTwin")].forEach(btn => {
    if (!btn) return;
    btn.href = RESUME_FILE;
    btn.setAttribute("download", `${PORTFOLIO.profile.name.replace(/\s+/g, "_")}_Resume.pdf`);
  });

  // ---- Skills ecosystem -------------------------------------------------------
  // Renders the skill clusters and wires them to the rest of the page. Every
  // number and every "used in / built during / proven by" line below comes
  // straight from PORTFOLIO.edges — the same source the knowledge graph
  // draws from — so this can never drift out of sync with the graph.
  (function initSkillsEcosystem() {
    const shell = $("#skillsShell");
    const clustersEl = $("#skillsClusters");
    if (!shell || !clustersEl) return;

    const HUB_META = {
      hub_languages: { title: "Languages", sub: "The base layer everything I build compiles to." },
      hub_aiml: { title: "AI / ML", sub: "Where I turn research into something that actually runs — models, retrieval, agents." },
      hub_fullstack: { title: "Full Stack", sub: "How I turn my models into things people can actually click and use." }
    };
    const CLUSTER_ORDER = ["hub_languages", "hub_aiml", "hub_fullstack"];

    const nodeTypeById = new Map();
    const nodeById = new Map();
    ["projects", "experience", "achievements"].forEach(key => {
      PORTFOLIO.nodes[key].forEach(n => { nodeTypeById.set(n.id, key); nodeById.set(n.id, n); });
    });

    // skillId -> { projects: [{id,label}], experience: [...], achievements: [...] }
    const linkMap = new Map();
    PORTFOLIO.nodes.skills.forEach(s => linkMap.set(s.id, { projects: [], experience: [], achievements: [] }));
    PORTFOLIO.edges.forEach(([a, b]) => {
      [[a, b], [b, a]].forEach(([skillCand, otherCand]) => {
        if (!linkMap.has(skillCand)) return;
        const kind = nodeTypeById.get(otherCand);
        if (!kind) return;
        linkMap.get(skillCand)[kind].push({ id: otherCand, label: nodeById.get(otherCand).label });
      });
    });
    const degreeOf = id => {
      const l = linkMap.get(id);
      return l.projects.length + l.experience.length + l.achievements.length;
    };

    // ---- Render the three clusters ----
    CLUSTER_ORDER.forEach((hubId, i) => {
      const meta = HUB_META[hubId];
      const skills = PORTFOLIO.nodes.skills.filter(s => s.cluster === hubId);
      if (!skills.length || !meta) return;

      const cluster = document.createElement("div");
      cluster.className = "skills-cluster reveal";
      cluster.style.transitionDelay = `${i * 90}ms`;
      cluster.innerHTML = `
        <div class="skills-cluster__head">
          <span class="skills-cluster__num">0${i + 1}</span>
          <div>
            <h3 class="skills-cluster__title">${meta.title}</h3>
            <p class="skills-cluster__sub">${meta.sub}</p>
          </div>
        </div>
        <div class="skills-cluster__nodes">
          ${skills.map(s => {
            const d = degreeOf(s.id);
            return `<button type="button" class="skill-node" data-skill-id="${s.id}">
              <span class="skill-node__label">${s.label}</span>
              ${d ? `<span class="skill-node__count">${d}</span>` : ""}
            </button>`;
          }).join("")}
        </div>`;
      clustersEl.appendChild(cluster);
    });

    // ---- The readout panel ----
    const readout = {
      empty: $("#skillsReadoutEmpty"),
      content: $("#skillsReadoutContent"),
      panel: $("#skillsReadout"),
      cluster: $("#readoutCluster"),
      title: $("#readoutTitle"),
      projects: $("#readoutProjects"),
      projectsList: $("#readoutProjectsList"),
      experience: $("#readoutExperience"),
      experienceList: $("#readoutExperienceList"),
      achievements: $("#readoutAchievements"),
      achievementsList: $("#readoutAchievementsList"),
      fallback: $("#readoutFallback"),
      graphBtn: $("#readoutGraphBtn")
    };
    const wirePath = $("#skillsWirePath");
    let activeId = null;
    let lockedId = null;

    function jumpTo(nodeId) {
      const target = document.querySelector(`[data-node-id="${nodeId}"]`);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.remove("is-linked-flash");
      void target.offsetWidth;
      target.classList.add("is-linked-flash");
    }

    function fillList(ul, items, colorVar) {
      ul.innerHTML = "";
      items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item.label;
        li.style.setProperty("--dot-color", `var(${colorVar})`);
        li.addEventListener("click", () => jumpTo(item.id));
        ul.appendChild(li);
      });
    }

    function setLinked(skillId) {
      $$("[data-node-id]").forEach(el => el.classList.remove("is-linked"));
      const l = skillId && linkMap.get(skillId);
      if (!l) return;
      [...l.projects, ...l.experience, ...l.achievements].forEach(item => {
        $$(`[data-node-id="${item.id}"]`).forEach(el => el.classList.add("is-linked"));
      });
    }

    function updateWire(nodeEl) {
      if (!wirePath) return;
      const reducedMotion = prefersReducedMotion;
      if (reducedMotion || window.innerWidth < 900 || !nodeEl || !readout.panel) {
        wirePath.classList.remove("is-active");
        return;
      }
      const shellRect = shell.getBoundingClientRect();
      const nodeRect = nodeEl.getBoundingClientRect();
      const panelRect = readout.panel.getBoundingClientRect();
      const x1 = nodeRect.right - shellRect.left, y1 = nodeRect.top + nodeRect.height / 2 - shellRect.top;
      const x2 = panelRect.left - shellRect.left, y2 = panelRect.top - shellRect.top + 40;
      const midX = (x1 + x2) / 2;
      wirePath.setAttribute("d", `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
      wirePath.classList.add("is-active");
    }

    function select(skillId, nodeEl) {
      const skill = PORTFOLIO.nodes.skills.find(s => s.id === skillId);
      if (!skill) return;
      activeId = skillId;
      const l = linkMap.get(skillId);
      const total = l.projects.length + l.experience.length + l.achievements.length;

      readout.empty.hidden = true;
      readout.content.hidden = false;
      readout.content.classList.remove("is-animating");
      void readout.content.offsetWidth;
      readout.content.classList.add("is-animating");

      readout.cluster.textContent = (HUB_META[skill.cluster] || {}).title || "Skill";
      readout.title.textContent = skill.label;

      readout.projects.hidden = !l.projects.length;
      if (l.projects.length) fillList(readout.projectsList, l.projects, "--c-project");
      readout.experience.hidden = !l.experience.length;
      if (l.experience.length) fillList(readout.experienceList, l.experience, "--c-experience");
      readout.achievements.hidden = !l.achievements.length;
      if (l.achievements.length) fillList(readout.achievementsList, l.achievements, "--c-achievement");
      readout.fallback.hidden = total > 0;

      setLinked(skillId);
      $$(".skill-node", clustersEl).forEach(b => b.classList.toggle("is-active", b.dataset.skillId === skillId));
      updateWire(nodeEl);
    }

    function clear() {
      if (lockedId) return;
      activeId = null;
      readout.empty.hidden = false;
      readout.content.hidden = true;
      setLinked(null);
      $$(".skill-node", clustersEl).forEach(b => b.classList.remove("is-active"));
      if (wirePath) wirePath.classList.remove("is-active");
    }

    // Capture-phase delegation: pointerenter/leave don't bubble, but a
    // capture listener on the ancestor still receives them for descendants.
    clustersEl.addEventListener("pointerenter", e => {
      const node = e.target.closest && e.target.closest(".skill-node");
      if (node && !lockedId && activeId !== node.dataset.skillId) select(node.dataset.skillId, node);
    }, true);
    clustersEl.addEventListener("pointerleave", e => {
      const node = e.target.closest && e.target.closest(".skill-node");
      if (node && !lockedId) clear();
    }, true);
    clustersEl.addEventListener("focusin", e => {
      const node = e.target.closest(".skill-node");
      if (node && !lockedId) select(node.dataset.skillId, node);
    });
    clustersEl.addEventListener("focusout", e => {
      const node = e.target.closest(".skill-node");
      if (node && !lockedId) clear();
    });
    clustersEl.addEventListener("click", e => {
      const node = e.target.closest(".skill-node");
      if (!node) return;
      if (lockedId === node.dataset.skillId) { lockedId = null; clear(); }
      else { lockedId = node.dataset.skillId; select(lockedId, node); }
    });

    if (readout.graphBtn) {
      readout.graphBtn.addEventListener("click", () => {
        if (!activeId) return;
        const id = activeId;
        const graphSection = $("#graph");
        if (graphSection) graphSection.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          if (graphHandle && graphHandle.nodeById) {
            const n = graphHandle.nodeById.get(id);
            if (n) graphHandle.focusNode(n);
          }
        }, 600);
      });
    }

    const updateActiveWire = rafThrottle(() => {
      if (!activeId) return;
      updateWire(clustersEl.querySelector(`.skill-node[data-skill-id="${activeId}"]`));
    });
    window.addEventListener("scroll", updateActiveWire, { passive: true });
    window.addEventListener("resize", updateActiveWire);
  })();

  // ---- Projects grid ---------------------------------------------------------
  $("#viewAllProjects").href = PORTFOLIO.profile.links.github;

  // Rotates through the theme's accent colors so each banner looks distinct
  // without needing a real screenshot.
  const PROJECT_ACCENTS = ["--c-skill", "--c-project", "--c-experience", "--c-achievement"];
  const projectGrid = $("#projectGrid");
  PORTFOLIO.nodes.projects.forEach((p, i) => {
    const accentVar = PROJECT_ACCENTS[i % PROJECT_ACCENTS.length];
    const githubUrl = p.github || PORTFOLIO.profile.links.github;
    const hasLiveDemo = p.link && p.link !== "#" && p.link !== null;
    const hasGithub = p.github !== null;

    const card = document.createElement("article");
    card.className = "project-card reveal";
    card.dataset.nodeId = p.id;
    card.style.transitionDelay = `${(i % 3) * 90}ms`;
    card.style.setProperty("--accent", `var(${accentVar})`);
    card.innerHTML = `
      <div class="project-card__banner">
        <span class="project-card__banner-grid"></span>
        <span class="project-card__banner-mark">${p.label.slice(0, 2).toUpperCase()}</span>
      </div>
      <div class="project-card__body">
        <div class="project-card__icon">${ICONS.rocket}</div>
        <p class="project-card__date">${p.date}</p>
        <h3 class="project-card__title">
          <button type="button" class="project-card__title-btn" data-open-case-study="${p.id}">${p.label}</button>
        </h3>
        <p class="project-card__summary">${p.summary}</p>
        <p class="project-card__desc">${p.description}</p>
        <div class="project-card__tags">${p.tags.map(t => `<span>${t}</span>`).join("")}</div>
        <div class="project-card__actions">
          <button type="button" class="project-card__action project-card__action--primary" data-open-case-study="${p.id}">Case Study ${ICONS.layers}</button>
          <div class="project-card__icon-actions">
            ${hasLiveDemo
              ? `<a href="${p.link}" target="_blank" rel="noopener" class="project-card__action" aria-label="Open live demo">${ICONS.externalLink}<span class="project-card__action-label">Live Demo</span></a>`
              : (hasGithub ? `<span class="project-card__action project-card__action--soon" aria-label="Live demo coming soon">${ICONS.externalLink}<span class="project-card__action-label">Demo Soon</span></span>` : ``)}
            ${hasGithub
              ? `<a href="${githubUrl}" target="_blank" rel="noopener" class="project-card__action" aria-label="View code on GitHub">${ICONS.code}<span class="project-card__action-label">Code</span></a>`
              : ``}
          </div>
        </div>
      </div>
    `;
    projectGrid.appendChild(card);
  });

  // ---- Project case-study modal ------------------------------------------
  initCaseStudyModal(PORTFOLIO.nodes.projects, PORTFOLIO.profile.links.github);

  // ---- Project case-study modal: Problem / Solution / Architecture / Tech
  // Stack / Challenges / Trade-offs / Impact / Deployment / GitHub / Live Demo
  function initCaseStudyModal(projects, fallbackGithub) {
    const modal = document.createElement("div");
    modal.className = "case-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="case-modal__backdrop" data-case-close></div>
      <div class="case-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="caseModalTitle">
        <button type="button" class="case-modal__close" data-case-close aria-label="Close case study">${ICONS.close}</button>
        <button type="button" class="case-modal__nav case-modal__nav--prev" data-case-prev aria-label="Previous project">${ICONS.chevronLeft}</button>
        <button type="button" class="case-modal__nav case-modal__nav--next" data-case-next aria-label="Next project">${ICONS.chevronRight}</button>
        <div class="case-modal__scroll"><div class="case-modal__content" id="caseModalContent"></div></div>
      </div>`;
    document.body.appendChild(modal);

    const contentEl = modal.querySelector("#caseModalContent");
    let currentIndex = -1;
    let lastFocused = null;

    function section(iconSvg, label, bodyHtml) {
      return `<div class="case-modal__section">
        <div class="case-modal__section-head"><span class="case-modal__section-icon">${iconSvg}</span><h3>${label}</h3></div>
        <div class="case-modal__section-body">${bodyHtml}</div>
      </div>`;
    }

    function render(p) {
      const hasLiveDemo = p.link && p.link !== "#" && p.link !== null;
      const hasGithub = p.github !== null;
      const githubUrl = p.github || fallbackGithub;
      const statusHtml = hasLiveDemo
        ? `<span class="case-modal__status case-modal__status--live">${ICONS.check}Live</span>`
        : (hasGithub ? `<span class="case-modal__status case-modal__status--progress">${ICONS.server}Demo Coming Soon</span>` : `<span class="case-modal__status case-modal__status--progress">${ICONS.server}${p.deploymentNote || "In progress"}</span>`);

      let html = `
        <div class="case-modal__banner">
          <span class="case-modal__banner-grid"></span>
          <span class="case-modal__banner-mark">${p.label.slice(0, 2).toUpperCase()}</span>
        </div>
        <div class="case-modal__head">
          <p class="case-modal__date">${p.date}</p>
          <h2 class="case-modal__title" id="caseModalTitle">${p.label}</h2>
          <p class="case-modal__summary">${p.summary}</p>
          <div class="case-modal__meta-row">${statusHtml}</div>
        </div>`;

      html += section(ICONS.target, "Problem", `<p>${p.problem}</p>`);
      html += section(ICONS.bulb, "Solution", `<p>${p.solution}</p>`);

      if (p.architecture && p.architecture.length) {
        html += section(ICONS.layers, "Architecture", `<div class="case-modal__flow">${
          p.architecture.map((stage, i) => `<span class="case-modal__flow-stage">${stage}</span>${i < p.architecture.length - 1 ? `<span class="case-modal__flow-arrow">${ICONS.chevronRight}</span>` : ""}`).join("")
        }</div>`);
      }

      html += section(ICONS.code, "Tech Stack", `<div class="case-modal__stack">${p.tags.map(t => `<span>${t}</span>`).join("")}</div>`);

      // Challenges/trade-offs only render once real content exists for a
      // project — an empty array means "not written yet", not "none".
      if (p.challenges && p.challenges.length) {
        html += section(ICONS.wrench, "Challenges", `<ul>${p.challenges.map(c => `<li>${c}</li>`).join("")}</ul>`);
      }
      if (p.tradeoffs && p.tradeoffs.length) {
        html += section(ICONS.scale, "Trade-offs", `<ul>${p.tradeoffs.map(t => `<li>${t}</li>`).join("")}</ul>`);
      }
      if (p.impact && p.impact.length) {
        html += section(ICONS.trendUp, "Impact", `<ul class="case-modal__impact">${p.impact.map(i => `<li>${i}</li>`).join("")}</ul>`);
      }

      html += section(ICONS.server, "Deployment", `<p>${p.deploymentNote || (hasLiveDemo ? "Deployed and publicly reachable — see Live Demo below." : "Deployed URL will be shared soon.")}</p>`);

      html += `<div class="case-modal__actions">
        ${hasGithub ? `<a href="${githubUrl}" target="_blank" rel="noopener" class="btn btn--ghost">${ICONS.github}<span>View Code</span></a>` : ``}
        ${hasLiveDemo
          ? `<a href="${p.link}" target="_blank" rel="noopener" class="btn btn--primary">${ICONS.externalLink}<span>Live Demo</span></a>`
          : (hasGithub ? `<span class="case-modal__demo-pending">${ICONS.externalLink}Live demo coming soon</span>` : ``)}
      </div>`;

      contentEl.innerHTML = html;
      modal.querySelector(".case-modal__scroll").scrollTop = 0;
    }

    function focusables() { return Array.from(modal.querySelectorAll("button, a[href]")); }

    function onKeydown(e) {
      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowRight") { step(1); return; }
      if (e.key === "ArrowLeft") { step(-1); return; }
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    function open(id) {
      const idx = projects.findIndex(p => p.id === id);
      if (idx === -1) return;
      currentIndex = idx;
      lastFocused = document.activeElement;
      render(projects[idx]);
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("case-modal-lock");
      document.addEventListener("keydown", onKeydown);
      requestAnimationFrame(() => { const c = modal.querySelector(".case-modal__close"); if (c) c.focus(); });
    }

    function close() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("case-modal-lock");
      document.removeEventListener("keydown", onKeydown);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    function step(dir) {
      if (currentIndex === -1) return;
      currentIndex = (currentIndex + dir + projects.length) % projects.length;
      render(projects[currentIndex]);
    }

    modal.addEventListener("click", (e) => {
      if (e.target.closest("[data-case-close]")) close();
      else if (e.target.closest("[data-case-prev]")) step(-1);
      else if (e.target.closest("[data-case-next]")) step(1);
    });

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-open-case-study]");
      if (trigger) open(trigger.dataset.openCaseStudy);
    });
  }

  // ---- Timeline ---------------------------------------------------------------
  const timelineList = $("#timelineList");
  PORTFOLIO.nodes.experience.forEach((e, i) => {
    const stack = relatedSkillsFor(e.id);
    const type = typeForExperience(e);
    const side = i % 2 === 0 ? "left" : "right";
    const isUpcoming = e.status === "upcoming";
    const isStarted = e.status === "started" || e.status === "ongoing";

    const li = document.createElement("li");
    li.className = `timeline-item timeline-item--${side} reveal`;
    li.dataset.nodeId = e.id;
    li.style.transitionDelay = `${i * 110}ms`;
    li.style.setProperty("--accent", `var(${type.varName})`);
    li.innerHTML = `
      <span class="timeline-item__trace" aria-hidden="true"></span>
      <span class="timeline-item__icon" tabindex="0">
        ${iconForExperience(e)}
        <span class="timeline-item__icon-tip">${e.date}</span>
      </span>
      <div class="timeline-card${isUpcoming ? " timeline-card--upcoming" : ""}">
        <div class="timeline-card__top">
          <span class="timeline-card__date">${e.date}</span>
          <span class="timeline-card__type">${type.label}</span>
        </div>

        <div class="timeline-card__header">
          <span class="timeline-card__logo" aria-hidden="true">${logoMarkFor(e.org)}</span>
          <div class="timeline-card__heading">
            <h3 class="timeline-item__title">${e.label}</h3>
            <p class="timeline-item__org">${e.org}</p>
          </div>
          ${isUpcoming ? `<span class="timeline-card__status">${ICONS.server}Upcoming</span>` : (isStarted ? `<span class="timeline-card__status timeline-card__status--started">${ICONS.check}Started</span>` : "")}
        </div>

        <div class="timeline-card__flow">
          <div class="timeline-card__block">
            <p class="timeline-card__label">${ICONS.target}<span>Mission</span></p>
            <p class="timeline-card__text">${e.mission}</p>
          </div>
          <div class="timeline-card__block${isUpcoming ? " timeline-card__block--pending" : ""}">
            <p class="timeline-card__label">${isUpcoming ? ICONS.server : ICONS.bulb}<span>${isUpcoming ? "Status" : "Outcome"}</span></p>
            <p class="timeline-card__text">${isUpcoming ? `Not started yet — begins ${e.date}.` : e.outcome}</p>
          </div>
        </div>

        ${e.impact ? `
        <div class="timeline-card__impact">
          <span class="timeline-card__impact-icon">${ICONS.trendUp}</span>
          <p>${e.impact}</p>
        </div>` : ""}

        ${stack.length ? `
        <p class="timeline-card__label timeline-card__label--stack">Technologies</p>
        <div class="timeline-card__stack">${stack.map(s => `<span>${s}</span>`).join("")}</div>
        ` : ""}
      </div>
    `;
    timelineList.appendChild(li);
  });

  // ---- Achievements ---------------------------------------------------------
  const achievementGrid = $("#achievementGrid");
  PORTFOLIO.nodes.achievements.forEach((a, i) => {
    const icon = /top|rank|winner|champion/i.test(a.label) ? ICONS.medal : ICONS.trophy;
    const card = document.createElement("div");
    card.className = "achievement-card reveal";
    card.dataset.nodeId = a.id;
    card.style.transitionDelay = `${(i % 3) * 90}ms`;
    
    const bannerHtml = a.imageUrl 
      ? `
      <div class="achievement-card__banner">
        <img src="${a.imageUrl}" alt="${a.label}">
      </div>
      `
      : `
      <div class="achievement-card__banner achievement-card__banner--placeholder">
        <span class="achievement-card__banner-grid"></span>
        <span class="achievement-card__banner-mark">${a.label.slice(0, 2).toUpperCase()}</span>
      </div>
      `;

    card.innerHTML = `
      ${bannerHtml}
      <div class="achievement-card__body">
        <div class="achievement-card__top">
          <div class="achievement-card__icon">${icon}</div>
          <span class="achievement-card__date">${a.date}</span>
        </div>
        <h3 class="achievement-card__title">${a.label}</h3>
        <p class="achievement-card__desc">${a.description}</p>
        ${a.certificateUrl
          ? `<a class="achievement-card__cert" href="${a.certificateUrl}" target="_blank" rel="noopener">${ICONS.certificate}Certificate</a>`
          : ""}
      </div>
    `;
    achievementGrid.appendChild(card);
  });

  // ---- Achievements Modal --------------------------------------------------
  (function initAchievementModal() {
    const modal = document.createElement("div");
    modal.className = "achievement-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="achievement-modal__backdrop" data-ach-close></div>
      <div class="achievement-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="achModalTitle">
        <button type="button" class="achievement-modal__close" data-ach-close aria-label="Close modal">${ICONS.close}</button>
        <div class="achievement-modal__scroll">
          <div class="achievement-modal__content" id="achModalContent"></div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const contentEl = modal.querySelector("#achModalContent");
    let currentIndex = -1;
    let lastFocused = null;

    function render(a) {
      const bannerHtml = a.imageUrl 
        ? `<div class="achievement-modal__banner"><img src="${a.imageUrl}" alt="${a.label}"></div>`
        : `<div class="achievement-modal__banner achievement-modal__banner--placeholder">
            <span class="achievement-modal__banner-grid"></span>
            <span class="achievement-modal__banner-mark">${a.label.slice(0, 2).toUpperCase()}</span>
           </div>`;

      contentEl.innerHTML = `
        ${bannerHtml}
        <div class="achievement-modal__head">
          <p class="achievement-modal__date">${a.date}</p>
          <h2 class="achievement-modal__title" id="achModalTitle">${a.label}</h2>
          <div class="achievement-modal__divider"></div>
          <p class="achievement-modal__desc">${a.description}</p>
          ${a.certificateUrl
            ? `<div class="achievement-modal__actions">
                <a href="${a.certificateUrl}" target="_blank" rel="noopener" class="btn btn--primary">${ICONS.certificate}<span>View Certificate</span></a>
               </div>`
            : ""}
        </div>
      `;
    }

    function open(id) {
      const idx = PORTFOLIO.nodes.achievements.findIndex(a => a.id === id);
      if (idx === -1) return;
      currentIndex = idx;
      lastFocused = document.activeElement;
      render(PORTFOLIO.nodes.achievements[idx]);
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("achievement-modal-lock");
      
      document.addEventListener("keydown", onKeydown);
      requestAnimationFrame(() => {
        const c = modal.querySelector(".achievement-modal__close");
        if (c) c.focus();
      });
    }

    function close() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("achievement-modal-lock");
      document.removeEventListener("keydown", onKeydown);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    function onKeydown(e) {
      if (e.key === "Escape") close();
    }

    modal.addEventListener("click", (e) => {
      if (e.target.closest("[data-ach-close]")) close();
    });

    document.addEventListener("click", (e) => {
      const card = e.target.closest(".achievement-card");
      if (card && !e.target.closest(".achievement-card__cert")) {
        open(card.dataset.nodeId);
      }
    });
  })();

  // ---- Nav: scroll shadow + mobile toggle -----------------------------------
  const nav = $("#nav");
  const navToggle = $("#navToggle");
  const navLinks = $(".nav__links");

  window.addEventListener("scroll", rafThrottle(() => {
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  }), { passive: true });

  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }));

  // ---- Scroll reveal ----------------------------------------------------------
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));
  // section heads get the reveal treatment too
  document.querySelectorAll(".section-head").forEach(el => {
    el.classList.add("reveal");
    revealObserver.observe(el);
  });

  // ---- Timeline: spine lights up as you scroll through it -------------------
  (function timelineSpineFill() {
    const timeline = $(".timeline");
    const fill = $(".timeline__spine-fill");
    if (!timeline || !fill) return;
    const reducedMotion = prefersReducedMotion;

    let ticking = false;
    function update() {
      ticking = false;
      const rect = timeline.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the top of the timeline reaches the middle of the viewport,
      // 1 when its bottom reaches the middle — so it finishes filling right
      // as the last card comes into view, not way past it.
      const total = rect.height + vh * 0.5;
      const progressed = vh * 0.5 - rect.top;
      const pct = Math.max(0, Math.min(1, progressed / total));
      fill.style.height = `${pct * 100}%`;
      timeline.style.setProperty("--spine-pct", pct.toFixed(3));
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    if (reducedMotion) { fill.style.height = "100%"; return; }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  })();

  // ---- Timeline: soft spotlight that follows the cursor ---------------------
  (function timelineSpotlight() {
    const timeline = $(".timeline");
    if (!timeline) return;
    if (prefersReducedMotion) return;
    if (window.matchMedia("(hover: none)").matches) return; // skip on touch devices

    const cards = $$(".timeline-card");
    let timelineRect = null;
    let cardCenters = [];

    function updateTimelinePositions() {
      if (!timeline) return;
      timelineRect = timeline.getBoundingClientRect();
      cardCenters = cards.map(card => {
        const cr = card.getBoundingClientRect();
        return {
          card: card,
          cx: cr.left + cr.width / 2 - timelineRect.left,
          cy: cr.top + cr.height / 2 - timelineRect.top
        };
      });
    }

    window.addEventListener("resize", rafThrottle(updateTimelinePositions));
    window.addEventListener("scroll", rafThrottle(updateTimelinePositions), { passive: true });
    updateTimelinePositions();

    let raf = null;
    timeline.addEventListener("pointermove", (e) => {
      if (!timelineRect) updateTimelinePositions();
      if (!timelineRect) return;
      const x = e.clientX - timelineRect.left, y = e.clientY - timelineRect.top;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        timeline.style.setProperty("--sx", `${x}px`);
        timeline.style.setProperty("--sy", `${y}px`);
        timeline.style.setProperty("--spotlight-opacity", "1");
        // proximity glass-highlight using cached center positions
        cardCenters.forEach(center => {
          const dist = Math.hypot(x - center.cx, y - center.cy);
          const strength = Math.max(0, 1 - dist / 380);
          center.card.style.setProperty("--glow", strength.toFixed(2));
        });
      });
    });
    timeline.addEventListener("pointerleave", () => {
      timeline.style.setProperty("--spotlight-opacity", "0");
      cards.forEach(card => card.style.setProperty("--glow", 0));
    });
  })();

  // ---- Hero stat count-up ------------------------------------------------------
  (function countUpStats() {
    const nums = $$(".hero__stat-num[data-count-to]");
    if (!nums.length) return;
    const reducedMotion = prefersReducedMotion;

    function animate(el) {
      const to = parseFloat(el.dataset.countTo);
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const suffix = el.dataset.suffix || "";
      if (reducedMotion) { el.textContent = to.toFixed(decimals) + suffix; return; }
      const duration = 1400;
      const start = performance.now();
      function frame(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        const val = to * eased;
        el.textContent = val.toFixed(decimals) + suffix;
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    const statObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(entry.target);
          statObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    nums.forEach(el => statObserver.observe(el));
  })();

  // ---- Card tilt + cursor-spotlight (project cards) -----------------------------
  (function tiltCards() {
    const reducedMotion = prefersReducedMotion;
    if (reducedMotion) return;
    const cards = $$(".project-card");
    cards.forEach(card => {
      let cardRect = null;
      let raf = null;
      card.addEventListener("pointerenter", () => {
        cardRect = card.getBoundingClientRect();
      });
      card.addEventListener("pointermove", (e) => {
        if (!cardRect) cardRect = card.getBoundingClientRect();
        const px = (e.clientX - cardRect.left) / cardRect.width;   // 0..1
        const py = (e.clientY - cardRect.top) / cardRect.height;   // 0..1
        const rotY = (px - 0.5) * 8;   // left/right tilt
        const rotX = (0.5 - py) * 8;   // up/down tilt
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.setProperty("--mx", `${px * 100}%`);
          card.style.setProperty("--my", `${py * 100}%`);
          card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
        });
      });
      card.addEventListener("pointerleave", () => {
        if (raf) cancelAnimationFrame(raf);
        cardRect = null;
        card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)";
      });
    });
  })();

  // ---- Hero neural-network / data-flow field ----------------------------------
  // Glowing nodes connected by faint edges, small particles that flow toward the
  // laptop (the "data flowing into the model"), and a pulse ring that
  // periodically radiates outward from the laptop through the network.
  (function heroNeuralField() {
    const canvas = $("#heroField");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes = [];
    let flows = [];
    let target = { x: 0, y: 0 };
    let pulseStart = 0;
    const PULSE_EVERY = 4800;

    const reducedMotion = prefersReducedMotion;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // the laptop screen sits roughly here inside the video frame, on the
      // right-hand column of the split hero layout — pulses/flows converge on it
      target = { x: w * 0.665, y: h * 0.58 };

      const count = Math.min(46, Math.floor((w * h) / 15000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 1.6 + 1,
        phase: Math.random() * Math.PI * 2
      }));
      flows = [];
    }

    function spawnFlow() {
      // start from a random node near the edges, travel toward the laptop
      const edgeNodes = nodes.filter(n => n.x < w * 0.4 || n.x > w * 0.92 || n.y < h * 0.18);
      const src = (edgeNodes.length ? edgeNodes : nodes)[Math.floor(Math.random() * (edgeNodes.length || nodes.length))];
      if (!src) return;
      flows.push({ x: src.x, y: src.y, sx: src.x, sy: src.y, t: 0, speed: 0.006 + Math.random() * 0.006 });
    }

    let lastFlowSpawn = 0;

    function step(now) {
      ctx.clearRect(0, 0, w, h);
      const maxDist = 130;

      if (!pulseStart) pulseStart = now;
      const pulseElapsed = (now - pulseStart) % PULSE_EVERY;
      const pulseActive = pulseElapsed < 1800;
      const pulseRadius = pulseActive ? (pulseElapsed / 1800) * Math.max(w, h) * 0.75 : -1;

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      });

      // edges between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxDist) {
            const midDist = Math.hypot((a.x + b.x) / 2 - target.x, (a.y + b.y) / 2 - target.y);
            const hit = pulseActive && Math.abs(midDist - pulseRadius) < 55;
            const base = (1 - d / maxDist) * 0.12;
            ctx.strokeStyle = hit ? `rgba(94,234,212,${base + 0.32})` : `rgba(139,92,246,${base})`;
            ctx.lineWidth = hit ? 1 : 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // nodes — soft glow, brighten when the pulse ring passes through them
      nodes.forEach(n => {
        const dToTarget = Math.hypot(n.x - target.x, n.y - target.y);
        const hit = pulseActive && Math.abs(dToTarget - pulseRadius) < 60;
        const glow = 0.4 + Math.sin(now * 0.0012 + n.phase) * 0.25;
        ctx.beginPath();
        ctx.arc(n.x, n.y, hit ? n.r * 2.2 : n.r, 0, Math.PI * 2);
        ctx.fillStyle = hit ? `rgba(94,234,212,${0.85})` : `rgba(139,197,246,${glow * 0.6})`;
        ctx.fill();
      });

      // data-flow particles traveling toward the laptop
      if (!reducedMotion && now - lastFlowSpawn > 700) {
        lastFlowSpawn = now;
        if (flows.length < 10) spawnFlow();
      }
      flows.forEach(f => {
        f.t = Math.min(f.t + f.speed, 1);
        const ease = f.t < 0.5 ? 2 * f.t * f.t : 1 - Math.pow(-2 * f.t + 2, 2) / 2;
        f.x = f.sx + (target.x - f.sx) * ease;
        f.y = f.sy + (target.y - f.sy) * ease;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${0.8 * (1 - f.t * 0.3)})`;
        ctx.fill();
      });
      flows = flows.filter(f => f.t < 1);

      // a faint ring right at the laptop when the pulse originates
      if (pulseActive && pulseElapsed < 260) {
        ctx.beginPath();
        ctx.arc(target.x, target.y, (pulseElapsed / 260) * 22, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(94,234,212,${0.5 * (1 - pulseElapsed / 260)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (!reducedMotion && fieldVisible) rafId = requestAnimationFrame(step);
    }

    // The field keeps animating even once the hero has scrolled out of view
    // unless we tell it to stop — pause the loop off-screen to save battery
    // and main-thread time, and pick back up right where it left off.
    let fieldVisible = true;
    let rafId = null;
    pauseWhenOffscreen(canvas, {
      onEnter: () => { fieldVisible = true; if (!reducedMotion && rafId === null) rafId = requestAnimationFrame(step); },
      onExit: () => { fieldVisible = false; if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }
    });

    window.addEventListener("resize", rafThrottle(resize));
    resize();
    rafId = requestAnimationFrame(step);
    if (reducedMotion) { step(performance.now()); } // draw one static frame only
  })();

  // ---- Hero portrait: cursor-reactive parallax tilt (frame + floating cards + background depth) --
  (function heroParallax() {
    const hero = $("#top");
    const frame = $("#heroFrame");
    const cards = $$(".hero__float-card");
    const field = $("#heroField");
    const glow = document.querySelector(".hero__portrait-glow");
    if (!hero || !frame) return;
    const reducedMotion = prefersReducedMotion;
    if (reducedMotion) return;

    let heroRect = null;
    function updateHeroRect() {
      if (hero) heroRect = hero.getBoundingClientRect();
    }
    window.addEventListener("resize", rafThrottle(updateHeroRect));
    window.addEventListener("scroll", rafThrottle(updateHeroRect), { passive: true });
    updateHeroRect();

    // Layered depth: the background neural field drifts least (it's "far
    // away"), the ambient glow a little more, the frame tilts, and the
    // float cards — closest to the viewer — move the most. Same input,
    // read differently per layer, which is what actually sells "depth"
    // rather than everything moving together like one flat sticker.
    let raf = null;
    hero.addEventListener("pointermove", (e) => {
      if (!heroRect) updateHeroRect();
      if (!heroRect) return;
      const px = (e.clientX - heroRect.left) / heroRect.width - 0.5;   // -0.5..0.5
      const py = (e.clientY - heroRect.top) / heroRect.height - 0.5;

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        frame.style.setProperty("--tiltX", `${(-py * 6).toFixed(2)}deg`);
        frame.style.setProperty("--tiltY", `${(px * 8).toFixed(2)}deg`);
        cards.forEach(card => {
          const depth = parseFloat(card.style.getPropertyValue("--depth")) || 1;
          card.style.setProperty("--px", (px * 14 * depth).toFixed(1));
          card.style.setProperty("--py", (py * 14 * depth).toFixed(1));
        });
        if (field) field.style.transform = `translate3d(${(px * 6).toFixed(1)}px, ${(py * 6).toFixed(1)}px, 0)`;
        // glow already animates `transform` via the portraitPulse keyframe
        // (its idle scale-pulse), so parallax is passed in as custom
        // properties the keyframe reads via calc() instead of a direct
        // style.transform write, which a running keyframe would just override
        if (glow) { glow.style.setProperty("--px", (px * 10).toFixed(1)); glow.style.setProperty("--py", (py * 10).toFixed(1)); }
      });
    });
    hero.addEventListener("pointerleave", () => {
      if (raf) cancelAnimationFrame(raf);
      frame.style.setProperty("--tiltX", "0deg");
      frame.style.setProperty("--tiltY", "0deg");
      cards.forEach(card => { card.style.setProperty("--px", 0); card.style.setProperty("--py", 0); });
      if (field) field.style.transform = "";
      if (glow) { glow.style.setProperty("--px", 0); glow.style.setProperty("--py", 0); }
    });
  })();

  // ---- Contact terminal: boot sequence + live command parser ----------------
  (function interactiveTerminal() {
    const el = $("#terminalBody");
    const wrap = $("#contactTerminal");
    const form = $("#terminalForm");
    const input = $("#terminalInput");
    if (!el || !wrap || !form || !input) return;
    const reducedMotion = prefersReducedMotion;
    const p = PORTFOLIO.profile;

    const clusterNames = { hub_languages: "Languages", hub_aiml: "AI / ML", hub_fullstack: "Full Stack" };

    function print(text, cls) {
      const div = document.createElement("div");
      div.className = `term-line ${cls || ""}`;
      div.style.opacity = "1";
      div.textContent = text || "\u00A0";
      el.appendChild(div);
      el.scrollTop = el.scrollHeight;
      return div;
    }

    const COMMANDS = {
      help() {
        print("Available commands:", "term-line--dim");
        [
          ["about", "who is Khushi, in one line"],
          ["skills", "language / AI-ML / full-stack breakdown"],
          ["projects", "everything she's shipped"],
          ["experience", "internships & roles"],
          ["achievements", "awards & recognitions"],
          ["contact", "email, phone, location"],
          ["availability", "current status + response time"],
          ["focus", "what she's actively working on"],
          ["stats", "quick portfolio numbers"],
          ["resume", "download the resume PDF"],
          ["github", "open her GitHub"],
          ["linkedin", "open her LinkedIn"],
          ["clear", "clear this terminal"]
        ].forEach(([cmd, desc]) => print(`  ${cmd.padEnd(13)} — ${desc}`));
      },
      about() { print(`${p.name} — ${p.role}. ${p.tagline}`); },
      whoami() { COMMANDS.about(); },
      skills() {
        const byCluster = {};
        PORTFOLIO.nodes.skills.forEach(s => { (byCluster[s.cluster] ||= []).push(s.label); });
        Object.entries(byCluster).forEach(([cluster, list]) => {
          print(`${clusterNames[cluster] || cluster}:`, "term-line--dim");
          print(`  ${list.join(", ")}`);
        });
      },
      projects() {
        PORTFOLIO.nodes.projects.forEach(proj => print(`  ${proj.label}  (${proj.date})`));
      },
      experience() {
        PORTFOLIO.nodes.experience.forEach(e => print(`  ${e.label} — ${e.org}  (${e.date})`));
      },
      achievements() {
        PORTFOLIO.nodes.achievements.forEach(a => print(`  ${a.label}  (${a.date})`));
      },
      contact() {
        print(`  email     ${p.email}`);
        print(`  phone     ${p.phone}`);
        print(`  location  ${p.location}`);
      },
      availability() {
        print(p.contact.availability);
        print(`Response time: ${p.contact.responseTime}`, "term-line--dim");
      },
      focus() { print(`Currently focused on: ${p.contact.focus.join(", ")}`); },
      stats() {
        print(`  ${PORTFOLIO.nodes.projects.length} projects`);
        print(`  ${PORTFOLIO.nodes.skills.length} skills`);
        print(`  ${PORTFOLIO.nodes.experience.length} roles`);
        print(`  ${PORTFOLIO.nodes.achievements.length} achievements`);
      },
      resume() {
        print("Starting download…", "term-line--ok");
        const link = $("#navResumeTwin") || $("#navResume");
        if (link) link.click();
      },
      github() { print(`Opening ${p.links.github}`, "term-line--ok"); window.open(p.links.github, "_blank", "noopener"); },
      linkedin() { print(`Opening ${p.links.linkedin}`, "term-line--ok"); window.open(p.links.linkedin, "_blank", "noopener"); },
      email() { print(`Opening mail client for ${p.email}`, "term-line--ok"); window.location.href = `mailto:${p.email}`; },
      clear() { el.innerHTML = ""; }
    };

    function runCommand(raw) {
      const cmd = raw.trim().toLowerCase();
      print(cmd, "term-line--prompt");
      if (!cmd) return;
      if (COMMANDS[cmd]) { COMMANDS[cmd](); }
      else { print(`command not found: ${cmd} — type 'help' for a list`, "term-line--err"); }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = input.value;
      input.value = "";
      if (val.trim()) runCommand(val);
    });

    // ---- boot sequence, then hand off to the live prompt ----
    const bootLines = [
      { text: "connect --email", cls: "term-line--prompt" },
      { text: "Initializing secure connection\u2026" },
      { text: "Connection successful.", cls: "term-line--ok" },
      { text: "" },
      { text: "status --availability", cls: "term-line--prompt" },
      { text: p.contact.availability },
      { text: `Based in ${p.location.split(",")[0]}.` },
      { text: "" },
      { text: "Type a command below, or start with 'help'.", cls: "term-line--dim" }
    ];

    let started = false;
    function run() {
      if (started) return;
      started = true;
      el.innerHTML = "";
      if (reducedMotion) {
        bootLines.forEach(l => print(l.text, l.cls));
        input.focus({ preventScroll: true });
        return;
      }
      let i = 0;
      function next() {
        if (i >= bootLines.length) { input.focus({ preventScroll: true }); return; }
        const l = bootLines[i++];
        print(l.text, l.cls);
        setTimeout(next, l.text ? 420 : 200);
      }
      next();
    }

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) { run(); obs.disconnect(); } });
    }, { threshold: 0.4 });
    obs.observe(wrap);
  })();

  // ---- Contact status card: availability, focus tags, quick stats -----------
  (function contactStatus() {
    const p = PORTFOLIO.profile;
    const ledeEl = $("#contactLede");
    const respEl = $("#contactResponseTime");
    const respEl2 = $("#cfResponseTime");
    const focusEl = $("#contactFocus");
    const statsEl = $("#contactQuickStats");
    if (ledeEl) ledeEl.textContent = p.contact.availability;
    if (respEl) respEl.textContent = p.contact.responseTime;
    if (respEl2) respEl2.textContent = p.contact.responseTime.replace(/^Usually /i, "").toLowerCase();
    if (focusEl) focusEl.innerHTML = p.contact.focus.map(f => `<span>${f}</span>`).join("");
    if (statsEl) {
      const stats = [
        [PORTFOLIO.nodes.projects.length, "Projects"],
        [PORTFOLIO.nodes.skills.length, "Skills"],
        [PORTFOLIO.nodes.experience.length, "Roles"],
        [PORTFOLIO.nodes.achievements.length, "Awards"]
      ];
      statsEl.innerHTML = stats.map(([n, label]) =>
        `<div><span class="contact__quickstat-num" data-count-to="${n}">0</span><span class="contact__quickstat-label">${label}</span></div>`
      ).join("");

      // self-contained count-up (runs independently of the hero's stat observer,
      // since these nodes don't exist in the DOM until this script runs)
      const reducedMotion = prefersReducedMotion;
      const nums = statsEl.querySelectorAll("[data-count-to]");
      function animate(el) {
        const to = parseFloat(el.dataset.countTo);
        if (reducedMotion) { el.textContent = to; return; }
        const duration = 900;
        const start = performance.now();
        function frame(now) {
          const t = Math.min((now - start) / duration, 1);
          el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));
          if (t < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) { animate(entry.target); obs.unobserve(entry.target); } });
      }, { threshold: 0.4 });
      nums.forEach(el => obs.observe(el));
    }
  })();

  // ---- Copy-email button: icon morphs copy → check, label swaps, then resets --
  (function copyEmail() {
    const btn = $("#copyEmailBtn");
    const label = $("#copyEmailLabel");
    if (!btn) return;
    let resetTimer = null;

    btn.addEventListener("click", async () => {
      // ignore rapid re-clicks while the "Copied" state is showing
      if (btn.classList.contains("is-copied")) return;
      try {
        await navigator.clipboard.writeText(PORTFOLIO.profile.email);
        btn.classList.add("is-copied");
        btn.setAttribute("aria-label", "Email address copied");
        if (label) label.textContent = "Copied";
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          btn.classList.remove("is-copied");
          btn.setAttribute("aria-label", "Copy email address");
          if (label) label.textContent = "Copy";
        }, 2000);
      } catch {
        window.location.href = `mailto:${PORTFOLIO.profile.email}`;
      }
    });
  })();

  (function copyPhone() {
    const btn = $("#copyPhoneBtn");
    const label = $("#copyPhoneLabel");
    if (!btn) return;
    let resetTimer = null;

    btn.addEventListener("click", async () => {
      if (btn.classList.contains("is-copied")) return;
      const phoneNum = (PORTFOLIO.profile && PORTFOLIO.profile.phone) || "8010648383";
      try {
        await navigator.clipboard.writeText(phoneNum);
        btn.classList.add("is-copied");
        btn.setAttribute("aria-label", "Phone number copied");
        if (label) label.textContent = "Copied";
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          btn.classList.remove("is-copied");
          btn.setAttribute("aria-label", "Copy phone number");
          if (label) label.textContent = "Copy";
        }, 2000);
      } catch {
        window.location.href = `tel:${phoneNum}`;
      }
    });
  })();

  // ---- Contact form: actually sends email via /api/contact -------------------
  // Falls back to a mailto link only if the request itself fails (e.g. the
  // backend hasn't been deployed yet — see README.md).
  (function contactForm() {
    const form = $("#contactForm");
    const success = $("#cfSuccess");
    const errorEl = $("#cfError");
    const resetBtn = $("#cfReset");
    const submitBtn = form ? form.querySelector(".contact__form-submit") : null;
    if (!form || !success) return;
    const p = PORTFOLIO.profile;

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#cfName").value.trim();
      const email = $("#cfEmail").value.trim();
      const subject = $("#cfSubject").value.trim() || "Portfolio contact";
      const message = $("#cfMessage").value.trim();

      if (!name || !email || !message) {
        showError("Please fill in your name, email, and a message.");
        return;
      }
      errorEl.hidden = true;
      submitBtn.disabled = true;
      submitBtn.classList.add("is-loading");
      const submitLabel = submitBtn.querySelector("span");
      if (submitLabel) submitLabel.textContent = "Sending…";

      try {
        let res;
        try {
          // FormSubmit is a free form-to-email relay: it needs nothing but
          // the destination address (no login, no API key, no SMTP setup on
          // our end). The one-time catch: the FIRST message ever sent to a
          // given address triggers a confirmation email from FormSubmit to
          // that inbox — whoever owns PORTFOLIO.profile.email has to click
          // "Confirm" in that one email, once, ever. Every submission after
          // that goes straight through with zero setup for anyone.
          res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(p.email)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
              name, email, subject: `[Portfolio] ${subject}`, message,
              _template: "table"
            })
          });
        } catch (networkErr) {
          throw new Error("I couldn't reach the contact service — check your internet connection and try again.");
        }

        const data = await res.json().catch(() => null);

        if (res.ok && data && (data.success === "true" || data.success === true)) {
          $("#cfResponseTime").textContent = p.contact.responseTime.replace(/^Usually /i, "").toLowerCase();
          form.hidden = true;
          success.hidden = false;
          return;
        }

        throw new Error((data && data.message) || `The message couldn't be sent (server responded ${res.status}).`);
      } catch (err) {
        // Whatever the cause, never leave a dead end — offer a mailto fallback.
        showError(`${err.message} You can also email me directly.`);
        const mailBody = `${message}\n\n—\n${name}\n${email}`;
        errorEl.innerHTML += ` <a href="mailto:${p.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}">Open email app →</a>`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-loading");
        if (submitLabel) submitLabel.textContent = "Send Message";
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        form.reset();
        form.hidden = false;
        success.hidden = true;
      });
    }
  })();

  // ---- Init the knowledge graph -------------------------------------------
  const graphCanvas = $("#graphCanvas");
  if (graphCanvas && window.KnowledgeGraph) {
    graphHandle = window.KnowledgeGraph.init(
      graphCanvas,
      {
        empty: $("#graphPanelEmpty"),
        content: $("#graphPanelContent"),
        type: $("#panelType"),
        degree: $("#panelDegree"),
        title: $("#panelTitle"),
        meta: $("#panelMeta"),
        desc: $("#panelDesc"),
        why: $("#panelWhy"),
        whyText: $("#panelWhyText"),
        impact: $("#panelImpact"),
        impactList: $("#panelImpactList"),
        learned: $("#panelLearned"),
        learnedList: $("#panelLearnedList"),
        tags: $("#panelTags"),
        connections: $("#panelConnections"),
        connCount: $("#panelConnCount"),
        link: $("#panelLink")
      },
      $("#graphFilters"),
      $("#graphHint"),
      {
        stats: {
          skills: $("#statSkills"),
          projects: $("#statProjects"),
          experience: $("#statExperience"),
          achievements: $("#statAchievements"),
          connections: $("#statConnections")
        },
        search: {
          input: $("#graphSearch"),
          results: $("#graphSearchResults")
        },
        breadcrumb: $("#graphBreadcrumb"),
        tooltip: $("#graphTooltip")
      }
    );
    window.graphHandle = graphHandle;
  }
})();
