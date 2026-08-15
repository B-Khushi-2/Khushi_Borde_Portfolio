import { useState, useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import type { GraphNode, GraphEdge } from "./graphModel";
import {
  buildModel,
  COLORS,
  relationshipLabel,
  orderedPair,
} from "./graphModel";
import { R3FGraphScene } from "./R3FGraphScene";

const TYPE_LABEL: Record<string, string> = {
  skill: "Skill",
  project: "Project",
  experience: "Experience",
  achievement: "Achievement",
  hub: "Category",
  core: "Profile",
};

export function R3FKnowledgeGraph() {
  const model = useMemo(() => buildModel(), []);
  const { nodes, nodeById, adjacency, structuralIds } = model;

  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(() => nodeById.get("core") || nodes[0] || null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const [tooltipState, setTooltipState] = useState<{ hidden: boolean; text: string; x: number; y: number }>({
    hidden: true,
    text: "",
    x: 0,
    y: 0,
  });

  // Populate stats count-up attributes
  useEffect(() => {
    const sSkills = document.getElementById("statSkills");
    const sProjects = document.getElementById("statProjects");
    const sExperience = document.getElementById("statExperience");
    const sAchievements = document.getElementById("statAchievements");
    const sConnections = document.getElementById("statConnections");

    if (sSkills) sSkills.dataset.countTo = String(nodes.filter((n) => n.type === "skill").length);
    if (sProjects) sProjects.dataset.countTo = String(nodes.filter((n) => n.type === "project").length);
    if (sExperience) sExperience.dataset.countTo = String(nodes.filter((n) => n.type === "experience").length);
    if (sAchievements) sAchievements.dataset.countTo = String(nodes.filter((n) => n.type === "achievement").length);
    if (sConnections) sConnections.dataset.countTo = String(model.edges.length);
  }, [nodes, model.edges.length]);

  // Connect filter buttons in DOM if present
  useEffect(() => {
    const filtersEl = document.getElementById("graphFilters");
    if (!filtersEl) return;
    const chips = filtersEl.querySelectorAll<HTMLButtonElement>(".filter-chip");
    chips.forEach((btn) => {
      btn.onclick = () => {
        chips.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        setActiveFilter(btn.dataset.filter || "all");
      };
    });
  }, []);

  // Connect search input in DOM if present
  useEffect(() => {
    const inputEl = document.getElementById("graphSearch") as HTMLInputElement | null;
    const resultsEl = document.getElementById("graphSearchResults");
    if (!inputEl) return;

    let searchTimer: ReturnType<typeof setTimeout> | null = null;

    const handleInput = () => {
      const q = inputEl.value.trim().toLowerCase();
      setSearchQuery(q);
      if (!q) {
        setSearchResults([]);
        if (resultsEl) resultsEl.hidden = true;
        return;
      }
      const matches = nodes
        .filter((n) => n.type !== "core" && n.type !== "hub" && n.label.toLowerCase().includes(q))
        .sort((a, b) => a.label.toLowerCase().indexOf(q) - b.label.toLowerCase().indexOf(q))
        .slice(0, 6);

      setSearchResults(matches);
      if (resultsEl) {
        resultsEl.hidden = matches.length === 0;
      }

      if (searchTimer) clearTimeout(searchTimer);
      if (matches.length > 0) {
        searchTimer = setTimeout(() => {
          handleSelectNode(matches[0]);
        }, 320);
      }
    };

    inputEl.oninput = handleInput;
  }, [nodes]);

  // Handle panel population when selectedNode changes
  useEffect(() => {
    if (!selectedNode) return;
    populateSidePanel(selectedNode);
  }, [selectedNode]);

  function populateSidePanel(n: GraphNode) {
    const emptyEl = document.getElementById("graphPanelEmpty");
    const contentEl = document.getElementById("graphPanelContent");
    if (emptyEl) emptyEl.hidden = true;
    if (contentEl) {
      contentEl.hidden = false;
      contentEl.classList.remove("is-animating");
      void contentEl.offsetWidth;
      contentEl.classList.add("is-animating");
    }

    const typeEl = document.getElementById("panelType");
    const titleEl = document.getElementById("panelTitle");
    const degreeEl = document.getElementById("panelDegree");
    const metaEl = document.getElementById("panelMeta");
    const descEl = document.getElementById("panelDesc");
    const whyEl = document.getElementById("panelWhy");
    const whyTextEl = document.getElementById("panelWhyText");
    const impactEl = document.getElementById("panelImpact");
    const impactListEl = document.getElementById("panelImpactList");
    const learnedEl = document.getElementById("panelLearned");
    const learnedListEl = document.getElementById("panelLearnedList");
    const tagsEl = document.getElementById("panelTags");
    const connListEl = document.getElementById("panelConnections");
    const connCountEl = document.getElementById("panelConnCount");
    const linkEl = document.getElementById("panelLink") as HTMLAnchorElement | null;

    if (typeEl) {
      typeEl.textContent = TYPE_LABEL[n.type] || n.type;
      typeEl.style.color = COLORS[n.type] || COLORS.text;
    }
    if (titleEl) titleEl.textContent = n.label;
    if (degreeEl) {
      degreeEl.textContent = n.degree ? `${n.degree} connection${n.degree === 1 ? "" : "s"}` : "";
    }

    let metaStr = "";
    if (n.date) metaStr = n.date;
    if (n.org) metaStr = n.org + (n.date ? " · " + n.date : "");
    if (metaEl) {
      metaEl.textContent = metaStr;
      metaEl.style.display = metaStr ? "block" : "none";
    }

    if (descEl) {
      descEl.textContent = n.description || n.summary || (n.type === "hub" ? "A category cluster." : "");
    }

    // Why it's here
    if (whyEl && whyTextEl) {
      const conn = Array.from(adjacency.get(n.id) || [])
        .map((id) => nodeById.get(id))
        .filter(Boolean);
      const projects = conn.filter((c) => c?.type === "project").map((c) => c?.label);
      const exp = conn.filter((c) => c?.type === "experience").map((c) => c?.label);
      const ach = conn.filter((c) => c?.type === "achievement").map((c) => c?.label);
      const parts: string[] = [];
      if (projects.length) parts.push(`used in ${projects.join(", ")}`);
      if (exp.length) parts.push(`built up during ${exp.join(", ")}`);
      if (ach.length) parts.push(`proven by ${ach.join(", ")}`);

      if (n.type === "skill" && parts.length > 0) {
        whyEl.hidden = false;
        whyTextEl.textContent = `${n.label} — ${parts.join("; ")}.`;
      } else {
        whyEl.hidden = true;
      }
    }

    // Impact
    if (impactEl && impactListEl) {
      const hasImpact = n.type === "project" && n.impact && n.impact.length > 0;
      impactEl.hidden = !hasImpact;
      impactListEl.innerHTML = "";
      if (hasImpact && n.impact) {
        n.impact.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item;
          impactListEl.appendChild(li);
        });
      }
    }

    // Learned
    if (learnedEl && learnedListEl) {
      const hasLearned = n.type === "project" && n.learned && n.learned.length > 0;
      learnedEl.hidden = !hasLearned;
      learnedListEl.innerHTML = "";
      if (hasLearned && n.learned) {
        n.learned.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item;
          learnedListEl.appendChild(li);
        });
      }
    }

    // Tags
    if (tagsEl) {
      tagsEl.innerHTML = "";
      if (n.tags && n.tags.length > 0) {
        n.tags.forEach((tag) => {
          const span = document.createElement("span");
          span.textContent = tag;
          tagsEl.appendChild(span);
        });
      }
    }

    // Connections list
    if (connListEl && connCountEl) {
      connListEl.innerHTML = "";
      const conn = Array.from(adjacency.get(n.id) || [])
        .map((id) => nodeById.get(id))
        .filter(Boolean) as GraphNode[];
      conn.sort((a, b) => a.type.localeCompare(b.type));
      connCountEl.textContent = conn.length ? `(${conn.length})` : "";

      conn.forEach((c) => {
        const li = document.createElement("li");
        li.textContent = c.label;
        li.style.setProperty("--dot-color", COLORS[c.type] || COLORS.hub);
        li.onclick = () => handleSelectNode(c);
        connListEl.appendChild(li);
      });
    }

    // External Link
    if (linkEl) {
      if (n.link && n.link !== "#") {
        linkEl.href = n.link;
        linkEl.hidden = false;
      } else {
        linkEl.hidden = true;
      }
    }
  }

  function handleSelectNode(n: GraphNode | null) {
    if (!n) return;
    if (activeFilter !== "all" && n.type !== "core" && n.type !== "hub" && n.type !== activeFilter) {
      setActiveFilter("all");
    }
    setSelectedNode(n);
  }

  function handleHoverEdge(edge: GraphEdge | null, sx: number, sy: number) {
    setHoveredEdge(edge);
    if (!edge) {
      setTooltipState({ hidden: true, text: "", x: 0, y: 0 });
      return;
    }
    const isStructural = structuralIds.has(edge.a.id + "|" + edge.b.id);
    const [top, bottom] = orderedPair(edge.a, edge.b);
    const verb = relationshipLabel(edge.a, edge.b, isStructural);
    const text = `${top.label} ${verb} ${bottom.label}`;
    setTooltipState({ hidden: false, text, x: sx + 14, y: sy + 14 });
  }

  return (
    <div id="r3f-graph-container" className="relative w-full h-full min-h-[550px] select-none">
      {/* Search overlay results dropdown if active */}
      {searchResults.length > 0 && searchQuery.length > 0 && (
        <ul className="graph-search__results absolute top-12 right-4 z-20" role="menu">
          {searchResults.map((n) => (
            <li
              key={n.id}
              onClick={() => {
                handleSelectNode(n);
                setSearchResults([]);
                setSearchQuery("");
              }}
            >
              <span className="graph-search__dot" style={{ background: COLORS[n.type] || COLORS.hub }} />
              {n.label}
              <span className="graph-search__type">{TYPE_LABEL[n.type] || n.type}</span>
            </li>
          ))}
        </ul>
      )}

      {/* R3F Canvas */}
      <Canvas
        className="w-full h-full"
        style={{ width: "100%", height: "100%", background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <OrthographicCamera makeDefault position={[0, 0, 500]} zoom={1} />
        <ambientLight intensity={1} />
        <R3FGraphScene
          model={model}
          activeFilter={activeFilter}
          selectedNode={selectedNode}
          hoveredNode={hoveredNode}
          hoveredEdge={hoveredEdge}
          onSelectNode={handleSelectNode}
          onHoverNode={setHoveredNode}
          onHoverEdge={handleHoverEdge}
        />
      </Canvas>

      {/* Tooltip Overlay */}
      {!tooltipState.hidden && (
        <div
          className="graph-tooltip absolute pointer-events-none z-30"
          style={{ left: `${tooltipState.x}px`, top: `${tooltipState.y}px` }}
        >
          {tooltipState.text}
        </div>
      )}
    </div>
  );
}
