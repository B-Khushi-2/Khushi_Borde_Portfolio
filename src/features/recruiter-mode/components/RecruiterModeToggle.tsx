import { Briefcase } from "lucide-react";
import { useRecruiterMode } from "@/features/recruiter-mode/context/RecruiterModeContext";

/** Sits inline in the site nav. Kept in plain legacy-site markup classes
 * (not the copilot's shadcn token scope) so it looks native to the nav
 * bar it lives in; the panel it opens switches into the scoped theme. */
export function RecruiterModeToggle() {
  const { isOpen, open } = useRecruiterMode();

  return (
    <button
      type="button"
      className="nav__cta"
      onClick={open}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
    >
      <Briefcase size={15} aria-hidden="true" />
      <span>Recruiter Mode</span>
    </button>
  );
}
