import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportStatus } from "@/features/recruiter-mode/types";

export function ReportControls({
  jobDescription,
  onJobDescriptionChange,
  onGenerate,
  status,
  error,
}: {
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
  onGenerate: () => void;
  status: ReportStatus;
  error: string | null;
}) {
  const isLoading = status === "loading";

  return (
    <section className="rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
      <label htmlFor="recruiter-jd" className="mb-2 block text-sm font-semibold text-[hsl(var(--foreground))]">
        Job description <span className="font-normal text-[hsl(var(--muted-foreground))]">(optional — tailors the report)</span>
      </label>
      <textarea
        id="recruiter-jd"
        name="jobDescription"
        value={jobDescription}
        onChange={(e) => onJobDescriptionChange(e.target.value)}
        placeholder="Paste the role's requirements here to get a role-specific suitability score and hiring report…"
        rows={4}
        className="mb-3 w-full resize-y rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-3 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onGenerate} disabled={isLoading} className="print:hidden">
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {isLoading ? "Generating hiring report…" : "Generate Hiring Report"}
        </Button>
        {error && (
          <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--destructive))]">
            <AlertTriangle size={13} /> {error}
          </span>
        )}
      </div>
    </section>
  );
}
