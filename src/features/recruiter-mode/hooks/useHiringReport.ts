import { useEffect, useMemo, useRef, useState } from "react";
import { getPortfolioData, type PortfolioData } from "@/lib/portfolioBridge";
import { buildDeterministicReport } from "@/features/recruiter-mode/lib/reportData";
import { generateHiringReport, HiringReportError } from "@/features/recruiter-mode/lib/generateHiringReport";
import { scoreAgainstJobDescription } from "@/features/recruiter-mode/lib/suitability";
import type { AiHiringReport, DeterministicReport, ReportStatus } from "@/features/recruiter-mode/types";

export function useHiringReport(isOpen: boolean) {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [aiReport, setAiReport] = useState<AiHiringReport | null>(null);
  const [status, setStatus] = useState<ReportStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Portfolio data is populated onto `window.PORTFOLIO` by the legacy
  // data.js script; poll briefly on open in case Recruiter Mode is
  // toggled before that script has finished loading.
  useEffect(() => {
    if (!isOpen) return;
    const existing = getPortfolioData();
    if (existing) {
      setPortfolio(existing);
      return;
    }
    const id = window.setInterval(() => {
      const data = getPortfolioData();
      if (data) {
        setPortfolio(data);
        window.clearInterval(id);
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [isOpen]);

  const deterministic: DeterministicReport | null = useMemo(() => {
    if (!portfolio) return null;
    return buildDeterministicReport(portfolio as PortfolioData & { edges: [string, string][] });
  }, [portfolio]);

  const jdSuitability = useMemo(() => {
    if (!deterministic || !jobDescription.trim()) return null;
    return scoreAgainstJobDescription(jobDescription, deterministic.skillGroups);
  }, [deterministic, jobDescription]);

  async function runGenerateReport() {
    if (!portfolio) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);
    try {
      const report = await generateHiringReport({
        portfolio: portfolio as PortfolioData & { profile: Record<string, unknown> },
        jobDescription,
        signal: controller.signal,
      });
      setAiReport(report);
      setStatus("success");
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      const message =
        err instanceof HiringReportError
          ? err.message
          : "Something went wrong generating the report. The deterministic sections below are still accurate.";
      setError(message);
      setStatus("error");
    }
  }

  function reset() {
    setAiReport(null);
    setStatus("idle");
    setError(null);
  }

  return {
    portfolio,
    deterministic,
    jobDescription,
    setJobDescription,
    jdSuitability,
    aiReport,
    status,
    error,
    generateReport: runGenerateReport,
    reset,
  };
}
