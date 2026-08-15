/** Ported 1:1 — timeline items rendered into #timelineList by /legacy/main.js. */
export function ExperienceSection() {
  return (
    <section className="timeline-section" id="experience">
      <div className="timeline-section__bg" aria-hidden="true"></div>
      <div className="section-head">
        <p className="section-head__eyebrow">04 — My path</p>
        <h2 className="section-head__title">Experience</h2>
        <p className="section-head__desc">
          Here's my journey so far — internships, campus leadership, and the roles that shaped how I think and build.
        </p>
      </div>
      <div className="timeline-wrap">
        <p className="timeline-wrap__kicker">My Journey</p>
        <div className="timeline">
          <div className="timeline__spine" aria-hidden="true">
            <span className="timeline__spine-fill"></span>
            <span className="timeline__hub">KB</span>
          </div>
          <ol className="timeline__list" id="timelineList"></ol>
        </div>
      </div>
    </section>
  );
}
