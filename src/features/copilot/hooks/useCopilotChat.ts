import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/features/copilot/types";
import {
  streamChatCompletion,
  ChatStreamError,
  type ChatHistoryMessage,
} from "@/features/copilot/lib/streamChat";
import {
  getOrCreateSessionId,
  renewSessionId,
  loadSession,
  saveSession,
  clearLocalSession,
} from "@/features/copilot/lib/chatSession";
import { WELCOME_MESSAGE, MIN_THINKING_MS } from "@/features/copilot/constants";
import { generateId } from "@/lib/id";

function createMessage(partial: Omit<ChatMessage, "id" | "createdAt">): ChatMessage {
  return { ...partial, id: generateId(), createdAt: Date.now() };
}

/** Returns a copy of `messages` with the message matching `id` patched by `patch`. */
function patchMessage(
  messages: ChatMessage[],
  id: string,
  patch: Partial<ChatMessage>
): ChatMessage[] {
  return messages.map((message) => (message.id === id ? { ...message, ...patch } : message));
}

/** Maps chat state to the {role, content} shape the backend expects,
 * dropping the local-only welcome message and any turns that errored out
 * (those never made it into the model's actual conversation). */
function toHistory(messages: ChatMessage[]): ChatHistoryMessage[] {
  return messages
    .filter((m) => m.status !== "error")
    .map((m) => ({ role: m.role, content: m.content }))
    .filter((m) => m.content.trim().length > 0);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fire-and-forget DELETE to invalidate the server-side session store entry.
 *  Failures are intentionally swallowed — a stale server session will just
 *  expire on its own TTL; there's no user-visible impact. */
async function deleteServerSession(sessionId: string): Promise<void> {
  try {
    await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
  } catch {
    // Network offline or server down — silently ignore.
  }
}

export function useCopilotChat() {
  // ── Session ID ──────────────────────────────────────────────────────────────
  // Initialise from localStorage on first render; stays stable across renders.
  const sessionIdRef = useRef<string>(getOrCreateSessionId());

  // ── Messages ────────────────────────────────────────────────────────────────
  // Try to restore a previous session; fall back to the welcome message.
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const restored = loadSession(sessionIdRef.current);
    if (restored && restored.length > 0) return restored;
    return [createMessage(WELCOME_MESSAGE)];
  });

  const [isBusy, setIsBusy] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Persist messages to localStorage after every state change ───────────────
  // We only persist once the last message has reached "complete" status so we
  // never store a mid-stream bubble.
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    // Persist as soon as the latest message is complete (or immediately if
    // all messages are already complete, e.g. after restore).
    if (lastMsg && lastMsg.status === "complete") {
      saveSession(sessionIdRef.current, messages);
    }
  }, [messages]);

  // ── Clear chat ──────────────────────────────────────────────────────────────
  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsBusy(false);

    // 1. Invalidate the current session on both client and server.
    const oldId = sessionIdRef.current;
    clearLocalSession(oldId);
    deleteServerSession(oldId); // fire-and-forget

    // 2. Start a brand-new session.
    sessionIdRef.current = renewSessionId();
    setMessages([createMessage(WELCOME_MESSAGE)]);
  }, []);

  // ── Core streaming routine ──────────────────────────────────────────────────
  // Used by both `sendMessage` and `regenerateMessage`.  `history` is passed
  // in explicitly (rather than read from state inside here) so it always
  // reflects the turn that was just added, even before React has re-rendered.
  //
  // In session-aware mode we only send the new user message (`singleUserTurn`)
  // and let the server reconstruct context from its store.  We still include
  // the full `history` array as a fallback for the legacy (non-session) path.
  const runAssistantReply = useCallback(
    (
      assistantId: string,
      history: ChatHistoryMessage[],
      _queryText: string,
      /** When true, send only the last user message and rely on the server session. */
      useSessionMode = true
    ) => {
      setIsBusy(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const startedAt = Date.now();
      let streamedAny = false;
      let buffer = "";

      // In session mode the client sends only the single new user turn.
      const messagesToSend = useSessionMode
        ? history.slice(-1) // just the latest user message
        : history;           // full history (fallback / legacy)

      (async () => {
        try {
          await streamChatCompletion({
            messages: messagesToSend,
            sessionId: useSessionMode ? sessionIdRef.current : undefined,
            signal: controller.signal,
            onDelta: (text) => {
              buffer += text;
              if (!streamedAny) {
                streamedAny = true;
                setMessages((prev) => patchMessage(prev, assistantId, { status: "streaming" }));
              }
              setMessages((prev) => patchMessage(prev, assistantId, { content: buffer }));
            },
            onRouteClassification: (route) => {
              setMessages((prev) => patchMessage(prev, assistantId, { detectedRoute: route }));
            },
            onTopicTags: (topics) => {
              setMessages((prev) => patchMessage(prev, assistantId, { topicTags: topics }));
            },
            onRagMetrics: (metrics) => {
              setMessages((prev) => patchMessage(prev, assistantId, { ragMetrics: metrics }));
            },
            onToolCall: (toolCall) => {
              setMessages((prev) => {
                const existing = prev.find((m) => m.id === assistantId)?.toolCalls || [];
                return patchMessage(prev, assistantId, { toolCalls: [...existing, toolCall] });
              });
            },
            onStructuredEval: (structuredEval) => {
              setMessages((prev) => patchMessage(prev, assistantId, { structuredEval }));
            },
            onAgentRouting: (agents) => {
              setMessages((prev) => patchMessage(prev, assistantId, { activeAgents: agents }));
            },
            onExecutionPlan: (plan) => {
              setMessages((prev) => patchMessage(prev, assistantId, { executionPlan: plan }));
            },
            onFollowUps: (suggestions) => {
              setMessages((prev) => patchMessage(prev, assistantId, { followUps: suggestions }));
            },
            onProvider: (provider) => {
              setMessages((prev) => patchMessage(prev, assistantId, { provider }));
            },
          });

          // Guarantee the "thinking" dots are visible for at least a beat
          // even on a very fast/local model, so the state change doesn't flicker.
          const elapsed = Date.now() - startedAt;
          if (elapsed < MIN_THINKING_MS) await sleep(MIN_THINKING_MS - elapsed);

          setMessages((prev) => patchMessage(prev, assistantId, { status: "complete" }));
        } catch (err) {
          console.error("Chat stream error:", err, (err as any)?.name, (err as any)?.message, (err as any)?.stack);

          if ((err as { name?: string })?.name === "AbortError") {
            // User hit Stop or controller aborted — keep whatever streamed in so far as the final answer.
            setMessages((prev) => patchMessage(prev, assistantId, { status: "complete" }));
          } else if (buffer.trim().length > 0) {
            // Content was successfully streamed into buffer — mark as complete
            setMessages((prev) => patchMessage(prev, assistantId, { status: "complete" }));
          } else if (err instanceof ChatStreamError && err.partial) {
            setMessages((prev) =>
              patchMessage(prev, assistantId, { status: "error", error: err.message })
            );
          } else {
            const message = err instanceof ChatStreamError ? err.message : "Something went wrong.";
            setMessages((prev) =>
              patchMessage(prev, assistantId, { status: "error", error: message })
            );
          }
        } finally {
          if (abortControllerRef.current === controller) abortControllerRef.current = null;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === assistantId && (m.status === "thinking" || m.status === "streaming")) {
                if (m.content && m.content.trim().length > 0) {
                  return { ...m, status: "complete" };
                } else {
                  return { ...m, status: "error", error: "The response was interrupted." };
                }
              }
              return m;
            })
          );
          setIsBusy(false);
        }
      })();
    },
    []
  );

  const sendMessage = useCallback(
    (text: string): string | null => {
      const trimmed = text.trim();
      if (!trimmed || isBusy) return null;

      const userMessage = createMessage({ role: "user", content: trimmed, status: "complete" });
      const assistantMessage = createMessage({ role: "assistant", content: "", status: "thinking" });
      const history = toHistory([...messages, userMessage]);

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      runAssistantReply(assistantMessage.id, history, trimmed, /* useSessionMode */ true);
      return assistantMessage.id;
    },
    [isBusy, messages, runAssistantReply]
  );

  /** Re-runs the reply for a given assistant message, reusing its id —
   * used for both "Regenerate" on a completed reply and "Retry" on a
   * failed one. Everything else in the thread is left untouched.
   * Regenerate always sends full history (it replaces an existing turn,
   * so the server session would be inconsistent). */
  const regenerateMessage = useCallback(
    (assistantId: string) => {
      if (isBusy) return;

      const index = messages.findIndex((m) => m.id === assistantId);
      if (index <= 0) return;
      const userMessage = messages[index - 1];
      if (userMessage.role !== "user") return;

      const history = toHistory(messages.slice(0, index));

      setMessages((prev) =>
        patchMessage(prev, assistantId, { content: "", status: "thinking", error: undefined })
      );
      // Use legacy (full-history) mode for regenerate — we can't rely on the
      // server session because it may already contain the old assistant reply.
      runAssistantReply(assistantId, history, userMessage.content, /* useSessionMode */ false);
    },
    [messages, isBusy, runAssistantReply]
  );

  const stopGenerating = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return { messages, isBusy, sendMessage, clearChat, stopGenerating, regenerateMessage };
}
