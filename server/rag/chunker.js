// ============================================================================
// STEP 2 of the RAG pipeline: "Chunking"
// ----------------------------------------------------------------------------
// Splits each Markdown knowledge file into retrieval-sized chunks.
//
// Strategy: chunk on Markdown structure first, character count second.
//   1. Walk the file line by line, tracking the current heading path
//      (e.g. "Projects > Moltress > Architecture"). Every heading starts
//      a new *section* — sections are the natural semantic unit here
//      (one project, one role, one achievement), so we never split a
//      sentence out of the middle of an unrelated topic.
//   2. If a section's body is still bigger than CHUNK_SIZE (a long
//      project write-up can be), it gets further split into overlapping
//      windows so no single chunk is too large for a good embedding, and
//      no fact sits exactly on a window boundary in every chunk.
//   3. Every chunk carries its heading breadcrumb *inside* its text
//      ("Section: Projects > Moltress > Architecture") — this means the
//      embedding itself encodes which project/topic the chunk belongs to,
//      which matters a lot once chunks are compared purely by vector
//      similarity with no surrounding context.
// ============================================================================

const DEFAULT_CHUNK_SIZE = 900; // characters, not tokens — simple and dependency-free
const DEFAULT_CHUNK_OVERLAP = 150;

/** Parses one markdown file into a list of {breadcrumb, body} sections,
 * splitting at every heading (any level, `#` through `######`). */
function splitIntoSections(markdown) {
  const lines = markdown.split("\n");
  const sections = [];
  let path = []; // stack of {level, text}
  let currentBody = [];

  function flush() {
    const body = currentBody.join("\n").trim();
    if (body) {
      sections.push({ breadcrumb: path.map((p) => p.text).join(" > "), body });
    }
    currentBody = [];
  }

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.*)$/.exec(line);
    if (match) {
      flush();
      const level = match[1].length;
      const text = match[2].trim();
      path = path.filter((p) => p.level < level);
      path.push({ level, text });
      continue;
    }
    currentBody.push(line);
  }
  flush();

  return sections;
}

/** Splits `text` into overlapping windows of at most `size` characters,
 * breaking on the nearest preceding blank line / sentence boundary where
 * possible so chunks don't cut off mid-sentence. */
function windowSplit(text, size, overlap) {
  if (text.length <= size) return [text];

  const windows = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);

    if (end < text.length) {
      const slice = text.slice(start, end);
      const lastBreak = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "));
      if (lastBreak > size * 0.5) {
        end = start + lastBreak + 1;
      }
    }

    windows.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return windows.filter(Boolean);
}

/**
 * @param {{ filename: string, content: string }} file
 * @param {{ chunkSize?: number, chunkOverlap?: number }} [opts]
 * @returns {{ id: string, source: string, breadcrumb: string, text: string }[]}
 */
function chunkFile(file, opts = {}) {
  const size = opts.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = opts.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  const sections = splitIntoSections(file.content);
  const chunks = [];

  sections.forEach((section, sectionIndex) => {
    const windows = windowSplit(section.body, size, overlap);
    windows.forEach((windowText, windowIndex) => {
      const header = section.breadcrumb ? `Section: ${section.breadcrumb}\n\n` : "";
      chunks.push({
        id: `${file.filename}#${sectionIndex}-${windowIndex}`,
        source: file.filename,
        breadcrumb: section.breadcrumb,
        text: `${header}${windowText}`.trim(),
      });
    });
  });

  return chunks;
}

/** @param {{ filename: string, content: string }[]} files */
function chunkFiles(files, opts = {}) {
  return files.flatMap((file) => chunkFile(file, opts));
}

module.exports = { chunkFile, chunkFiles, splitIntoSections, windowSplit };
