import type { ChatMessage } from "@/features/copilot/types";

export const WELCOME_MESSAGE: Readonly<Omit<ChatMessage, "id" | "createdAt">> = {
  role: "assistant",
  content:
    "Hi, I'm the AI Recruiter Copilot for this portfolio. Ask me about Khushi's experience, skills, or projects — I'll pull straight from the résumé.",
  status: "complete",
};

/** Floor on how long the "thinking" dots stay visible once a reply starts
 * streaming, so a very fast first token doesn't flash the indicator. */
export const MIN_THINKING_MS = 350;

/** How long the panel shows its boot skeleton before rendering messages. */
export const PANEL_BOOT_DELAY_MS = 450;
