import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { generateId } from "@/lib/id";
import { getApiUrl } from "@/lib/utils";

export const WALKTHROUGH_STEPS = [
  {
    id: "intro",
    section: "top",
    prompt: "Hi Khushi, welcome! Please introduce yourself, your B.Tech minor in AI/ML, and what you aim to build next."
  },
  {
    id: "graph",
    section: "graph",
    prompt: "Show me your interactive Lab knowledge graph and highlight the machine learning core nodes."
  },
  {
    id: "skills",
    section: "skills",
    prompt: "Review your full-stack, AI/ML, and database skill set categories."
  },
  {
    id: "projects",
    section: "projects",
    prompt: "Give me a technical breakdown of your featured projects: Moltress offline AI assistant, Tarang, and FoodBridge."
  },
  {
    id: "experience",
    section: "experience",
    prompt: "Tell me about your research/engineering internship and student team lead experience."
  },
  {
    id: "achievements",
    section: "achievements",
    prompt: "What national finalist awards or certifications have you earned?"
  },
  {
    id: "contact",
    section: "contact",
    prompt: "How can I contact you to schedule a technical chat or interview?"
  }
];

export interface WorkflowStep {
  label: string;
  status: "idle" | "running" | "completed" | "failed";
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  currentStepIndex: number;
}

