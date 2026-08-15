import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface RecruiterModeContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const RecruiterModeContext = createContext<RecruiterModeContextValue | null>(null);

export function RecruiterModeProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);

  return <RecruiterModeContext.Provider value={value}>{children}</RecruiterModeContext.Provider>;
}

export function useRecruiterMode(): RecruiterModeContextValue {
  const ctx = useContext(RecruiterModeContext);
  if (!ctx) throw new Error("useRecruiterMode must be used within a RecruiterModeProvider");
  return ctx;
}
