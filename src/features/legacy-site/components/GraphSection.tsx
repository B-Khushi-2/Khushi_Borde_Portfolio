import { useState, useEffect } from "react";
import { R3FKnowledgeGraph } from "./R3FKnowledgeGraph/R3FKnowledgeGraph";

function isR3FGraphEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    import.meta.env.VITE_USE_R3F_GRAPH === "true" ||
    localStorage.getItem("use_r3f_graph") === "true" ||
    window.location.search.includes("r3f=1")
  );
}

/** Ported 1:1 — canvas graph rendered natively via React Three Fiber when feature flag is active, or fallback canvas. */
export function GraphSection() {
  const [useR3F, setUseR3F] = useState(false);

  useEffect(() => {
    setUseR3F(isR3FGraphEnabled());
  }, []);

  return (
    <section className="graph-section" id="graph">
      <div className="section-head">
        <p className="section-head__eyebrow">01 — The lab</p>
        <h2 className="section-head__title">Everything I know, connected</h2>
        <p className="section-head__desc">
          Instead of a plain list, I put all my skills, projects, roles, and awards into an
          interactive graph. The lines between them show real connections &mdash; like which tools
          I used in a project, or what I picked up during an internship. Feel free to drag things
          around, click on a node, or search for something specific.
        </p>
      </div>

      <div className="graph-stats" id="graphStats">
        <div className="graph-stat">
          <span className="graph-stat__num hero__stat-num" id="statSkills" data-count-to="0">
            0
          </span>
          <span className="graph-stat__label">Skills</span>
        </div>
        <div className="graph-stat">
          <span className="graph-stat__num hero__stat-num" id="statProjects" data-count-to="0">
            0
          </span>
          <span className="graph-stat__label">Projects</span>
        </div>
        <div className="graph-stat">
          <span className="graph-stat__num hero__stat-num" id="statExperience" data-count-to="0">
            0
          </span>
          <span className="graph-stat__label">Roles</span>
        </div>
        <div className="graph-stat">
          <span className="graph-stat__num hero__stat-num" id="statAchievements" data-count-to="0">
            0
          </span>
          <span className="graph-stat__label">Awards</span>
        </div>
        <div className="graph-stat">
          <span className="graph-stat__num hero__stat-num" id="statConnections" data-count-to="0">
            0
          </span>
          <span className="graph-stat__label">Connections</span>
        </div>
      </div>

      <div className="graph-toolbar">
        <div className="graph-filters" id="graphFilters" role="group" aria-label="Filter graph by type">
          <button className="filter-chip is-active" data-filter="all">
            <span className="filter-chip__dot" style={{ background: "var(--c-text-soft)" }} />
            All
          </button>
          <button className="filter-chip" data-filter="skill">
            <span className="filter-chip__dot" style={{ background: "var(--c-skill)" }} />
            Skills
          </button>
          <button className="filter-chip" data-filter="project">
            <span className="filter-chip__dot" style={{ background: "var(--c-project)" }} />
            Projects
          </button>
          <button className="filter-chip" data-filter="experience">
            <span className="filter-chip__dot" style={{ background: "var(--c-experience)" }} />
            Experience
          </button>
          <button className="filter-chip" data-filter="achievement">
            <span className="filter-chip__dot" style={{ background: "var(--c-achievement)" }} />
            Achievements
          </button>
        </div>

        <div className="graph-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            id="graphSearch"
            name="graphSearch"
            placeholder="Search the graph — React, RAG, Hackathon…"
            autoComplete="off"
          />
          <ul className="graph-search__results" id="graphSearchResults" hidden></ul>
        </div>
      </div>

      <nav className="graph-breadcrumb" id="graphBreadcrumb" aria-label="Exploration path" hidden></nav>

      <div className="graph-shell">
        <div className="graph-canvas-wrap">
          {useR3F ? (
            <R3FKnowledgeGraph />
          ) : (
            <canvas id="graphCanvas" />
          )}
          <div className="graph-tooltip" id="graphTooltip" hidden></div>
          <p className="graph-hint" id="graphHint">
            Tip: drag to rearrange &middot; scroll to zoom &middot; double-click to focus &middot; click
            a node for details
          </p>
        </div>

        <aside className="graph-panel" id="graphPanel" aria-live="polite">
          <div className="graph-panel__empty" id="graphPanelEmpty">
            <p className="graph-panel__empty-kicker">Nothing selected</p>
            <p className="graph-panel__empty-desc">Click any node on the graph to see what it connects to.</p>
          </div>
          <div className="graph-panel__content" id="graphPanelContent" hidden>
            <div className="graph-panel__head">
              <span className="graph-panel__type" id="panelType"></span>
              <span className="graph-panel__degree" id="panelDegree"></span>
            </div>
            <h3 className="graph-panel__title" id="panelTitle"></h3>
            <p className="graph-panel__meta" id="panelMeta"></p>
            <p className="graph-panel__desc" id="panelDesc"></p>

            <div className="graph-panel__why" id="panelWhy" hidden>
              <p className="graph-panel__section-label">Why it's here</p>
              <p className="graph-panel__why-text" id="panelWhyText"></p>
            </div>

            <div className="graph-panel__impact" id="panelImpact" hidden>
              <p className="graph-panel__section-label">Impact</p>
              <ul id="panelImpactList"></ul>
            </div>
            <div className="graph-panel__impact" id="panelLearned" hidden>
              <p className="graph-panel__section-label">Learned</p>
              <ul id="panelLearnedList"></ul>
            </div>

            <div className="graph-panel__tags" id="panelTags"></div>
            <div className="graph-panel__connections">
              <p className="graph-panel__connections-label">
                Connected to <span id="panelConnCount"></span>
              </p>
              <ul id="panelConnections"></ul>
            </div>
            <a className="graph-panel__link" id="panelLink" href="#" target="_blank" rel="noopener" hidden>
              View project &rarr;
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
