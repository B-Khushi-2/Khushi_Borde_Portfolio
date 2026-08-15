/** Ported 1:1 — terminal + form wired up by /legacy/main.js. */
export function ContactSection() {
  return (
    <section className="contact" id="contact">
      <div className="contact__inner">
        <div className="contact__intro">
          <p className="section-head__eyebrow">06 — Say hello</p>
          <h2 className="contact__title">
            I'd love to hear
            <br />
            from you!
          </h2>
          <div className="contact__status-line">
            <span className="contact__status-dot" aria-hidden="true"></span>
            <p className="contact__lede" id="contactLede"></p>
          </div>
        </div>

        <div className="contact__grid">
          {/* ---- Interactive terminal ---- */}
          <div className="contact__terminal" id="contactTerminal">
            <div className="contact__terminal-bar">
              <span></span>
              <span></span>
              <span></span>
              <span className="contact__terminal-label">khushi@portfolio: ~</span>
            </div>
            <div className="contact__terminal-body" id="terminalBody"></div>
            <form className="contact__terminal-inputrow" id="terminalForm">
              <span className="contact__terminal-chevron">&gt;</span>
              <input
                type="text"
                id="terminalInput"
                name="terminalInput"
                className="contact__terminal-input"
                autoComplete="off"
                spellCheck="false"
                placeholder="type 'help' and press enter…"
                aria-label="Terminal command input"
              />
            </form>
          </div>



          {/* ---- Current status / focus / quick stats ---- */}
          <div className="contact__status-card">
            <p className="contact__status-response">
              Response time &middot; <span id="contactResponseTime"></span>
            </p>

            <p className="contact__status-heading">Current focus</p>
            <div className="contact__focus-tags" id="contactFocus"></div>

            <p className="contact__status-heading">Quick stats</p>
            <div className="contact__quickstats" id="contactQuickStats"></div>
          </div>

          {/* ---- Quick contact card ---- */}
          <div className="contact__quick-card">
            <p className="contact__status-heading">Quick contact</p>
            <div className="contact__quick-row">
              <div className="contact__quick-info">
                <p className="contact__card-label">Email</p>
                <a className="contact__card-value" id="contactEmail" href="#"></a>
              </div>
              <button type="button" className="contact__copy-btn" id="copyEmailBtn" aria-label="Copy email address">
                <span className="contact__copy-btn-icon" aria-hidden="true">
                  <svg className="icon-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="8" y="8" width="12" height="12" rx="2.5" />
                    <path d="M15.5 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2" />
                  </svg>
                  <svg className="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <span className="contact__copy-btn-label" id="copyEmailLabel">
                  Copy
                </span>
              </button>
            </div>
            <div className="contact__quick-row">
              <div className="contact__quick-info">
                <p className="contact__card-label">Contact No</p>
                <a className="contact__card-value" id="contactPhone" href="tel:+918010648383">+91 8010648383</a>
              </div>
              <button type="button" className="contact__copy-btn" id="copyPhoneBtn" aria-label="Copy phone number">
                <span className="contact__copy-btn-icon" aria-hidden="true">
                  <svg className="icon-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="8" y="8" width="12" height="12" rx="2.5" />
                    <path d="M15.5 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2" />
                  </svg>
                  <svg className="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <span className="contact__copy-btn-label" id="copyPhoneLabel">
                  Copy
                </span>
              </button>
            </div>
            <div className="contact__quick-row">
              <div className="contact__quick-info">
                <p className="contact__card-label">Location</p>
                <p className="contact__card-value" id="contactLocation"></p>
              </div>
            </div>
            <p className="contact__desc" id="contactEducation"></p>
            <div className="contact__actions">
              <a className="btn btn--resume" id="navResumeTwin" href="#">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
                <span>Download Resume</span>
              </a>
              <a className="btn btn--ghost btn--icon-trail" id="contactGithub" href="#" target="_blank" rel="noopener">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.2c0-.9.1-1.3-.5-1.9 2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.9 5.5 3.2 5.5 3.2a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.6c0 4.6 2.8 5.7 5.5 6-.5.5-.5 1-.5 1.8V21" />
                </svg>
                <span>GitHub</span>
                <svg className="btn__trail-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17L17 7M9 7h8v8" />
                </svg>
              </a>
              <a className="btn btn--ghost btn--icon-trail" id="contactLinkedin" href="#" target="_blank" rel="noopener">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
                  <path d="M8 10.5V17M8 7.6v.02M12.2 17v-4c0-1.4.9-2.5 2.4-2.5s2.4 1.1 2.4 2.5v4" />
                </svg>
                <span>LinkedIn</span>
                <svg className="btn__trail-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17L17 7M9 7h8v8" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="contact__closing">
        <div className="contact__closing-line" aria-hidden="true"></div>
        <footer className="footer">
          <span className="footer__copy" id="footerName"></span>
          <a className="footer__totop" href="#top">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
            <span>Back to top</span>
          </a>
        </footer>
      </div>
    </section>
  );
}
