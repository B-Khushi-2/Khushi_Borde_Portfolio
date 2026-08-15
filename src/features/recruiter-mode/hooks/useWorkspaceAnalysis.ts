import { useEffect, useState } from "react";
import { getPortfolioData } from "@/lib/portfolioBridge";
import { getApiUrl } from "@/lib/utils";

export interface WorkspaceAnalysis {
  overview: {
    name: string;
    role: string;
    education: string;
    location: string;
    availability: string;
    experience: string;
    projects: string;
    achievements: string;
    skills: string;
    certifications: string;
  };
  aiAnalysis: {
    executiveSummary: string;
    hiringRecommendation: string;
    strengths: string[];
    risks: string[];
    bestFitRoles: string[];
    careerGrowth: string;
    engineeringMaturity: number;
    aiReadiness: number;
    leadershipPotential: number;
    communication: number;
  };
  skillsAnalysis: {
    frontend: number;
    backend: number;
    aiml: number;
    cloud: number;
    database: number;
    devops: number;
    problemSolving: number;
    systemDesign: number;
  };
  projectInsights: Array<{
    name: string;
    complexity: string;
    architecture: string;
    scalability: string;
    innovation: string;
    businessImpact: string;
    technicalDepth: string;
  }>;
  interviewReadiness: {
    strongAreas: string[];
    weakAreas: string[];
    questions: string[];
    preparationSuggestions: string[];
  };
  atsAnalysis: {
    compatibilityScore: number;
    keywordCoverage: number;
    missingKeywords: string[];
    optimizationSuggestions: string[];
  };
}

// Global simple cache to avoid unnecessary calls during hot-reloads
let cachedAnalysis: WorkspaceAnalysis | null = null;

export function useWorkspaceAnalysis(isOpen: boolean) {
  const [analysis, setAnalysis] = useState<WorkspaceAnalysis | null>(cachedAnalysis);
  const [loading, setLoading] = useState(!cachedAnalysis);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || cachedAnalysis) {
      if (cachedAnalysis) {
        setAnalysis(cachedAnalysis);
        setLoading(false);
      }
      return;
    }

    let active = true;

    async function runAnalysis() {
      setLoading(true);
      setError(null);
      try {
        const portfolio = getPortfolioData() as any;
        const digest = portfolio
          ? `CANDIDATE: ${portfolio.profile.name}\nSKILLS: ${portfolio.nodes.skills.map((s: any) => s.label).join(", ")}`
          : "";

        const res = await fetch(getApiUrl("/api/recruiter/workspace"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ portfolioDigest: digest })
        });

        if (!res.ok) {
          throw new Error(`Workspace analysis query failed (${res.status}).`);
        }

        const data = await res.json() as WorkspaceAnalysis;
        if (active) {
          cachedAnalysis = data;
          setAnalysis(data);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError((err as Error).message || "Failed to load intelligence workspace workspace analysis.");
          setLoading(false);
        }
      }
    }

    runAnalysis();

    return () => {
      active = false;
    };
  }, [isOpen]);

  return { analysis, loading, error };
}
