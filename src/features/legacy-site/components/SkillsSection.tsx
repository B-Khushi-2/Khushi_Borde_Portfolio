/** Ported 1:1 — populated by /legacy/main.js's initSkillsEcosystem(). */
export function SkillsSection() {
  return (
    <section className="skills" id="skills">
      <div className="section-head">
        <p className="section-head__eyebrow">02 — My toolkit</p>
        <h2 className="section-head__title">Technologies I Work With</h2>
        <p className="section-head__desc">
          These are the tools and technologies I use regularly. Each one links back to a project,
          role, or achievement where I actually used it &mdash; hover over any skill to see the
          connections.
        </p>
      </div>

      <div className="skills-shell" id="skillsShell">
        <svg className="skills-wire" id="skillsWire" aria-hidden="true">
          <path id="skillsWirePath" />
        </svg>

        <div className="skills-clusters" id="skillsClusters"></div>

        <aside className="skills-readout" id="skillsReadout" aria-live="polite">
          <div className="skills-readout__empty" id="skillsReadoutEmpty">
            <p className="skills-readout__empty-kicker">Nothing selected</p>
            <p className="skills-readout__empty-desc">
              Hover or tab through any skill on the left to see where I've actually used it.
            </p>
            <div className="skills-readout__empty-legend">
              <span>
                <i style={{ background: "var(--c-project)" }}></i>Projects
              </span>
              <span>
                <i style={{ background: "var(--c-experience)" }}></i>Experience
              </span>
              <span>
                <i style={{ background: "var(--c-achievement)" }}></i>Achievements
              </span>
            </div>
          </div>
          <div className="skills-readout__content" id="skillsReadoutContent" hidden>
            <div className="skills-readout__head">
              <span className="skills-readout__dot" id="readoutDot" aria-hidden="true"></span>
              <div>
                <p className="skills-readout__kicker" id="readoutCluster"></p>
                <h3 className="skills-readout__title" id="readoutTitle"></h3>
              </div>
            </div>

            <div className="skills-readout__group" id="readoutProjects" hidden>
              <p className="skills-readout__label">
                <span style={{ background: "var(--c-project)" }}></span>Used in
              </p>
              <ul id="readoutProjectsList"></ul>
            </div>
            <div className="skills-readout__group" id="readoutExperience" hidden>
              <p className="skills-readout__label">
                <span style={{ background: "var(--c-experience)" }}></span>Built during
              </p>
              <ul id="readoutExperienceList"></ul>
            </div>
            <div className="skills-readout__group" id="readoutAchievements" hidden>
              <p className="skills-readout__label">
                <span style={{ background: "var(--c-achievement)" }}></span>Proven by
              </p>
              <ul id="readoutAchievementsList"></ul>
            </div>
            <p className="skills-readout__fallback" id="readoutFallback" hidden>
              Foundational skill &mdash; runs under the stack rather than tied to one project.
            </p>

            <button type="button" className="skills-readout__graph-btn" id="readoutGraphBtn">
              <span>View in Knowledge Graph</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