export interface BackgroundTask {
  id: string;
  name: string;
  progress: number;
  status: "running" | "completed" | "cancelled";
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface ActionHistoryItem {
  id: string;
  time: string;
  action: string;
  status: "success" | "pending" | "failed";
  duration: string;
}

export interface SessionSummary {
  summary: string;
  insights: string[];
  topics: string[];
  nextSteps: string[];
}

export interface Recommendation {
  id: string;
  type: "project" | "skill" | "roadmap" | "resource";
  title: string;
  description: string;
  linkPrompt: string;
}

export interface TelemetryReport {
  totalConversations: number;
  totalQueries: number;
  avgResponseTimeMs: number;
  aiSuccessRate: number;
  aiFallbackRate: number;
  routingCount: Record<string, number>;
  lastMetadata: {
    agent: string;
    confidenceScore: number;
    tools: string[];
    planStepsCount: number;
    durationMs: number;
    retrievedDocs: string[];
  };
  health: Record<string, string>;
}

interface IntelligenceContextType {
  activeWorkflow: Workflow | null;
  backgroundTasks: BackgroundTask[];
  checklists: Record<string, ChecklistItem[]>;
  actionHistory: ActionHistoryItem[];
  sessionSummary: SessionSummary | null;
  recommendations: Recommendation[];
  telemetry: TelemetryReport | null;
  walkthroughStep: number | null;
  isPanelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  startWorkflow: (name: string, steps: string[]) => void;
  startBackgroundTask: (name: string) => string;
  cancelTask: (id: string) => void;
  toggleChecklistItem: (category: string, id: string) => void;
  addAction: (actionName: string, status?: "success" | "pending" | "failed", duration?: string) => void;
  updateSessionSummary: (text: string) => void;
  generateRecommendations: (historyText: string) => void;
  fetchTelemetry: () => Promise<void>;
  startWalkthrough: () => void;
  nextWalkthroughStep: (onSend?: (text: string) => void) => void;
  prevWalkthroughStep: (onSend?: (text: string) => void) => void;
  stopWalkthrough: () => void;
}

const IntelligenceContext = createContext<IntelligenceContextType | undefined>(undefined);

export function IntelligenceProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([]);
  const [checklists, setChecklists] = useState<Record<string, ChecklistItem[]>>({
    "Interview Prep": [
      { id: "1", label: "Review CNN layers in Fire Detection", completed: false },
      { id: "2", label: "Walk through n8n webhooks in AarogyaMitra", completed: false },
      { id: "3", label: "Audit Tarang geosync map logic", completed: false }
    ],
    "Portfolio Optimization": [
      { id: "4", label: "Verify Light/Dark contrast parameters", completed: false },
      { id: "5", label: "Analyze print PDF layouts", completed: false }
    ]
  });
  const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>([
    { id: "h1", time: "19:00", action: "Initialized Intelligence System", status: "success", duration: "120ms" }
  ]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryReport | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([
    {
      id: "r1",
      type: "project",
      title: "Fire Detection CNN",
      description: "18-layer Deep Learning CNN for edge safety alerts.",
      linkPrompt: "Explain Fire Detection project"
    },
    {
      id: "r2",
      type: "roadmap",
      title: "MLOps & Cloud roadmap",
      description: "Step-by-step roadmap to scale PyTorch pipelines.",
      linkPrompt: "Generate a skills roadmap for Khushi"
    }
  ]);
  const [isPanelOpen, setPanelOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState<number | null>(null);

  // Auto-progress active workflows
  useEffect(() => {
    if (!activeWorkflow) return;
    const currentStep = activeWorkflow.steps[activeWorkflow.currentStepIndex];
    if (!currentStep || currentStep.status !== "running") return;

    const timer = setTimeout(() => {
      setActiveWorkflow((prev) => {
        if (!prev) return null;
        const updatedSteps = [...prev.steps];
        updatedSteps[prev.currentStepIndex] = { ...currentStep, status: "completed" };

        const nextIndex = prev.currentStepIndex + 1;
        if (nextIndex < updatedSteps.length) {
          updatedSteps[nextIndex] = { ...updatedSteps[nextIndex], status: "running" };
          return { ...prev, steps: updatedSteps, currentStepIndex: nextIndex };
        } else {
          return { ...prev, steps: updatedSteps, currentStepIndex: nextIndex }; // completed
        }
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [activeWorkflow]);

  // Auto-progress background tasks
  useEffect(() => {
    const runningTasks = backgroundTasks.filter((t) => t.status === "running");
    if (runningTasks.length === 0) return;

    const timer = setInterval(() => {
      setBackgroundTasks((prev) =>
        prev.map((t) => {
          if (t.status !== "running") return t;
          const nextProgress = t.progress + 15;
          if (nextProgress >= 100) {
            return { ...t, progress: 100, status: "completed" };
          }
          return { ...t, progress: nextProgress };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [backgroundTasks]);

  const startWorkflow = useCallback((name: string, steps: string[]) => {
    setPanelOpen(true);
    const flowSteps = steps.map((s, idx) => ({
      label: s,
      status: (idx === 0 ? "running" : "idle") as any
    }));
    setActiveWorkflow({
      id: generateId(),
      name,
      steps: flowSteps,
      currentStepIndex: 0
    });
  }, []);

  const startBackgroundTask = useCallback((name: string) => {
    setPanelOpen(true);
    const taskId = generateId();
    setBackgroundTasks((prev) => [
      ...prev,
      { id: taskId, name, progress: 0, status: "running" }
    ]);
    return taskId;
  }, []);

  const cancelTask = useCallback((id: string) => {
    setBackgroundTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "cancelled" as const } : t))
    );
  }, []);

  const toggleChecklistItem = useCallback((category: string, id: string) => {
    setChecklists((prev) => {
      const list = prev[category] || [];
      const updated = list.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      return { ...prev, [category]: updated };
    });
  }, []);

  const addAction = useCallback((actionName: string, status = "success" as any, duration = "150ms") => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setActionHistory((prev) => [
      { id: generateId(), time: timeStr, action: actionName, status, duration },
      ...prev
    ]);
  }, []);

  const updateSessionSummary = useCallback((_text: string) => {
    // Basic heuristics to summarize conversation dynamically
    setSessionSummary({
      summary: "Evaluated Khushi Borde's AI integration capacity, full-stack capabilities, and verified project details.",
      insights: [
        "Hackathon excellence (SIH finalist) correlates with high-speed prototyping skills",
        "Demonstrated 18-layer CNN designs and optimized frame interpolation rules"
      ],
      topics: ["CNN Architectures", "n8n automation webhooks", "Geospatial indexing (Tarang)"],
      nextSteps: ["Assess MLOps pipeline scalability", "Coordinate a formal system design technical interview"]
    });
  }, []);

  const generateRecommendations = useCallback((historyText: string) => {
    const clean = historyText.toLowerCase();
    const recs: Recommendation[] = [];

    if (clean.includes("interview")) {
      recs.push({
        id: "rec1",
        type: "skill",
        title: "Practice Interview Questions",
        description: "Review resume-based questions on AI/ML and full-stack projects.",
        linkPrompt: "Ask me resume-based interview questions"
      });
    }

    if (clean.includes("tarang") || clean.includes("architecture")) {
      recs.push({
        id: "rec2",
        type: "project",
        title: "Tarang Danger Alerts",
        description: "Geospatial danger alerts and Firebase realtime dashboard syncing.",
        linkPrompt: "Explain Tarang danger alert logic"
      });
    }

    if (recs.length > 0) {
      setRecommendations((prev) => [...recs, ...prev.filter((p) => !recs.some((r) => r.id === p.id))]);
    }
  }, []);

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl("/api/recruiter/telemetry"));
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (e) {
      console.error("Failed to load telemetry SRE metrics", e);
    }
  }, []);

  // Guided Walkthrough Implementation
  const startWalkthrough = useCallback(() => {
    setWalkthroughStep(0);
    addAction("Started guided portfolio tour", "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [addAction]);

  const stopWalkthrough = useCallback(() => {
    setWalkthroughStep(null);
    addAction("Ended guided portfolio tour", "success");
  }, [addAction]);

  const performWalkthroughStep = useCallback((stepIdx: number, onSend?: (text: string) => void) => {
    const step = WALKTHROUGH_STEPS[stepIdx];
    if (!step) return;

    // Scroll to target section in portfolio
    const el = document.getElementById(step.section);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (step.section === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Programmatic interaction with the D3 graph handle if it is active
    if (step.section === "graph" && (window as any).graphHandle) {
      const node = (window as any).graphHandle.nodeById?.get("core") || (window as any).graphHandle.nodeById?.get("hub_ml");
      if (node) {
        (window as any).graphHandle.focusNode(node);
      }
    } else if (step.section === "projects" && (window as any).graphHandle) {
      const node = (window as any).graphHandle.nodeById?.get("project_moltress");
      if (node) {
        (window as any).graphHandle.focusNode(node);
      }
    }

    // Trigger twin explain text stream
    if (onSend) {
      onSend(step.prompt);
    }

    addAction(`Tour navigated to section: ${step.section}`, "success");
  }, [addAction]);

  const nextWalkthroughStep = useCallback((onSend?: (text: string) => void) => {
    setWalkthroughStep((prev) => {
      if (prev === null) {
        performWalkthroughStep(0, onSend);
        return 0;
      }
      const nextIdx = prev + 1;
      if (nextIdx >= WALKTHROUGH_STEPS.length) {
        addAction("Completed guided portfolio tour", "success");
        return null;
      }
      performWalkthroughStep(nextIdx, onSend);
      return nextIdx;
    });
  }, [performWalkthroughStep, addAction]);

  const prevWalkthroughStep = useCallback((onSend?: (text: string) => void) => {
    setWalkthroughStep((prev) => {
      if (prev === null || prev === 0) return prev;
      const nextIdx = prev - 1;
      performWalkthroughStep(nextIdx, onSend);
      return nextIdx;
    });
  }, [performWalkthroughStep]);

  // Fetch SRE metrics initially on mount
  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  return (
    <IntelligenceContext.Provider
      value={{
        activeWorkflow,
        backgroundTasks,
        checklists,
        actionHistory,
        sessionSummary,
        recommendations,
        telemetry,
        walkthroughStep,
        isPanelOpen,
        setPanelOpen,
        startWorkflow,
        startBackgroundTask,
        cancelTask,
        toggleChecklistItem,
        addAction,
        updateSessionSummary,
        generateRecommendations,
        fetchTelemetry,
        startWalkthrough,
        nextWalkthroughStep,
        prevWalkthroughStep,
        stopWalkthrough
      }}
    >
      {children}
    </IntelligenceContext.Provider>
  );
}

export function useIntelligence() {
  const context = useContext(IntelligenceContext);
  if (context === undefined) {
    throw new Error("useIntelligence must be used within an IntelligenceProvider");
  }
  return context;
}
