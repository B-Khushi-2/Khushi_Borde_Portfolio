import { useState } from "react";
import {
  UserCheck,
  Cpu,
  TrendingUp,
  Search,
  HelpCircle,
  Plus,
  Settings,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  prompt: string;
  prefillOnly?: boolean;
}

interface SidebarGroup {
  name: string;
  items: SidebarItem[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    name: "Copilot Modes",
    items: [
      {
        id: "interview-mode",
        label: "Interview Mode",
        description: "Answer in 1st person as Khushi",
        icon: UserCheck,
        prompt: "Switch into interview mode: stay fully grounded in the retrieved context, but answer AS Khushi, in first person, the way she'd answer in a real interview. Start by inviting me to ask my first interview question.",
      },
    ],
  },
  {
    name: "Portfolio Deep-Dive",
    items: [
      {
        id: "project-architecture",
        label: "Projects & Architecture",
        description: "Moltress, Fire Detection & system flow",
        icon: Cpu,
        prompt: "Walk me through her key projects (Moltress, Fire Detection, AarogyaMitra, FoodBridge) and their technical architecture, main components, and key engineering decisions.",
      },
      {
        id: "skills-experience",
        label: "Skills & Career Overview",
        description: "Internships, hackathons & technical stack",
        icon: TrendingUp,
        prompt: "Provide a comprehensive breakdown of Khushi's AI/ML skills, internships (Infosys Springboard, Vishwakarma University), hackathon achievements (SIH Top 5), and future growth roadmap.",
      },
    ],
  },
  {
    name: "Search & Follow-Ups",
    items: [
      {
        id: "followup-questions",
        label: "Related & Follow-Up Questions",
        description: "Smart suggested questions for her background",
        icon: HelpCircle,
        prompt: "What are some highly relevant, non-obvious follow-up questions I could ask her based on her background and project experience?",
      },
      {
        id: "search-portfolio",
        label: "Search Portfolio",
        description: "Query skills, resume, or experience",
        icon: Search,
        prompt: "Search her background for: ",
        prefillOnly: true,
      },
    ],
  },
];

interface ChatSidebarProps {
  onSend: (text: string) => void;
  onPrefill: (text: string) => void;
  onClear: () => void;
}

export function ChatSidebar({ onSend, onPrefill, onClear }: ChatSidebarProps) {
  // Track open accordion sections (Copilot Modes & Deep-Dive expanded by default)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Copilot Modes": true,
    "Portfolio Deep-Dive": true,
    "Search & Follow-Ups": true,
  });

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-white/10 bg-black/40 select-none font-sans">
      {/* Profile Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5 bg-white/[0.01]">
        <img
          src="/assets/images/avatar-poster.jpg"
          alt="Khushi Borde"
          className="h-9 w-9 rounded-full object-cover ring-1 ring-indigo-500/40 shadow-[0_0_12px_rgba(79,70,229,0.4)]"
        />
        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-sm font-semibold text-white truncate">Khushi Borde</p>
          <p className="text-[10px] text-zinc-400 truncate">AI Portfolio Copilot</p>
        </div>
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </span>
      </div>

      {/* Primary Actions */}
      <div className="p-3">
        {/* New Chat Button */}
        <button
          type="button"
          onClick={onClear}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all duration-200 hover:from-indigo-500 hover:to-violet-500 active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          New Chat Session
        </button>
      </div>

      {/* Clean Accordion Tool Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-2 copilot-scroll">
        <div className="px-2 pb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Sparkles size={11} className="text-indigo-400" />
            Copilot Shortcuts
          </span>
          <span className="text-[8.5px] font-normal text-zinc-600">5 tools</span>
        </div>

        {SIDEBAR_GROUPS.map((group) => {
          const isOpen = !!openGroups[group.name];

          return (
            <div key={group.name} className="rounded-xl border border-white/[0.04] bg-white/[0.01] overflow-hidden transition-colors hover:border-white/[0.08]">
              {/* Accordion Group Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.name)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer select-none"
              >
                <span className="text-[11.5px]">{group.name}</span>
                {isOpen ? (
                  <ChevronDown size={13} className="text-zinc-400 transition-transform duration-200" />
                ) : (
                  <ChevronRight size={13} className="text-zinc-500 transition-transform duration-200" />
                )}
              </button>

              {/* Accordion Items Body */}
              {isOpen && (
                <div className="px-1.5 pb-2 pt-0.5 space-y-1 border-t border-white/[0.03]">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (item.prefillOnly) {
                            onPrefill(item.prompt);
                          } else {
                            onSend(item.prompt);
                          }
                        }}
                        className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-indigo-500/10 group focus-visible:outline-none cursor-pointer"
                      >
                        <span className="mt-0.5 text-indigo-400 group-hover:text-indigo-300 transition-transform group-hover:scale-110 shrink-0">
                          <ItemIcon size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11.5px] font-medium text-zinc-300 group-hover:text-white truncate">
                            {item.label}
                          </p>
                          <p className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-snug line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Settings Footer */}
      <div className="p-3 border-t border-white/5 bg-white/[0.005]">
        <button
          type="button"
          onClick={() => {
            onPrefill("Search portfolio for: ");
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-none cursor-pointer"
        >
          <Settings size={14} className="text-zinc-500" />
          Quick Search
        </button>
      </div>
    </div>
  );
}

