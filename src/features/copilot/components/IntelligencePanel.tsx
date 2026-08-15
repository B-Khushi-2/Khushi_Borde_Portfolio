import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  CheckSquare,
  Square,
  FileDown,
  Sparkles,
  XCircle,
  CheckCircle,
  Loader2,
  Clock,
  Compass,
  Activity,
  Heart,
  Play,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import type { ChatMessage } from "@/features/copilot/types";
import { useIntelligence } from "@/features/copilot/context/IntelligenceContext";

interface IntelligencePanelProps {
  onSendPrompt: (text: string) => void;
  messages?: ChatMessage[];
}

export function IntelligencePanel({ onSendPrompt, messages }: IntelligencePanelProps) {
  const {
    activeWorkflow,
    backgroundTasks,
    checklists,
    actionHistory,
    sessionSummary,
    recommendations,
    telemetry,
    walkthroughStep,
    setPanelOpen,
    cancelTask,
    toggleChecklistItem,
    startWalkthrough,
    nextWalkthroughStep,
    prevWalkthroughStep,
    stopWalkthrough
  } = useIntelligence();

  const [panelTab, setPanelTab] = useState<"workflows" | "telemetry">("workflows");

  const latestAssistantMessage = messages
    ?.slice()
    .reverse()
    .find((m) => m.role === "assistant" && m.detectedRoute);

  const activeRoute = latestAssistantMessage?.detectedRoute || "CANDIDATE_FACT";
  const ragMetrics = latestAssistantMessage?.ragMetrics || [];
  const topicTags = latestAssistantMessage?.topicTags || [];
  const toolCalls = latestAssistantMessage?.toolCalls || [];

  const handleExportSummary = () => {
    if (!sessionSummary) return;
    const text = `CANDIDATE SESSION SUMMARY
=========================
Summary: ${sessionSummary.summary}

Insights:
${sessionSummary.insights.map((i) => `- ${i}`).join("\n")}

Topics Covered:
${sessionSummary.topics.map((t) => `- ${t}`).join("\n")}

Suggested Next Steps:
${sessionSummary.nextSteps.map((n) => `- ${n}`).join("\n")}
`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "candidate_session_summary.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ x: 280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 280, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-80 border-l border-white/10 bg-zinc-950/95 backdrop-blur-md p-4 flex flex-col gap-4 overflow-y-auto copilot-scroll select-none font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Intelligence Panel
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen(false)}
          className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      {/* Segment Selector Tabs */}
      <div className="flex border border-white/10 rounded-lg p-0.5 bg-black/40 text-[10.5px] font-semibold text-zinc-400">
        <button
          type="button"
          onClick={() => setPanelTab("workflows")}
          className={`flex-1 py-1 rounded-md text-center cursor-pointer transition-colors ${
            panelTab === "workflows" ? "bg-zinc-800 text-white" : "hover:text-white"
          }`}
        >
          Workflows
        </button>
        <button
          type="button"
          onClick={() => setPanelTab("telemetry")}
          className={`flex-1 py-1 rounded-md text-center cursor-pointer transition-colors ${
            panelTab === "telemetry" ? "bg-zinc-800 text-white" : "hover:text-white"
          }`}
        >
          Telemetry & SRE
        </button>
      </div>

      {/* Panel Tab Content */}
      {panelTab === "workflows" ? (
        <>
          {/* Dynamic Intent & Pipeline Router Box */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/[0.04] p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">
                Turn Pipeline Router
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {activeRoute}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-zinc-300 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-white font-semibold flex-wrap">
                <span className="text-amber-400 font-bold">{activeRoute}</span>
                <span className="text-zinc-500">➔</span>
                <span className={activeRoute === "CANDIDATE_FACT" ? "text-emerald-400 font-bold" : "text-zinc-400"}>
                  {activeRoute === "CANDIDATE_FACT" ? "Top-10 Cosine + Rerank" : "Skip Retrieval"}
                </span>
                <span className="text-zinc-500">➔</span>
                <span className="text-indigo-400 font-bold">Generation</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-sans">
                {activeRoute === "CANDIDATE_FACT"
                  ? `Route: CANDIDATE_FACT ➔ ${ragMetrics.length} chunks re-ranked ➔ Grounded Generation`
                  : `Route: ${activeRoute} ➔ Retrieval Skipped (0 chunks) ➔ Direct Generation`}
              </p>
            </div>

            {/* Real Executed Tool Calls */}
            {toolCalls.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-indigo-500/20">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-400" /> Executed Agent Tools:
                </span>
                <div className="space-y-1 font-mono text-[10px]">
                  {toolCalls.map((tc, idx) => (
                    <div key={idx} className="p-1.5 rounded bg-black/70 border border-amber-500/30 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-300 font-bold">{tc.name}()</span>
                        <span className="text-[9px] text-emerald-400 uppercase font-sans font-bold">Executed</span>
                      </div>
                      {tc.args && Object.keys(tc.args).length > 0 && (
                        <span className="text-zinc-400 font-sans text-[9.5px] truncate">
                          Args: {JSON.stringify(tc.args)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Topic Tags */}
            {topicTags.length > 0 && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-zinc-400">Topics:</span>
                <div className="flex flex-wrap gap-1">
                  {topicTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded bg-zinc-800 border border-white/10 text-[9.5px] font-semibold text-indigo-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Chunk Scores Breakdown (Cosine vs LLM Reranked) */}
            {activeRoute === "CANDIDATE_FACT" && ragMetrics.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Chunk Scores (Cosine vs Rerank)
                </span>
                <div className="space-y-1 font-mono text-[10px]">
                  {ragMetrics.map((m, idx) => (
                    <div key={idx} className="p-1.5 rounded bg-zinc-900/60 border border-white/5 flex flex-col gap-0.5">
                      <span className="text-zinc-300 font-sans font-semibold truncate">{m.label}</span>
                      <div className="flex justify-between text-zinc-400">
                        <span>Cosine: <strong className="text-indigo-300">{m.cosineScore.toFixed(3)}</strong></span>
                        <span>Rerank (0-10): <strong className="text-emerald-400">{m.rerankScore.toFixed(1)}/10</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Presentation Tour Card */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.02] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">
                AI Presentation Tour
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            {walkthroughStep === null ? (
              <div className="space-y-2">
                <p className="text-[11px] text-zinc-300 leading-normal">
                  Let Khushi's Digital Twin guide you through her skills, projects, timeline, and achievements dynamically.
                </p>
                <button
                  type="button"
                  onClick={startWalkthrough}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 text-xs transition-colors cursor-pointer select-none"
                >
                  <Play size={12} fill="currentColor" /> Start Guided Walkthrough
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs text-zinc-300 font-semibold">
                  <span>Step {walkthroughStep + 1} of 7</span>
                  <span className="capitalize text-indigo-400 font-mono text-[11px]">
                    {["Intro", "Graph Lab", "Skills List", "Projects", "Experience", "Awards", "Contact"][walkthroughStep]}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${((walkthroughStep + 1) / 7) * 100}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={walkthroughStep === 0}
                    onClick={() => prevWalkthroughStep(onSendPrompt)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-xs font-semibold select-none"
                  >
                    <ArrowLeft size={11} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => nextWalkthroughStep(onSendPrompt)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer text-xs font-semibold select-none"
                  >
                    Next <ArrowRight size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={stopWalkthrough}
                    className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 cursor-pointer select-none"
                    title="Stop tour"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Workflows Section */}
          {activeWorkflow && (
            <div className="rounded-xl border border-white/10 bg-white/[0.01] p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">
                  Active Workflow
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              </div>
              <p className="text-xs font-bold text-white leading-tight">{activeWorkflow.name}</p>
              <div className="space-y-2 pt-1 border-t border-white/5 mt-2">
                {activeWorkflow.steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {step.status === "completed" && <CheckCircle size={12} className="text-emerald-400" />}
                    {step.status === "running" && <Loader2 size={12} className="text-indigo-400 animate-spin" />}
                    {step.status === "idle" && <Clock size={12} className="text-zinc-600" />}
                    <span
                      className={
                        step.status === "completed"
                          ? "text-zinc-500 line-through"
                          : step.status === "running"
                          ? "text-indigo-400 font-medium"
                          : "text-zinc-400"
                      }
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Background Tasks Section */}
          {backgroundTasks.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase block">
                Background Tasks
              </span>
              <div className="flex flex-col gap-2">
                {backgroundTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border border-white/5 bg-white/[0.005] p-2.5 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-300 truncate w-36">{task.name}</span>
                      {task.status === "running" ? (
                        <button
                          type="button"
                          onClick={() => cancelTask(task.id)}
                          className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle size={11} /> Cancel
                        </button>
                      ) : (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            task.status === "completed" ? "text-emerald-400" : "text-zinc-500"
                          }`}
                        >
                          {task.status}
                        </span>
                      )}
                    </div>
                    {task.status === "running" && (
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mt-0.5">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checklist items */}
          <div className="space-y-3">
            <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase block">
              Intelligence Checklists
            </span>
            <div className="flex flex-col gap-3">
              {Object.entries(checklists).map(([category, items]) => (
                <div key={category} className="space-y-1.5">
                  <span className="text-[11px] font-bold text-zinc-400 block">{category}</span>
                  <div className="flex flex-col gap-1 border-l border-white/5 pl-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleChecklistItem(category, item.id)}
                        className="flex items-start gap-2 text-[11px] text-zinc-300 text-left cursor-pointer select-none"
                      >
                        <span className="mt-0.5 shrink-0">
                          {item.completed ? (
                            <CheckSquare size={12} className="text-indigo-400" />
                          ) : (
                            <Square size={12} className="text-zinc-600" />
                          )}
                        </span>
                        <span className={item.completed ? "line-through text-zinc-500" : ""}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Recommendations */}
          <div className="space-y-2">
            <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase block">
              Smart Recommendations
            </span>
            <div className="flex flex-col gap-2">
              {recommendations.slice(0, 3).map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => onSendPrompt(rec.linkPrompt)}
                  className="rounded-lg border border-white/5 hover:border-indigo-500/30 bg-white/[0.005] hover:bg-indigo-500/[0.015] p-2.5 flex flex-col items-start gap-1 transition-all text-left w-full cursor-pointer group"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-200">
                    <Compass size={11} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span>{rec.title}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 leading-normal">{rec.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Session summary */}
          {sessionSummary && (
            <div className="rounded-xl border border-white/5 bg-white/[0.005] p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                  Session Summary
                </span>
                <button
                  type="button"
                  onClick={handleExportSummary}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown size={12} /> Export
                </button>
              </div>
              <p className="text-xs text-zinc-300 leading-normal">{sessionSummary.summary}</p>
            </div>
          )}

          {/* Action timeline history */}
          <div className="space-y-2.5">
            <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase block">
              Agent Action History
            </span>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {actionHistory.map((act) => (
                <div key={act.id} className="flex gap-2.5 text-[11px] items-start">
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5 shrink-0">
                    {act.time}
                  </span>
                  <div className="leading-tight flex-1">
                    <span className="text-zinc-300 font-semibold">{act.action}</span>
                    <span className="text-[9px] text-zinc-500 block">
                      Duration: {act.duration} &middot; Status: {act.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Telemetry & SRE Health View */}
          {telemetry ? (
            <div className="space-y-4">
              {/* SRE Health Monitor */}
              <div className="rounded-xl border border-white/10 bg-white/[0.01] p-3 space-y-2.5">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Heart size={13} className="animate-pulse text-indigo-400" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">
                    System Health Monitor
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  {Object.entries(telemetry.health).map(([comp, status]) => (
                    <div key={comp} className="flex items-center gap-2 text-zinc-300">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        status === "healthy" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                      }`} />
                      <span className="capitalize">{comp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Metrics & latency */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase block">
                  AI Latency & Analytics
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-lg bg-zinc-900/40 border border-white/5 p-2.5 flex flex-col">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Avg Latency</span>
                    <span className="text-lg font-bold text-white mt-1">{telemetry.avgResponseTimeMs}ms</span>
                  </div>
                  <div className="rounded-lg bg-zinc-900/40 border border-white/5 p-2.5 flex flex-col">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Success Rate</span>
                    <span className="text-lg font-bold text-emerald-400 mt-1">{telemetry.aiSuccessRate}%</span>
                  </div>
                  <div className="rounded-lg bg-zinc-900/40 border border-white/5 p-2.5 flex flex-col">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Queries Logs</span>
                    <span className="text-lg font-bold text-white mt-1">{telemetry.totalQueries}</span>
                  </div>
                  <div className="rounded-lg bg-zinc-900/40 border border-white/5 p-2.5 flex flex-col">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Fallback Rate</span>
                    <span className="text-lg font-bold text-zinc-400 mt-1">{telemetry.aiFallbackRate}%</span>
                  </div>
                </div>
              </div>

              {/* Explainability Metadata */}
              <div className="rounded-xl border border-white/5 bg-white/[0.005] p-3 space-y-3">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Activity size={12} />
                  <span className="text-[10px] font-bold tracking-widest uppercase">
                    AI Execution Metadata
                  </span>
                </div>
                <div className="space-y-2 text-[11px] pt-1">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-zinc-500">Selected Agent</span>
                    <span className="text-zinc-200 font-semibold">{telemetry.lastMetadata.agent}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-zinc-500">Confidence Score</span>
                    <span className="text-indigo-400 font-bold">{(telemetry.lastMetadata.confidenceScore * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-zinc-500">Plan Steps</span>
                    <span className="text-zinc-200 font-semibold">{telemetry.lastMetadata.planStepsCount} steps</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-zinc-500">Latent Duration</span>
                    <span className="text-zinc-200 font-semibold">{telemetry.lastMetadata.durationMs}ms</span>
                  </div>
                  <div className="space-y-1 pt-1">
                    <span className="text-zinc-500 block">Orchestrated Tools:</span>
                    <div className="flex flex-wrap gap-1">
                      {telemetry.lastMetadata.tools.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded bg-zinc-850 border border-white/5 text-[9px] text-zinc-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-xs text-zinc-500">
              <Loader2 size={16} className="animate-spin text-indigo-500" />
              <span>Loading telemetry stats...</span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
