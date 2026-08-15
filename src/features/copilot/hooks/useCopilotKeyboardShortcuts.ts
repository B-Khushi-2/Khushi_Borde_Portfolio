import { useEffect } from "react";
import type { PanelMode } from "@/features/copilot/types";

interface Options {
  mode: PanelMode;
  onOpen: () => void;
  onClose: () => void;
  onToggleFullscreen: () => void;
  onMinimize: () => void;
  /** When true, this hook skips all handling entirely — used while voice
   * mode's fullscreen overlay is active, so it can own Escape (end call)
   * and other keys without the panel's shortcuts fighting it. */
  suspended?: boolean;
}

/**
 * Keyboard shortcuts:
 *  - Cmd/Ctrl + K   → open (or focus) the copilot
 *  - Esc            → close / exit fullscreen
 *  - Cmd/Ctrl + J    → toggle fullscreen
 *  - Cmd/Ctrl + M    → minimize
 */
export function useCopilotKeyboardShortcuts({
  mode,
  onOpen,
  onClose,
  onToggleFullscreen,
  onMinimize,
  suspended = false,
}: Options) {
  useEffect(() => {
    if (suspended) return;

    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
        return;
      }

      if (e.key === "Escape" && mode !== "closed") {
        e.preventDefault();
        onClose();
        return;
      }

      if (meta && e.key.toLowerCase() === "j" && mode !== "closed") {
        e.preventDefault();
        onToggleFullscreen();
        return;
      }

      if (meta && e.key.toLowerCase() === "m" && mode !== "closed") {
        e.preventDefault();
        onMinimize();
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, onOpen, onClose, onToggleFullscreen, onMinimize, suspended]);
}
