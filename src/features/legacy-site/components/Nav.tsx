/**
 * Site navigation — markup ported 1:1 from the original index.html so the
 * legacy theme-toggle / mobile-menu logic in /legacy/main.js (which looks
 * these elements up by id) keeps working unchanged.
 */
export function Nav() {
  return (
    <header className="nav" id="nav">
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-md focus:bg-[hsl(var(--primary,262_83%_66%))] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <nav className="nav__links" aria-label="Primary">
        <a href="#graph">Lab</a>
        <a href="#skills">Skills</a>
        <a href="#projects">Projects</a>
        <a href="#experience">Experience</a>
        <a href="#achievements">Hall Of Fame</a>
        <a
          href="#chat-with-khushi-ai"
          onClick={(e) => {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("open-copilot"));
          }}
          className="nav__talk inline-flex items-center gap-1.5"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Khushi's AI Agent</span>
          <svg className="w-3.5 h-3.5 text-purple-300 fill-current" viewBox="0 0 24 24">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
          </svg>
        </a>
        <a href="#" className="nav__cta" id="navResume">
          Resume
        </a>
      </nav>
      <button
        className="nav__toggle"
        id="navToggle"
        aria-label="Toggle menu"
        aria-expanded="false"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </header>
  );
}
