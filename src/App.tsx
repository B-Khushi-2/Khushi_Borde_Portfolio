import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import {
  Nav,
  Hero,
  GraphSection,
  SkillsSection,
  ProjectsSection,
  ExperienceSection,
  AchievementsSection,
  ContactSection,
} from "@/features/legacy-site/components";
import { useLegacyScripts } from "@/features/legacy-site/hooks/useLegacyScripts";
import { RecruiterModeProvider } from "@/features/recruiter-mode";

// Code-split: the copilot widget (framer-motion, markdown rendering,
// syntax highlighting, voice mode) isn't needed for the initial page
// paint, so it's fetched in its own chunk once the rest of the app has
// mounted rather than bundled with the critical path.
const RecruiterCopilot = lazy(() =>
  import("@/features/copilot").then((m) => ({ default: m.RecruiterCopilot }))
);

function App() {
  // Boots data.js / graph.js / main.js once this shell is mounted.
  useLegacyScripts();

  return (
    <RecruiterModeProvider>
      <ErrorBoundary>
        <Nav />
        <Hero />
        <GraphSection />
        <SkillsSection />
        <ProjectsSection />
        <ExperienceSection />
        <AchievementsSection />
        <ContactSection />
      </ErrorBoundary>

      {/* AI Recruiter Copilot — streams from the Express backend's
          POST /api/chat/stream (server/api/chat.js). Isolated in its own
          error boundary so a bug here can never take down the rest of the
          (working) legacy site, and lazy-loaded (see import above) so it
          never delays first paint of the legacy site itself. */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          <RecruiterCopilot />
        </Suspense>
      </ErrorBoundary>

      {/* Recruiter Mode — integrated directly inside the RecruiterCopilot chatbot window */}
    </RecruiterModeProvider>
  );
}

export default App;
