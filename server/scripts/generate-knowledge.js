// ============================================================================
// STEP 1 of the RAG pipeline: "Create Markdown knowledge"
// ----------------------------------------------------------------------------
// Reads the single source of truth for portfolio content — the same
// `PORTFOLIO` object the React graph/legacy site already renders from
// (public/legacy/data.js) — and derives a set of clean, topic-scoped
// Markdown files under server/data/knowledge/.
//
// Why generate Markdown instead of embedding data.js directly?
//   1. One canonical content source (data.js) means the copilot can never
//      drift out of sync with what the portfolio site itself displays —
//      update a project once, run this script, and both the UI and the
//      copilot see the change.
//   2. Markdown headings give the chunker natural, human-meaningful
//      section boundaries (a project, a role, an achievement) instead of
//      arbitrary character slices — that directly improves retrieval
//      quality and keeps citations legible.
//   3. Markdown is easy to read/diff/hand-edit if you ever want to add
//      commentary that isn't in the structured graph data at all.
//
// Run: node server/scripts/generate-knowledge.js
// (or: npm run kb:generate, from server/)
// ============================================================================

const fs = require("fs");
const path = require("path");

const PROFILE_TS_PATH = path.resolve(__dirname, "../../src/content/profile.ts");
const OUT_DIR = path.resolve(__dirname, "../data/knowledge");

/** Reads from single source of truth `src/content/profile.ts` */
function loadPortfolioData() {
  const source = fs.readFileSync(PROFILE_TS_PATH, "utf8");
  const jsSource = source
    .replace(/export\s+(interface|type)[\s\S]*?(?=\nexport|\/\/|\/\*|$)/g, "")
    .replace(/: [A-Z][A-Za-z0-9<>[\]|]*/g, "")
    .replace(/export\s+default\s+PORTFOLIO;?/g, "")
    .replace(/export\s+const\s+PORTFOLIO/g, "const PORTFOLIO");

  const load = new Function("window", `${jsSource}\nreturn PORTFOLIO;`);
  return load({});
}

