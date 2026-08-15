export interface ToolAction {
  id: string;
  category: string;
  label: string;
  /** Short helper text shown under the label in the menu. */
  description: string;
  /** The message actually sent to the chat when this action is picked. */
  prompt: string;
  /** If true, the prompt is dropped into the input box for the user to
   * finish typing instead of being sent immediately (used for the two
   * search actions, which need a search term). */
  prefillOnly?: boolean;
}

/**
 * "Advanced AI utilities" — all of these are just well-crafted prompts
 * routed through the existing RAG-grounded /api/chat/stream endpoint.
 * There's no separate backend per feature: retrieval, system-prompt
 * grounding, streaming, and conversation memory are all shared, so each
 * "tool" is really a shortcut for a specific way of asking the same
 * copilot a question.
 */
export const TOOL_ACTIONS: ToolAction[] = [
  {
    id: "project-generator",
    category: "Generators",
    label: "Project Generator",
    description: "Generate a new AI project concept & architecture tailored to her stack",
    prompt:
      "Act as an AI Systems Architect: generate an innovative new project concept and complete architecture blueprint tailored to Khushi's AI/ML, TensorFlow, RAG, and Full-Stack development skills.",
  },
  {
    id: "interview-mode",
    category: "Modes",
    label: "Interview mode",
    description: "Ask me questions as if I were her, based on her real background",
    prompt:
      "Switch into interview mode: stay fully grounded in the retrieved context, but answer AS Khushi, in first person, the way she'd answer in a real interview. Start by inviting me to ask my first interview question.",
  },
  {
    id: "project-comparison",
    category: "Analysis",
    label: "Compare projects",
    description: "Side-by-side comparison of her projects",
    prompt:
      "Compare her projects in a table: project name, tech stack, problem solved, and what makes it technically interesting. Only include projects that are actually in your knowledge base.",
  },
  {
    id: "architecture-generator",
    category: "Analysis",
    label: "Explain an architecture",
    description: "Break down how one of her projects is built",
    prompt:
      "Pick her most technically substantial project and walk me through its architecture: main components, how data/requests flow between them, and key design decisions — based only on what's in your knowledge base. Note plainly anything about the architecture that isn't documented rather than guessing at it.",
  },
  {
    id: "roadmap-generator",
    category: "Analysis",
    label: "Growth roadmap",
    description: "Where her skills could logically grow next",
    prompt:
      "Based on her current skills and project history, suggest a short, realistic roadmap for what she'd naturally grow into next. Clearly separate what's documented fact from what's your own reasonable inference about a logical next step.",
  },
  {
    id: "skill-search",
    category: "Search",
    label: "Search her skills",
    description: "e.g. \"Does she know React?\"",
    prompt: "Search her skills for: ",
    prefillOnly: true,
  },
  {
    id: "resume-search",
    category: "Search",
    label: "Search her resume",
    description: "e.g. \"internships\", \"2023\"",
    prompt: "Search her resume for anything related to: ",
    prefillOnly: true,
  },
  {
    id: "code-explainer",
    category: "Explain",
    label: "Explain the code",
    description: "Plain-English walkthrough of how a project works",
    prompt:
      "Explain how her most code-heavy project actually works, in plain English for a non-engineer recruiter — what it does, the rough approach, and why it wasn't trivial to build.",
  },
  {
    id: "project-explainer",
    category: "Explain",
    label: "Explain a project",
    description: "What problem it solves and why it matters",
    prompt:
      "Pick one of her strongest projects and explain: the problem it solves, who it's for, and the impact/result, in a way a hiring manager could repeat in a meeting.",
  },
];
