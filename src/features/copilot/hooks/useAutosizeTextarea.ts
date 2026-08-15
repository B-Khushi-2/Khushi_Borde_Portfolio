import { useCallback, useRef } from "react";

interface Options {
  /** Maximum height in pixels before the textarea starts scrolling instead of growing. */
  maxHeightPx: number;
}

/**
 * Grows a textarea to fit its content, up to `maxHeightPx`. Returns the ref
 * to attach to the textarea plus a `resize()` function to call after any
 * change that might affect content height (typing, programmatic clear, etc).
 */
export function useAutosizeTextarea({ maxHeightPx }: Options) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeightPx)}px`;
  }, [maxHeightPx]);

  return { textareaRef, resize };
}
