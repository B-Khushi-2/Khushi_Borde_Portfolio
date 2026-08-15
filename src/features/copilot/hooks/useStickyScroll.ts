import { useEffect, useRef } from "react";

interface Options {
  /** Distance in pixels from the bottom within which auto-scroll stays "stuck". */
  stickThresholdPx?: number;
}

/**
 * Keeps a scrollable element pinned to its bottom as `dependency` changes
 * (e.g. new chat messages arriving), unless the user has scrolled up to
 * read earlier content — the same pattern used by most chat UIs.
 */
export function useStickyScroll<T>(dependency: T, { stickThresholdPx = 80 }: Options = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isStuckToBottom = useRef(true);

  useEffect(() => {
    if (isStuckToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [dependency]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isStuckToBottom.current = distanceFromBottom < stickThresholdPx;
  }

  return { scrollRef, bottomRef, handleScroll };
}
