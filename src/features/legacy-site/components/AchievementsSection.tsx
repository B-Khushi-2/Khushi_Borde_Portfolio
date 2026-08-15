/** Ported 1:1 — cards rendered into #achievementGrid by /legacy/main.js. */
export function AchievementsSection() {
  return (
    <section className="achievements" id="achievements">
      <div className="section-head section-head--center">
        <h2 className="section-head__title section-head__title--gold">Hall Of Fame</h2>
      </div>
      <div className="achievement-grid" id="achievementGrid"></div>
    </section>
  );
}