function byId(list) {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

// ---- small formatting helpers ---------------------------------------------

function heading(level, text) {
  return `${"#".repeat(level)} ${text}\n`;
}

function bulletList(items) {
  if (!items || items.length === 0) return "";
  return items.map((i) => `- ${i}`).join("\n") + "\n";
}

function kv(label, value) {
  if (value === null || value === undefined || value === "") return "";
  return `**${label}:** ${value}\n\n`;
}

function skillLabelsFor(edges, skillsIndex, nodeId) {
  return edges
    .filter(([from]) => from === nodeId)
    .map(([, to]) => skillsIndex[to])
    .filter((s) => s && s.type === "skill")
    .map((s) => s.label);
}

// ---- section generators ----------------------------------------------------

function generateAbout(portfolio) {
  const p = portfolio.profile;
  let md = heading(1, "About") + "\n";
  md += heading(2, p.name);
  md += kv("Role", p.role);
  md += `${p.tagline}\n\n`;
  md += kv("Location", p.location);
  md += kv("Email", p.email);
  md += kv("Phone", p.phone);
  md += kv("GitHub", p.links?.github);
  md += kv("LinkedIn", p.links?.linkedin);

  md += heading(2, "Education");
  md += kv("Institution", p.education?.school);
  md += kv("Program", p.education?.degree);
  md += kv("Dates", p.education?.date);
  md += kv("Detail", p.education?.detail);

  md += heading(2, "Availability & Focus");
  md += kv("Availability", p.contact?.availability);
  md += kv("Typical response time", p.contact?.responseTime);
  if (p.contact?.focus?.length) {
    md += `**Current focus areas:**\n\n${bulletList(p.contact.focus)}\n`;
  }
  return md;
}

function generateSkills(portfolio) {
  const hubs = byId(portfolio.nodes.hubs);
  const skills = portfolio.nodes.skills;
  const groups = new Map();
  for (const s of skills) {
    const hubLabel = hubs[s.cluster]?.label || "Other";
    if (!groups.has(hubLabel)) groups.set(hubLabel, []);
    groups.get(hubLabel).push(s.label);
  }

  let md = heading(1, "Skills") + "\n";
  md +=
    "This is the full, current skill set — grouped the same way it's grouped on the portfolio's skills graph.\n\n";
  for (const [group, labels] of groups) {
    md += heading(2, group);
    md += bulletList(labels) + "\n";
  }
  return md;
}

function generateProjects(portfolio) {
  const skillsIndex = byId(portfolio.nodes.skills);
  const edges = portfolio.edges;

  let md = heading(1, "Projects") + "\n";
  for (const proj of portfolio.nodes.projects) {
    md += heading(2, proj.label);
    md += kv("Dates", proj.date);
    md += kv("Summary", proj.summary);
    md += `${proj.description}\n\n`;

    if (proj.tags?.length) md += kv("Tags", proj.tags.join(", "));

    const usedSkills = skillLabelsFor(edges, skillsIndex, proj.id);
    if (usedSkills.length) md += kv("Technologies used", usedSkills.join(", "));

    md += heading(3, "Problem");
    md += `${proj.problem || "Not documented."}\n\n`;

    md += heading(3, "Solution");
    md += `${proj.solution || "Not documented."}\n\n`;

    if (proj.architecture?.length) {
      md += heading(3, "Architecture");
      md += bulletList(proj.architecture) + "\n";
    }

    if (proj.impact?.length) {
      md += heading(3, "Impact");
      md += bulletList(proj.impact) + "\n";
    }

    if (proj.learned?.length) {
      md += heading(3, "What was learned");
      md += bulletList(proj.learned) + "\n";
    }

    if (proj.challenges?.length) {
      md += heading(3, "Challenges");
      md += bulletList(proj.challenges) + "\n";
    }

    if (proj.tradeoffs?.length) {
      md += heading(3, "Trade-offs");
      md += bulletList(proj.tradeoffs) + "\n";
    }

    md += kv("Deployment", proj.deploymentNote);
    md += kv("Repository", proj.github);
    md += kv("Link", proj.link && proj.link !== "#" ? proj.link : null);
    md += "\n";
  }
  return md;
}

function generateExperience(portfolio) {
  const skillsIndex = byId(portfolio.nodes.skills);
  const edges = portfolio.edges;

  let md = heading(1, "Experience") + "\n";
  for (const exp of portfolio.nodes.experience) {
    md += heading(2, `${exp.label} — ${exp.org}`);
    md += kv("Dates", exp.date);
    md += kv("Status", exp.status === "upcoming" ? "Upcoming (has not started yet)" : "Completed / ongoing");
    md += `${exp.description}\n\n`;
    md += kv("Mission", exp.mission);
    md += kv("Outcome", exp.outcome);
    md += kv("Impact", exp.impact);

    const skillsBuilt = skillLabelsFor(edges, skillsIndex, exp.id);
    if (skillsBuilt.length) md += kv("Skills involved", skillsBuilt.join(", "));
    md += "\n";
  }
  return md;
}

function generateAchievements(portfolio) {
  let md = heading(1, "Achievements") + "\n";
  for (const ach of portfolio.nodes.achievements) {
    md += heading(2, ach.label);
    md += kv("Date", ach.date);
    md += `${ach.description}\n\n`;
  }
  return md;
}

/** Hackathons/competitions are a cross-cutting subset of projects +
 * achievements rather than their own node type in the graph — this pulls
 * out anything that reads as a competitive/team event so "hackathons" is
 * answerable as its own topic instead of buried inside Projects/Achievements. */
function generateHackathons(portfolio) {
  const HACKATHON_RE = /(hackathon|smart india|\bsih\b|anveshan|national (round|finalist|finals)|competition)/i;

  const projectHits = portfolio.nodes.projects.filter(
    (p) => HACKATHON_RE.test(p.description) || HACKATHON_RE.test(p.label)
  );
  const achievementHits = portfolio.nodes.achievements.filter(
    (a) => HACKATHON_RE.test(a.description) || HACKATHON_RE.test(a.label)
  );

  let md = heading(1, "Hackathons & Competitions") + "\n";
  md += "Competitive events entered, including team role and result.\n\n";

  for (const p of projectHits) {
    md += heading(2, p.label);
    md += kv("Dates", p.date);
    md += `${p.description}\n\n`;
    if (p.impact?.length) md += bulletList(p.impact) + "\n";
  }

  for (const a of achievementHits) {
    md += heading(2, a.label);
    md += kv("Date", a.date);
    md += `${a.description}\n\n`;
  }

  return md;
}

/** Condensed, resume-style rendering of the same underlying facts — kept
 * separate from about/skills/experience/projects so a query like "walk me
 * through her resume" retrieves one coherent, chronological document
 * instead of scattered sections. */
function generateResume(portfolio) {
  const p = portfolio.profile;
  const skillsByHub = new Map();
  const hubs = byId(portfolio.nodes.hubs);
  for (const s of portfolio.nodes.skills) {
    const label = hubs[s.cluster]?.label || "Other";
    if (!skillsByHub.has(label)) skillsByHub.set(label, []);
    skillsByHub.get(label).push(s.label);
  }

  let md = heading(1, "Resume") + "\n";
  md += heading(2, p.name);
  md += kv("Contact", `${p.email} | ${p.phone} | ${p.links?.linkedin} | ${p.links?.github}`);

  md += heading(2, "Education");
  md += `${p.education?.school} — ${p.education?.degree} (${p.education?.date}), ${p.education?.detail}\n\n`;

  md += heading(2, "Skills");
  for (const [group, labels] of skillsByHub) {
    md += `**${group}:** ${labels.join(", ")}\n\n`;
  }

  md += heading(2, "Experience");
  for (const exp of portfolio.nodes.experience) {
    md += `**${exp.label} — ${exp.org}** (${exp.date})\n\n${exp.description}\n\n`;
  }

  md += heading(2, "Projects");
  for (const proj of portfolio.nodes.projects) {
    md += `**${proj.label}** (${proj.date}) — ${proj.summary}\n\n${proj.description}\n\n`;
  }

  md += heading(2, "Achievements");
  for (const ach of portfolio.nodes.achievements) {
    md += `- **${ach.label}** (${ach.date}) — ${ach.description}\n`;
  }
  md += "\n";

  return md;
}

// ---- entrypoint -------------------------------------------------------------

function main() {
  const portfolio = loadPortfolioData();

  const files = {
    "about.md": generateAbout(portfolio),
    "skills.md": generateSkills(portfolio),
    "projects.md": generateProjects(portfolio),
    "experience.md": generateExperience(portfolio),
    "achievements.md": generateAchievements(portfolio),
    "hackathons.md": generateHackathons(portfolio),
    "resume.md": generateResume(portfolio),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT_DIR, filename), content, "utf8");
  }

  console.log(`Wrote ${Object.keys(files).length} knowledge files to ${path.relative(process.cwd(), OUT_DIR)}/`);
  for (const filename of Object.keys(files)) console.log(`  - ${filename}`);
}

if (require.main === module) {
  main();
}

module.exports = { loadPortfolioData, main };
