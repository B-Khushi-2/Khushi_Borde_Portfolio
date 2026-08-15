import { Briefcase, Loader2, Users, MessageCircle, X } from "lucide-react";
import { useRecruiterMode } from "@/features/recruiter-mode/context/RecruiterModeContext";
import { useHiringReport } from "@/features/recruiter-mode/hooks/useHiringReport";
import { ReportControls } from "@/features/recruiter-mode/components/ReportControls";
import { ActionsBar } from "@/features/recruiter-mode/components/ActionsBar";
import { HiringSummaryCard } from "@/features/recruiter-mode/components/sections/HiringSummaryCard";
import { ResumeSummaryCard } from "@/features/recruiter-mode/components/sections/ResumeSummaryCard";
import { ProjectsCard } from "@/features/recruiter-mode/components/sections/ProjectsCard";
import { TechnicalSkillsCard } from "@/features/recruiter-mode/components/sections/TechnicalSkillsCard";
import { EvidenceCard } from "@/features/recruiter-mode/components/sections/EvidenceCard";
import { SuitabilityScoreCard } from "@/features/recruiter-mode/components/sections/SuitabilityScoreCard";

export function RecruiterDashboardPane() {
  const { isOpen, close } = useRecruiterMode();
  const {
    deterministic,
    jobDescription,
    setJobDescription,
    jdSuitability,
    aiReport,
    status,
    error,
    generateReport,
  } = useHiringReport(isOpen);

  function scrollToContact() {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  }

  const profile = (deterministic && (window as unknown as { PORTFOLIO?: { profile?: Record<string, unknown> } }).PORTFOLIO?.profile) as
    | { links?: { github?: string; linkedin?: string }; email?: string }
    | undefined;

  const suitability = aiReport
    ? { score: aiReport.suitabilityScore, rationale: aiReport.suitabilityRationale, source: "ai" as const }
    : jdSuitability
      ? { score: jdSuitability.score, rationale: jdSuitability.rationale, source: "jd-heuristic" as const }
      : deterministic
        ? { ...deterministic.suitability, source: "heuristic" as const }
        : null;

  return (
    <div className="flex h-full w-full md:w-[480px] flex-col bg-black/35 border-l border-white/10 select-none font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5 px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md">
            <Briefcase size={15} className="text-white" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Hiring Dashboard</p>
            <p className="text-[10px] text-zinc-400">Dynamic suitability report</p>
          </div>
        </div>
        
        {/* Close Button to exit Recruiter Mode */}
        <button
          type="button"
          onClick={close}
          aria-label="Close Recruiter Mode"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable Dashboard Metrics */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 copilot-scroll">
        {!deterministic ? (
          <div className="flex h-full items-center justify-center gap-2 text-xs text-zinc-400">
            <Loader2 size={14} className="animate-spin" /> Loading data…
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ReportControls
              jobDescription={jobDescription}
              onJobDescriptionChange={setJobDescription}
              onGenerate={generateReport}
              status={status}
              error={error}
            />

            <HiringSummaryCard
              summary={aiReport?.hiringSummary ?? deterministic.hiringSummary}
              isAiGenerated={Boolean(aiReport)}
            />

            <ResumeSummaryCard resume={deterministic.resume} aiSummary={aiReport?.resumeSummary} />

            {suitability && (
              <SuitabilityScoreCard score={suitability.score} rationale={suitability.rationale} source={suitability.source} />
            )}

            <ProjectsCard projects={deterministic.projects} aiAssessment={aiReport?.projectsAssessment} />

            <TechnicalSkillsCard skillGroups={deterministic.skillGroups} aiAssessment={aiReport?.technicalSkillsAssessment} />

            <EvidenceCard
              title="Leadership"
              icon={<Users size={14} className="text-indigo-400" aria-hidden="true" />}
              items={deterministic.leadership}
              aiAssessment={aiReport?.leadershipAssessment}
              emptyText="No direct leadership evidence detected."
            />

            <EvidenceCard
              title="Communication"
              icon={<MessageCircle size={14} className="text-indigo-400" aria-hidden="true" />}
              items={deterministic.communication}
              aiAssessment={aiReport?.communicationAssessment}
              emptyText="No direct communication evidence detected."
            />

            {aiReport && (aiReport.strengths.length > 0 || aiReport.gaps.length > 0) && (
              <div className="grid gap-4">
                {aiReport.strengths.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <h3 className="mb-2 text-xs font-semibold text-white">Strengths</h3>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-400">
                      {aiReport.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiReport.gaps.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <h3 className="mb-2 text-xs font-semibold text-white">Potential Gaps</h3>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-400">
                      {aiReport.gaps.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="p-3 border-t border-white/5 bg-black/10">
        <ActionsBar
          githubUrl={profile?.links?.github}
          linkedinUrl={profile?.links?.linkedin}
          email={profile?.email}
          onContactClick={scrollToContact}
        />
      </div>
    </div>
  );
}
