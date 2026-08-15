import type { StructuredEvaluation } from "@/features/recruiter-mode/types";

export type MessageRole = "user" | "assistant";

export type MessageStatus = "complete" | "streaming" | "thinking" | "error";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  createdAt: number;
  /** Set when `status === "error"` — the human-readable reason the reply failed. */
  error?: string;
  activeAgents?: string[];
  executionPlan?: string[];
  followUps?: string[];
  provider?: string;
  detectedRoute?: string;
  topicTags?: string[];
  ragMetrics?: Array<{ label: string; cosineScore: number; rerankScore: number }>;
  toolCalls?: Array<{ name: string; args: any; result: any }>;
  structuredEval?: StructuredEvaluation;
}

export type PanelMode = "closed" | "open" | "minimized" | "fullscreen";

export interface SuggestedPrompt {
  id: string;
  label: string;
  prompt: string;
}
