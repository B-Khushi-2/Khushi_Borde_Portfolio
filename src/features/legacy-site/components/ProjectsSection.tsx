/** Ported 1:1 — cards rendered into #projectGrid by /legacy/main.js. */
export function ProjectsSection() {
  return (
    <section className="projects" id="projects">
      <div className="section-head section-head--row">
        <div>
         <p className="section-head__eyebrow">03 — My work</p>
          <h2 className="section-head__title">Projects I've built</h2>
          <p className="section-head__desc">Here's what I've been working on — the same projects from the graph, laid out for a straight read.</p>
        </div>
        <a className="btn btn--ghost section-head__cta" id="viewAllProjects" target="_blank" rel="noopener">
          View All Projects
        </a>
      </div>
      <div className="project-grid" id="projectGrid"></div>
    </section>
  );
}
