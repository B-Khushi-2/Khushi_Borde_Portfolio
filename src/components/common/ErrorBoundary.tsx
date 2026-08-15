import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered instead of children once an error is caught. Defaults to
   * rendering nothing, so a failing widget disappears quietly rather than
   * taking the rest of the page down with it. */
  fallback?: ReactNode;
  /** Optional hook for logging/reporting; receives the error and React's
   * component stack. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Generic, reusable error boundary. React only supports error boundaries as
 * class components, so this wraps that requirement once and is meant to be
 * reused anywhere a subtree should be allowed to fail without crashing the
 * rest of the app (e.g. an optional/experimental widget bolted onto a page
 * that otherwise works fine).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
