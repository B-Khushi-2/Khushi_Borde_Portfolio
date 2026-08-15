import type { SuggestedPrompt } from "@/features/copilot/types";

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { id: "p1", label: "🎙️ Interview Mode", prompt: "Switch into interview mode: stay fully grounded in her real background, but answer AS Khushi, in first person. Invite me to ask my first interview question!" },
  { id: "p2", label: "⚡ Project Generator", prompt: "Act as an AI Systems Architect: generate an innovative new project concept and complete architecture blueprint tailored to Khushi's AI/ML & Full-Stack stack." },
  { id: "p3", label: "📊 Compare Projects", prompt: "Compare her projects in a table: project name, tech stack, problem solved, and technical highlights based on your knowledge base." },
  { id: "p4", label: "Top Technical Skills", prompt: "What are her top technical skills and AI/ML frameworks?" },
  { id: "p5", label: "Notable Projects", prompt: "Tell me about her most notable projects." },
];
