/**
 * MINIMAL MARKDOWN PARSER
 * -----------------------------------------------------------------------
 * Deliberately dependency-free (no react-markdown/remark) — the assistant
 * replies in this demo are short, so a small hand-rolled parser covering
 * headings, bold/italic, inline code, fenced code blocks, links, block
 * quotes, GFM tables, and ordered/unordered lists is enough, and keeps
 * the bundle and the component tree simple. Swap for `react-markdown` if
 * reply content ever needs full CommonMark coverage (nested lists, etc).
 * -----------------------------------------------------------------------
 */

export type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; label: string; href: string };

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4; tokens: InlineToken[] }
  | { type: "paragraph"; tokens: InlineToken[] }
  | { type: "quote"; tokens: InlineToken[] }
  | { type: "code"; lang: string; content: string }
  | { type: "list"; ordered: boolean; items: InlineToken[][] }
  | {
      type: "table";
      align: Array<"left" | "center" | "right" | null>;
      header: InlineToken[][];
      rows: InlineToken[][][];
    };

const INLINE_PATTERN =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(\[[^\]]+\]\([^)\s]+\))/g;

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    const token = match[0];
    if (token.startsWith("`")) {
      tokens.push({ type: "code", value: token.slice(1, -1) });
    } else if (token.startsWith("**") || token.startsWith("__")) {
      tokens.push({ type: "bold", value: token.slice(2, -2) });
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (linkMatch) {
        tokens.push({ type: "link", label: linkMatch[1], href: linkMatch[2] });
      } else {
        tokens.push({ type: "text", value: token });
      }
    } else {
      tokens.push({ type: "italic", value: token.slice(1, -1) });
    }

    lastIndex = INLINE_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}

const HEADING_RE = /^(#{1,4})\s+(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;
const UL_RE = /^\s*[-*]\s+(.*)$/;
const OL_RE = /^\s*\d+\.\s+(.*)$/;
const FENCE_RE = /^```(.*)$/;
const TABLE_ROW_RE = /^\s*\|?(.+\|.+)\|?\s*$/;
const TABLE_SEP_CELL_RE = /^:?-{3,}:?$/;

/** Splits a `| a | b |` row into trimmed cell strings, respecting `\|`
 * as an escaped, non-separator pipe. */
function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === "\\" && trimmed[i + 1] === "|") {
      current += "|";
      i++;
    } else if (char === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

/** True if `line` is a valid GFM header-separator row, e.g. `| --- | :--: |`. */
function isTableSeparatorRow(line: string): boolean {
  if (!TABLE_ROW_RE.test(line)) return false;
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => TABLE_SEP_CELL_RE.test(cell));
}

function tableCellAlign(sepCell: string): "left" | "center" | "right" | null {
  const left = sepCell.startsWith(":");
  const right = sepCell.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return null;
}

export function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    const fence = line.match(FENCE_RE);
    if (fence) {
      const lang = fence[1].trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !FENCE_RE.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: "code", lang, content: codeLines.join("\n") });
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3 | 4,
        tokens: parseInline(heading[2]),
      });
      i++;
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        quoteLines.push(lines[i].replace(QUOTE_RE, "$1"));
        i++;
      }
      blocks.push({ type: "quote", tokens: parseInline(quoteLines.join(" ")) });
      continue;
    }

    if (UL_RE.test(line)) {
      const items: InlineToken[][] = [];
      while (i < lines.length && UL_RE.test(lines[i])) {
        items.push(parseInline(lines[i].replace(UL_RE, "$1")));
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (OL_RE.test(line)) {
      const items: InlineToken[][] = [];
      while (i < lines.length && OL_RE.test(lines[i])) {
        items.push(parseInline(lines[i].replace(OL_RE, "$1")));
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    if (
      TABLE_ROW_RE.test(line) &&
      i + 1 < lines.length &&
      isTableSeparatorRow(lines[i + 1])
    ) {
      const headerCells = splitTableRow(line);
      const align = splitTableRow(lines[i + 1]).map(tableCellAlign);
      i += 2;

      const rows: InlineToken[][][] = [];
      while (i < lines.length && TABLE_ROW_RE.test(lines[i]) && lines[i].trim() !== "") {
        rows.push(splitTableRow(lines[i]).map(parseInline));
        i++;
      }

      blocks.push({
        type: "table",
        align,
        header: headerCells.map(parseInline),
        rows,
      });
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !FENCE_RE.test(lines[i]) &&
      !HEADING_RE.test(lines[i]) &&
      !QUOTE_RE.test(lines[i]) &&
      !UL_RE.test(lines[i]) &&
      !OL_RE.test(lines[i]) &&
      !(TABLE_ROW_RE.test(lines[i]) && i + 1 < lines.length && isTableSeparatorRow(lines[i + 1]))
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", tokens: parseInline(paraLines.join(" ")) });
  }

  return blocks;
}
