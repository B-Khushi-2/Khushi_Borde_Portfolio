import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  Loader2,
  X,
  User,
  GraduationCap,
  Calendar,
  MapPin,
  TrendingUp,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Zap,
  FileText,
  Share2,
  Printer,
  Wand2,
  AlertTriangle
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRecruiterMode } from "@/features/recruiter-mode/context/RecruiterModeContext";
import { useWorkspaceAnalysis } from "@/features/recruiter-mode/hooks/useWorkspaceAnalysis";

type TabId = "overview" | "analysis" | "projects" | "ats";

export function RecruiterModeOverlay() {
  const { isOpen, close } = useRecruiterMode();
  const { analysis, loading, error } = useWorkspaceAnalysis(isOpen);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [copiedLink, setCopiedLink] = useState(false);

  // Lock background scroll while open; close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopilotOpen = (initialPrompt?: string) => {
    close();
    setTimeout(() => {
      // Find the copilot floating button or root trigger to open it and prefill
      const copilotRoot = document.querySelector("[data-copilot-root]");
      if (copilotRoot) {
        const floatBtn = copilotRoot.querySelector("button");
        if (floatBtn) floatBtn.click();
      }
      if (initialPrompt) {
        // Find input textarea if available and prefill it
        setTimeout(() => {
          const textarea = document.querySelector("textarea") as HTMLTextAreaElement | null;
          if (textarea) {
            textarea.value = initialPrompt;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            textarea.focus();
          }
        }, 300);
      }
    }, 150);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Recruiter Intelligence Workspace"
          className="fixed inset-0 z-[100] flex flex-col bg-zinc-950 text-zinc-100 font-sans"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <header className="print:hidden flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
                <Briefcase size={16} className="text-white" />
              </span>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  Recruiter Intelligence Workspace
                  <span className="px-1.5 py-[1px] rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold tracking-wide text-indigo-400 uppercase">
                    Premium
                  </span>
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Automated Candidate Intelligence & Analytical Assessment Dashboard
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close Recruiter Mode"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer active:scale-95"
            >
              <X size={18} />
            </button>
          </header>

          {/* Main workspace frame */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-zinc-400">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
                <span>Running analytical intelligence engines...</span>
              </div>
            ) : error || !analysis ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-red-400 p-6 text-center">
                <AlertTriangle size={32} />
                <span>{error || "An error occurred executing the intelligence report."}</span>
                <button
                  type="button"
                  onClick={close}
                  className="px-4 py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded-lg text-xs font-semibold mt-2 cursor-pointer transition-colors"
                >
                  Return to Portfolio
                </button>
              </div>
            ) : (
              <>
                {/* Left pane: Quick actions sidebar */}
                <div className="print:hidden w-full md:w-64 border-r border-zinc-800 bg-zinc-900/20 p-5 flex flex-col gap-5 flex-shrink-0">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3">
                      Recruiter Actions
                    </h3>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopilotOpen("Start interview prep mode: ask me specialized system design questions.")}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-all text-left w-full cursor-pointer"
                      >
                        <Wand2 size={13} className="text-indigo-400" />
                        <span>Generate Interview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopilotOpen("Create a detailed hiring report summarizing my candidate suitability.")}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-all text-left w-full cursor-pointer"
                      >
                        <FileText size={13} className="text-indigo-400" />
                        <span>Generate Hiring Report</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopilotOpen("Check my background for keyword alignments and suggest ATS improvements.")}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-zinc-855 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-all text-left w-full cursor-pointer"
                      >
                        <TrendingUp size={13} className="text-indigo-400" />
                        <span>Generate ATS Analysis</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopilotOpen("Summarize Khushi Borde's projects and core skills.")}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-all text-left w-full cursor-pointer"
                      >
                        <User size={13} className="text-indigo-400" />
                        <span>Generate Candidate Summary</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800/50 pt-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3">
                      Export Options
                    </h3>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-zinc-850 border border-transparent hover:border-zinc-800 text-zinc-300 transition-all text-left w-full cursor-pointer"
                      >
                        <Printer size={13} />
                        <span>Print Workspace (PDF)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-zinc-850 border border-transparent hover:border-zinc-800 text-zinc-300 transition-all text-left w-full cursor-pointer"
                      >
                        <Share2 size={13} />
                        <span>{copiedLink ? "Link Copied!" : "Copy Report Link"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopilotOpen()}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg hover:bg-zinc-850 border border-transparent hover:border-zinc-800 text-zinc-300 transition-all text-left w-full cursor-pointer"
                      >
                        <Briefcase size={13} />
                        <span>Open Recruiter Copilot</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Navigation Tabs */}
                  <div className="print:hidden flex border-b border-zinc-800 bg-zinc-900/10 px-6 py-2 gap-4 flex-shrink-0 select-none">
                    {(["overview", "analysis", "projects", "ats"] as TabId[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-2 text-xs font-semibold transition-all border-b-2 hover:text-white capitalize cursor-pointer ${
                          activeTab === tab
                            ? "border-indigo-500 text-white"
                            : "border-transparent text-zinc-400"
                        }`}
                      >
                        {tab === "ats" ? "ATS & Interview" : tab === "projects" ? "Skills & Projects" : tab}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable tab panes */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-950/20 copilot-scroll">
                    {activeTab === "overview" && (
                      <div className="grid gap-6 md:grid-cols-3">
                        {/* Profile Overview Card */}
                        <div className="md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-xl flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-bold text-white">{analysis.overview.name}</h3>
                                <p className="text-xs text-indigo-400 font-medium">{analysis.overview.role}</p>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-[9px] font-bold text-emerald-400 uppercase select-none">
                                {analysis.overview.availability}
                              </span>
                            </div>

                            <div className="grid gap-3 text-xs border-t border-zinc-850 pt-4">
                              <div className="flex items-center gap-2 text-zinc-300">
                                <GraduationCap size={14} className="text-zinc-500 shrink-0" />
                                <span>{analysis.overview.education}</span>
                              </div>
                              <div className="flex items-center gap-2 text-zinc-300">
                                <MapPin size={14} className="text-zinc-500 shrink-0" />
                                <span>{analysis.overview.location}</span>
                              </div>
                              <div className="flex items-center gap-2 text-zinc-300">
                                <Calendar size={14} className="text-zinc-500 shrink-0" />
                                <span>{analysis.overview.experience}</span>
                              </div>
                              <div className="flex items-center gap-2 text-zinc-300">
                                <BookOpen size={14} className="text-zinc-500 shrink-0" />
                                <span>{analysis.overview.achievements}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Summary Widget */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-xl flex flex-col justify-between">
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                              Technology Distribution
                            </h4>
                            <div className="space-y-3 pt-2">
                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span>AI/ML (Python & CNNs)</span>
                                  <span className="text-zinc-400">45%</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: "45%" }} />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span>Frontend (React & UI)</span>
                                  <span className="text-zinc-400">30%</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-400 rounded-full" style={{ width: "30%" }} />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                  <span>Backend & Automation</span>
                                  <span className="text-zinc-400">25%</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-violet-500 rounded-full" style={{ width: "25%" }} />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-zinc-850 pt-4 mt-4 flex items-center justify-between text-[11px] text-zinc-400">
                            <span>Verification Level</span>
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <ShieldCheck size={12} />
                              Validated (100%)
                            </span>
                          </div>
                        </div>

                        {/* Interactive Timeline Card */}
                        <div className="md:col-span-3 rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-xl space-y-4">
                          <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                            Hiring Timeline & Milestones
                          </h4>
                          <div className="relative pl-6 border-l border-zinc-850 space-y-5 py-2">
                            <div className="relative">
                              <span className="absolute -left-[30px] top-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-indigo-950" />
                              <div className="flex justify-between text-xs font-semibold text-white mb-0.5">
                                <span>SIH (Smart India Hackathon) Finalist</span>
                                <span className="text-zinc-500">Dec 2023</span>
                              </div>
                              <p className="text-[11px] text-zinc-400">
                                Led geospatial threat alerting implementations on Fire Detection pipelines.
                              </p>
                            </div>
                            <div className="relative">
                              <span className="absolute -left-[30px] top-1.5 h-2 w-2 rounded-full bg-violet-500 ring-4 ring-violet-950" />
                              <div className="flex justify-between text-xs font-semibold text-white mb-0.5">
                                <span>40+ Certifications Completed</span>
                                <span className="text-zinc-500">2024</span>
                              </div>
                              <p className="text-[11px] text-zinc-400">
                                Certified across Deep Learning, Neural Nets, and automation webhooks.
                              </p>
                            </div>
                            <div className="relative">
                              <span className="absolute -left-[30px] top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-950" />
                              <div className="flex justify-between text-xs font-semibold text-white mb-0.5">
                                <span>Available for Immediate Projects</span>
                                <span className="text-zinc-500">Current</span>
                              </div>
                              <p className="text-[11px] text-zinc-400">
                                Seeking technical AI, MERN, or integrations developer internships.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "analysis" && (
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Executive Summary Card */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-xl space-y-3">
                          <div className="flex items-center gap-2">
                            <Zap size={14} className="text-amber-400" />
                            <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                              Executive Summary
                            </h4>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            {analysis.aiAnalysis.executiveSummary}
                          </p>
                          <div className="border-t border-zinc-850 pt-3 mt-3">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wide">
                              Hiring Assessment
                            </span>
                            <p className="text-xs text-emerald-400 font-semibold mt-1">
                              {analysis.aiAnalysis.hiringRecommendation}
                            </p>
                          </div>
                        </div>

                        {/* Engineering Maturity Ratings */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-xl space-y-4">
                          <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                            AI Readiness & Engineering Maturity
                          </h4>
                          <div className="grid gap-3 pt-1">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-zinc-300 font-medium">AI Readiness</span>
                                <span className="text-indigo-400 font-bold">{analysis.aiAnalysis.aiReadiness}%</span>
                              </div>
                              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full animate-pulse" style={{ width: `${analysis.aiAnalysis.aiReadiness}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-zinc-300 font-medium">Engineering Maturity</span>
                                <span className="text-indigo-400 font-bold">{analysis.aiAnalysis.engineeringMaturity}%</span>
                              </div>
                              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: `${analysis.aiAnalysis.engineeringMaturity}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-zinc-300 font-medium">Leadership Potential</span>
                                <span className="text-indigo-400 font-bold">{analysis.aiAnalysis.leadershipPotential}%</span>
                              </div>
                              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: `${analysis.aiAnalysis.leadershipPotential}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-zinc-300 font-medium">Communication Scale</span>
                                <span className="text-indigo-400 font-bold">{analysis.aiAnalysis.communication}%</span>
                              </div>
                              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: `${analysis.aiAnalysis.communication}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Strengths & Risks Cards */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-xl space-y-3">
                          <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                            Core Strengths
                          </h4>
                          <div className="flex flex-col gap-2.5">
                            {analysis.aiAnalysis.strengths.map((str, idx) => (
                              <div key={idx} className="flex gap-2 text-xs text-zinc-300 items-start">
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold mt-0.5">
                                  ✓
                                </span>
                                <span>{str}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-xl space-y-3">
                          <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                            Potential Risk Gaps
                          </h4>
                          <div className="flex flex-col gap-2.5">
                            {analysis.aiAnalysis.risks.map((risk, idx) => (
                              <div key={idx} className="flex gap-2 text-xs text-zinc-300 items-start">
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold mt-0.5">
                                  !
                                </span>
                                <span>{risk}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "projects" && (
                      <div className="space-y-6">
                        {/* Dynamic Skill Ratings Grid */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-xl space-y-4">
                          <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                            Skills Analysis Gauge
                          </h4>
                          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                            {Object.entries(analysis.skillsAnalysis).map(([skill, val]) => (
                              <div key={skill} className="rounded-lg bg-zinc-900/40 border border-zinc-800 p-3.5 flex flex-col justify-between">
                                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                                  {skill === "aiml" ? "AI / ML" : skill.replace(/([A-Z])/g, " $1")}
                                </span>
                                <div className="flex items-baseline gap-1 mt-2">
                                  <span className="text-xl font-bold text-white">{val}</span>
                                  <span className="text-[10px] text-zinc-500">/ 100</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden mt-3">
                                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${val}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Project Breakdown list */}
                        <div className="space-y-3.5">
                          <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                            Deep Project Insights
                          </h4>
                          <div className="grid gap-4 md:grid-cols-2">
                            {analysis.projectInsights.map((proj) => (
                              <div key={proj.name} className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-xl flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between gap-2.5">
                                    <h5 className="text-sm font-bold text-white">{proj.name}</h5>
                                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold text-indigo-400 uppercase">
                                      Complexity: {proj.complexity}
                                    </span>
                                  </div>
                                  <p className="text-[11.5px] text-zinc-400 mt-2 border-l border-indigo-500/20 pl-2">
                                    <strong>Architecture:</strong> {proj.architecture}
                                  </p>
                                  <div className="grid gap-2 text-xs pt-3.5 border-t border-zinc-850 mt-3.5">
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-zinc-500">Innovation</span>
                                      <span className="text-zinc-300 font-semibold">{proj.innovation}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-zinc-500">Scalability</span>
                                      <span className="text-zinc-300 font-semibold">{proj.scalability}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-zinc-500">Business Impact</span>
                                      <span className="text-zinc-300 font-semibold">{proj.businessImpact}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "ats" && (
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* ATS Score gauge */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-xl space-y-4 flex flex-col justify-between">
                          <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                            ATS Compatibility Analysis
                          </h4>
                          <div className="flex items-center gap-6 py-2">
                            {/* Circular CSS Gauge */}
                            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-950/10">
                              <span className="text-3xl font-extrabold text-white">
                                {analysis.atsAnalysis.compatibilityScore}
                              </span>
                              <span className="absolute bottom-4 text-[9px] uppercase tracking-wide text-zinc-500 font-bold">
                                Score
                              </span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-zinc-200">Excellent Keywords Alignment</span>
                              <p className="text-[11px] text-zinc-400">
                                Over <strong>{analysis.atsAnalysis.keywordCoverage}%</strong> coverage matched across AI systems and full-stack indices.
                              </p>
                            </div>
                          </div>

                          <div className="border-t border-zinc-850 pt-4">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Missing Keywords
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {analysis.atsAnalysis.missingKeywords.map((kw) => (
                                <span
                                  key={kw}
                                  className="px-2 py-0.5 rounded bg-zinc-850 border border-zinc-800 text-[10px] text-zinc-300"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* ATS Optimization suggestions */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-xl space-y-3.5">
                          <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                            ATS Optimizations Suggestions
                          </h4>
                          <div className="flex flex-col gap-3">
                            {analysis.atsAnalysis.optimizationSuggestions.map((sug, idx) => (
                              <div key={idx} className="flex gap-2 text-xs text-zinc-300 items-start">
                                <span className="h-4 w-4 shrink-0 flex items-center justify-center rounded-full bg-zinc-800 text-[9px] text-zinc-400 font-bold mt-0.5">
                                  {idx + 1}
                                </span>
                                <span>{sug}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Likely questions */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-xl space-y-3">
                          <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                            Likely Interview Questions
                          </h4>
                          <div className="flex flex-col gap-3">
                            {analysis.interviewReadiness.questions.map((q, idx) => (
                              <div key={idx} className="rounded-lg bg-zinc-900/40 border border-zinc-800 p-3 flex flex-col gap-1 hover:border-zinc-700 transition-colors">
                                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">
                                  Question {idx + 1}
                                </span>
                                <p className="text-xs text-zinc-200 font-medium">"{q}"</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Weak areas & Prep suggestions */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 shadow-xl space-y-4 flex flex-col justify-between">
                          <div className="space-y-3.5">
                            <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                              Preparation Actions
                            </h4>
                            <div className="flex flex-col gap-2.5">
                              {analysis.interviewReadiness.preparationSuggestions.map((sug, idx) => (
                                <div key={idx} className="flex gap-2.5 text-xs text-zinc-300 items-start">
                                  <ChevronRight size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                                  <span>{sug}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-zinc-850 pt-4 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-zinc-500 font-semibold block text-[10px] uppercase">
                                Strong Areas
                              </span>
                              <span className="text-emerald-400 font-bold block mt-0.5">
                                {analysis.interviewReadiness.strongAreas[0]}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 font-semibold block text-[10px] uppercase">
                                Growth Area
                              </span>
                              <span className="text-amber-400 font-bold block mt-0.5">
                                {analysis.interviewReadiness.weakAreas[0]}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
