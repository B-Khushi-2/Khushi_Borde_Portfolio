import { Printer, Download, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActionsBar({
  githubUrl,
  linkedinUrl,
  email,
  onContactClick,
}: {
  githubUrl?: string;
  linkedinUrl?: string;
  email?: string;
  onContactClick: () => void;
}) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="print:hidden flex flex-wrap items-center gap-2 border-t border-[hsl(var(--border))] pt-4">
      <Button variant="default" onClick={handlePrint}>
        <Printer size={16} />
        Generate PDF
      </Button>
      <a href="/resume.pdf" download>
        <Button variant="outline">
          <Download size={16} />
          Download Resume
        </Button>
      </a>
      {githubUrl && (
        <a href={githubUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost">
            <ExternalLink size={16} />
            GitHub
          </Button>
        </a>
      )}
      {linkedinUrl && (
        <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost">
            <ExternalLink size={16} />
            LinkedIn
          </Button>
        </a>
      )}
      <Button variant="ghost" onClick={onContactClick}>
        <Mail size={16} />
        Contact
      </Button>
      {email && <span className="ml-auto text-xs text-[hsl(var(--muted-foreground))]">{email}</span>}
    </div>
  );
}
