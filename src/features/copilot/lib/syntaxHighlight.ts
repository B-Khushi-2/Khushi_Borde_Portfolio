/**
 * MINIMAL SYNTAX HIGHLIGHTER
 * -----------------------------------------------------------------------
 * A small regex tokenizer covering the common cases (keywords, strings,
 * comments, numbers, function calls) for the languages a recruiter-facing
 * assistant is realistically going to show: JS/TS, Python, JSON, shell,
 * CSS, HTML, SQL, and a few C-family languages. Not a real parser — good
 * enough for readable code blocks without pulling in Prism/Shiki/hljs.
 * -----------------------------------------------------------------------
 */

export type TokenType =
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "function"
  | "type"
  | "property"
  | "plain";

export interface CodeToken {
  text: string;
  type: TokenType;
}

const KEYWORDS: Record<string, string[]> = {
  js: [
    "const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
    "switch", "case", "break", "continue", "class", "extends", "new", "this", "super",
    "import", "export", "default", "from", "as", "async", "await", "try", "catch",
    "finally", "throw", "typeof", "instanceof", "in", "of", "yield", "delete", "void",
    "null", "undefined", "true", "false", "static", "get", "set",
  ],
  ts: [
    "interface", "type", "enum", "implements", "namespace", "declare", "public",
    "private", "protected", "readonly", "abstract", "is", "keyof", "infer", "satisfies",
  ],
  python: [
    "def", "return", "if", "elif", "else", "for", "while", "break", "continue", "class",
    "import", "from", "as", "try", "except", "finally", "raise", "with", "lambda",
    "yield", "pass", "None", "True", "False", "and", "or", "not", "in", "is", "async",
    "await", "global", "nonlocal", "self", "assert", "del",
  ],
  bash: [
    "if", "then", "else", "elif", "fi", "for", "while", "do", "done", "case", "esac",
    "function", "return", "exit", "export", "local", "echo", "in", "break", "continue",
  ],
  sql: [
    "select", "from", "where", "insert", "into", "values", "update", "set", "delete",
    "create", "table", "alter", "drop", "join", "left", "right", "inner", "outer", "on",
    "group", "by", "order", "having", "limit", "as", "and", "or", "not", "null", "primary",
    "key", "foreign", "references", "index", "distinct", "union", "case", "when", "then",
    "end", "else",
  ],
  css: [
    "important", "media", "keyframes", "root", "supports", "import", "from", "to",
  ],
  go: [
    "func", "package", "import", "var", "const", "type", "struct", "interface", "return",
    "if", "else", "for", "range", "switch", "case", "break", "continue", "go", "defer",
    "chan", "map", "nil", "true", "false", "err",
  ],
  java: [
    "public", "private", "protected", "class", "interface", "extends", "implements",
    "static", "final", "void", "new", "return", "if", "else", "for", "while", "do",
    "switch", "case", "break", "continue", "try", "catch", "finally", "throw", "throws",
    "import", "package", "this", "super", "null", "true", "false",
  ],
};

const FAMILY_BY_LANG: Record<string, (keyof typeof KEYWORDS)[]> = {
  javascript: ["js"], js: ["js"], jsx: ["js"],
  typescript: ["js", "ts"], ts: ["js", "ts"], tsx: ["js", "ts"],
  python: ["python"], py: ["python"],
  bash: ["bash"], sh: ["bash"], shell: ["bash"], zsh: ["bash"],
  sql: ["sql"],
  css: ["css"], scss: ["css"], less: ["css"],
  go: ["go"], golang: ["go"],
  java: ["java"],
  json: [],
  html: [], xml: [],
};

function keywordSetFor(lang: string): Set<string> {
  const families = FAMILY_BY_LANG[lang.toLowerCase()] ?? ["js"]; // reasonable default
  const words = families.flatMap((f) => KEYWORDS[f] ?? []);
  return new Set(words);
}

// One combined pattern, checked in priority order: comments before strings
// before numbers before identifiers, so e.g. a `#` inside a string isn't
// mistaken for a comment.
const TOKEN_PATTERN = new RegExp(
  [
    /\/\/[^\n]*/.source, // line comment (js/go/java/css-ish)
    /#[^\n]*/.source, // line comment (python/bash)
    /\/\*[\s\S]*?\*\//.source, // block comment
    /"""[\s\S]*?"""|'''[\s\S]*?'''/.source, // python triple-quoted strings
    /`(?:\\.|[^`\\])*`/.source, // template / backtick strings
    /"(?:\\.|[^"\\])*"/.source, // double-quoted strings
    /'(?:\\.|[^'\\])*'/.source, // single-quoted strings
    /\b0x[0-9a-fA-F]+\b|\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/.source, // numbers
    /[A-Za-z_$][A-Za-z0-9_$]*(?=\s*\()/.source, // function calls
    /[A-Za-z_$][A-Za-z0-9_$]*/.source, // identifiers/keywords
  ].join("|"),
  "g"
);

/** Tokenizes `code` for `lang` into typed spans for rendering. Falls back
 * to a single plain-text token if nothing matches (e.g. pure whitespace). */
export function highlightCode(code: string, lang: string): CodeToken[] {
  const keywords = keywordSetFor(lang);
  const tokens: CodeToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  TOKEN_PATTERN.lastIndex = 0;
  while ((match = TOKEN_PATTERN.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index), type: "plain" });
    }

    const text = match[0];
    let type: TokenType = "plain";

    if (text.startsWith("//") || text.startsWith("#") || text.startsWith("/*")) {
      type = "comment";
    } else if (/^["'`]/.test(text) || /^"""|^'''/.test(text)) {
      type = "string";
    } else if (/^(0x|\d)/.test(text)) {
      type = "number";
    } else if (keywords.has(text)) {
      type = "keyword";
    } else if (code[match.index + text.length] === "(") {
      type = "function";
    } else if (/^[A-Z]/.test(text) && text.length > 1) {
      type = "type";
    }

    tokens.push({ text, type });
    lastIndex = TOKEN_PATTERN.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex), type: "plain" });
  }

  return tokens.length > 0 ? tokens : [{ text: code, type: "plain" }];
}
