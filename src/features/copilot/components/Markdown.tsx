import { Fragment, memo, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { parseMarkdown, type InlineToken, type MarkdownBlock } from "@/features/copilot/lib/markdown";
import { highlightCode, type TokenType } from "@/features/copilot/lib/syntaxHighlight";
import { cn } from "@/lib/utils";

const InlineNodes = memo(function InlineNodes({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((token, i) => {
        switch (token.type) {
          case "bold":
            return <strong key={i} className="font-semibold">{token.value}</strong>;
          case "italic":
            return <em key={i}>{token.value}</em>;
          case "code":
            return (
              <code
                key={i}
                className="rounded bg-[hsl(var(--secondary))] px-1.5 py-0.5 font-mono text-[0.85em] text-[hsl(var(--accent))]"
              >
                {token.value}
              </code>
            );
          case "link":
            return (
              <a
                key={i}
                href={token.href}
                target="_blank"
                rel="noreferrer"
                className="text-[hsl(var(--primary))] underline decoration-[hsl(var(--primary)/0.4)] underline-offset-2 hover:decoration-[hsl(var(--primary))]"
              >
                {token.label}
              </a>
            );
          default:
            return <Fragment key={i}>{token.value}</Fragment>;
        }
      })}
    </>
  );
});

const HEADING_CLASSES: Record<1 | 2 | 3 | 4, string> = {
  1: "text-[1.12rem] font-bold text-zinc-100 mt-2 mb-1 tracking-tight leading-snug",
  2: "text-[1.05rem] font-bold text-zinc-100 mt-2 mb-1 tracking-tight leading-snug",
  3: "text-[0.98rem] font-semibold text-zinc-200 mt-1.5 mb-0.5 tracking-wide leading-relaxed",
  4: "text-[0.92rem] font-semibold text-zinc-300 mt-1 mb-0.5 tracking-wide leading-relaxed",
};

const TOKEN_CLASSES: Record<TokenType, string> = {
  keyword: "text-indigo-400 font-semibold",
  string: "text-emerald-400",
  comment: "italic text-zinc-500",
  number: "text-amber-400",
  function: "text-sky-400",
  type: "text-violet-400",
  property: "text-teal-400",
  plain: "text-zinc-100",
};

/** Fenced code block: language label, per-token syntax highlighting, and
 * a hover-revealed copy button — the same shape as ChatGPT's code cards. */
const CodeBlock = memo(function CodeBlock({ lang, content }: { lang: string; content: string }) {
  const [copied, setCopied] = useState(false);
  const tokens = useMemo(() => highlightCode(content, lang || "text"), [content, lang]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied or unavailable — no destructive fallback needed.
    }
  }

  return (
    <div className="group/code overflow-hidden rounded-xl border border-white/5 shadow-lg bg-black/45 my-2">
      <div className="flex items-center justify-between bg-white/[0.02] border-b border-white/5 px-4 py-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          {lang || "text"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-medium text-zinc-400 opacity-0 outline-none transition-all duration-150 hover:bg-white/[0.05] hover:text-white focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-indigo-500 group-hover/code:opacity-100 active:scale-90 cursor-pointer"
          aria-label="Copy code"
        >
          {copied ? <Check size={11} className="text-[emerald-400]" /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto bg-[#07090e]/60 p-4 font-mono text-[12.5px] leading-relaxed text-zinc-300">
        <code>
          {tokens.map((token, i) => (
            <span key={i} className={TOKEN_CLASSES[token.type]}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
});

function alignClass(align: "left" | "center" | "right" | null): string {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

const TableBlock = memo(function TableBlock({ block }: { block: Extract<MarkdownBlock, { type: "table" }> }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 shadow-md bg-white/[0.01] my-2 select-none">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="bg-white/[0.02] border-b border-white/10">
            {block.header.map((cell, i) => (
              <th
                key={i}
                className={cn(
                  "px-4 py-3 font-semibold text-zinc-200 text-[11px] uppercase tracking-wider",
                  alignClass(block.align[i])
                )}
              >
                <InlineNodes tokens={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r} className="border-b border-white/5 odd:bg-transparent even:bg-white/[0.008] transition-colors hover:bg-white/[0.015]">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={cn(
                    "px-4 py-2.5 align-top text-zinc-300",
                    alignClass(block.align[c])
                  )}
                >
                  <InlineNodes tokens={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

/** Renders assistant reply content as markdown — bold/italic, inline &
 * fenced (syntax-highlighted, copyable) code, links, headings, quotes,
 * tables, and ordered/unordered lists. */
export const Markdown = memo(function Markdown({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className="flex flex-col gap-2.5 text-[13.5px] leading-relaxed text-zinc-200">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading": {
            const Tag = (`h${block.level}` as unknown) as "h1" | "h2" | "h3" | "h4";
            return (
              <Tag key={i} className={HEADING_CLASSES[block.level]}>
                <InlineNodes tokens={block.tokens} />
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={i} className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">
                <InlineNodes tokens={block.tokens} />
              </p>
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="border-l-2 border-indigo-500 pl-4 py-1 italic bg-white/[0.01] rounded-r-md text-zinc-400 text-[13px] my-1"
              >
                <InlineNodes tokens={block.tokens} />
              </blockquote>
            );
          case "code":
            return <CodeBlock key={i} lang={block.lang} content={block.content} />;
          case "table":
            return <TableBlock key={i} block={block} />;
          case "list": {
            const ListTag = block.ordered ? "ol" : "ul";
            return (
              <ListTag
                key={i}
                className={cn(
                  "space-y-1.5 pl-6 text-[13.5px] text-zinc-300 leading-relaxed my-1",
                  block.ordered ? "list-decimal" : "list-disc marker:text-indigo-400"
                )}
              >
                {block.items.map((item, j) => (
                  <li key={j} className="pl-0.5">
                    <InlineNodes tokens={item} />
                  </li>
                ))}
              </ListTag>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
});
