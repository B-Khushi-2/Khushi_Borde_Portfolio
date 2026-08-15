import type { CSSProperties } from "react";

/** Ported 1:1 from the original hero markup — populated by /legacy/main.js. */
export function Hero() {
  return (
    <section className="hero" id="top">
      <canvas className="hero__field" id="heroField" aria-hidden="true" />
      <div className="hero__aurora" aria-hidden="true">
        <div className="hero__aurora-glow hero__aurora-glow--1"></div>
        <div className="hero__aurora-glow hero__aurora-glow--2"></div>
        <div className="hero__aurora-glow hero__aurora-glow--3"></div>
      </div>
      <div className="hero__grid-overlay" aria-hidden="true"></div>
      <div className="hero__noise" aria-hidden="true"></div>
      <div className="hero__inner">
        <div className="hero__inner--split">
        <div className="hero__content">
          <p className="hero__eyebrow">
            <span className="hero__eyebrow-dot" aria-hidden="true" />
            HI, I'M AN AI/ML ENGINEER &amp; FULL-STACK BUILDER
          </p>
          <h1 className="hero__title">
            <span className="hero__title-first" id="heroNameFirst">
              Khushi
            </span>
            <span className="hero__title-last" id="heroNameLast">
              Borde
            </span>
          </h1>
          <p className="hero__tagline" id="heroTagline"></p>
        </div>

        <div className="hero__portrait-wrap">
          <div className="hero__portrait" id="heroPortrait" aria-hidden="true">
            <div className="hero__portrait-glow"></div>
            <div className="hero__portrait-grid"></div>

            <div className="hero__portrait-frame" id="heroFrame">
              <div className="hero__portrait-media">
                <video
                  className="hero__portrait-video"
                  id="heroVideo"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  poster="/assets/images/avatar-poster.jpg"
                >
                  <source src="/assets/video/avatar-loop.mp4" type="video/mp4" />
                </video>
                <span className="hero__portrait-reflection"></span>
                <span className="hero__portrait-sweep" aria-hidden="true"></span>
              </div>
              <span className="hero__portrait-tag">AI/ML Engineer &middot; that's me!</span>
            </div>

            <div
              className="hero__float-card hero__float-card--accuracy"
              style={{ "--depth": 1.4 } as CSSProperties}
            >
              <span className="hero__float-card__inner">
                <span className="hero__float-card__icon hero__float-card__icon--ok">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 17l6-6 4 4 8-8" />
                    <path d="M17 7h4v4" />
                  </svg>
                </span>
                <span className="hero__float-card__text">
                  <span className="hero__float-card__label">Model Accuracy</span>
                  <span className="hero__float-card__value">98.4%</span>
                </span>
              </span>
            </div>

            <div
              className="hero__float-card hero__float-card--tf"
              style={{ "--depth": 1.1 } as CSSProperties}
            >
              <span className="hero__float-card__inner">
                <span className="hero__float-card__icon hero__float-card__icon--busy">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 8v4l3 2" />
                  </svg>
                </span>
                <span className="hero__float-card__text">
                  <span className="hero__float-card__label">TensorFlow</span>
                  <span className="hero__float-card__value">Training&hellip;</span>
                </span>
              </span>
              <span className="hero__float-card__bar">
                <span></span>
              </span>
            </div>

            <div
              className="hero__float-card hero__float-card--deploy"
              style={{ "--depth": 0.8 } as CSSProperties}
            >
              <span className="hero__float-card__inner">
                <span className="hero__float-card__icon hero__float-card__icon--ok">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <span className="hero__float-card__text">
                  <span className="hero__float-card__label">Deployment</span>
                  <span className="hero__float-card__value">Successful</span>
                </span>
              </span>
            </div>
          </div>
        </div>
        </div>

        <div className="hero__stats">
          <div className="hero__stat">
            <span className="hero__stat-num" data-count-to="9.15" data-decimals="2">
              0
            </span>
            <span className="hero__stat-label">CGPA</span>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-num">Top 5</span>
            <span className="hero__stat-label">Smart India Hackathon</span>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-num">Finalist</span>
            <span className="hero__stat-label">Anveshan National 2026</span>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-num" data-count-to="75" data-suffix="+">
              0
            </span>
            <span className="hero__stat-label">Google Cloud badges</span>
          </div>
        </div>
      </div>
    </section>
  );
}
