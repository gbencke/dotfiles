/**
 * AST-grep extension for pi.
 *
 * Uses ast-grep for structural code analysis across all supported languages.
 * No language server needed — ast-grep runs as a subprocess per request.
 *
 * Tools exposed:
 *   lsp_diagnostics  – rule-based structural checks (requires sgconfig.yml or --rule file)
 *   lsp_hover        – symbol context at a position
 *   lsp_definition   – find definition of symbol at a position
 *   lsp_symbols      – all symbols declared in a file
 *   lsp_format       – not supported; returns formatter guidance per language
 *
 * Command exposed:
 *   /lsp-status      – show ast-grep version and supported languages
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { execFile, spawn, ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import * as nodePath from "node:path";
import * as nodeFs from "node:fs";

const execFileAsync = promisify(execFile);

// ── Language detection ───────────────────────────────────────────────────────

const LANG_FROM_EXT: Record<string, string> = {
  py: "python", pyw: "python",
  ts: "typescript", tsx: "tsx",
  js: "javascript", jsx: "jsx", mjs: "javascript", cjs: "javascript",
  rs: "rust",
  go: "go",
  c: "c", h: "c",
  cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", hxx: "cpp",
  lua: "lua",
  json: "json", jsonc: "json",
  html: "html", htm: "html",
  css: "css", scss: "css", less: "css",
};

function detectLanguage(filePath: string): string | null {
  const ext = nodePath.extname(filePath).slice(1).toLowerCase();
  return LANG_FROM_EXT[ext] ?? null;
}

// ── ast-grep types ────────────────────────────────────────────────────────────

interface AstGrepPos   { line: number; column: number; }
interface AstGrepRange { byteOffset?: { start: number; end: number }; start: AstGrepPos; end: AstGrepPos; }
interface AstGrepMetaVar { text: string; range: AstGrepRange; }

interface AstGrepMatch {
  text: string;
  range: AstGrepRange;
  file: string;
  lines: string;
  language: string;
  replacement?: string;
  metaVariables?: {
    single?: Record<string, AstGrepMetaVar>;
    multi?:  Record<string, AstGrepMetaVar[]>;
    transformed?: Record<string, string>;
  };
}

// ── Symbol patterns per language ──────────────────────────────────────────────

interface SymbolPattern {
  pattern: string;
  kind: string;
  nameVar: string; // key inside metaVariables.single that holds the symbol name
}

const SYMBOL_PATTERNS: Record<string, SymbolPattern[]> = {
  python: [
    { pattern: "class $NAME($$$): $$$",       kind: "Class",    nameVar: "NAME" },
    { pattern: "class $NAME: $$$",             kind: "Class",    nameVar: "NAME" },
    { pattern: "def $NAME($$$) -> $_: $$$",   kind: "Function", nameVar: "NAME" },
    { pattern: "def $NAME($$$): $$$",          kind: "Function", nameVar: "NAME" },
    { pattern: "$NAME: $_ = $_",               kind: "Variable", nameVar: "NAME" },
  ],
  typescript: [
    { pattern: "class $NAME { $$$}",                  kind: "Class",     nameVar: "NAME" },
    { pattern: "class $NAME extends $_ { $$$}",       kind: "Class",     nameVar: "NAME" },
    { pattern: "interface $NAME { $$$}",              kind: "Interface", nameVar: "NAME" },
    { pattern: "type $NAME = $$$",                    kind: "TypeAlias", nameVar: "NAME" },
    { pattern: "function $NAME($$$): $_ { $$$}",     kind: "Function",  nameVar: "NAME" },
    { pattern: "function $NAME($$$) { $$$}",         kind: "Function",  nameVar: "NAME" },
    { pattern: "const $NAME = ($$$): $_ => $$$",     kind: "Function",  nameVar: "NAME" },
    { pattern: "const $NAME = ($$$) => $$$",         kind: "Function",  nameVar: "NAME" },
    { pattern: "const $NAME: $_ = $_",               kind: "Variable",  nameVar: "NAME" },
    { pattern: "let $NAME: $_ = $_",                 kind: "Variable",  nameVar: "NAME" },
  ],
  tsx: [
    { pattern: "class $NAME { $$$}",                  kind: "Class",     nameVar: "NAME" },
    { pattern: "interface $NAME { $$$}",              kind: "Interface", nameVar: "NAME" },
    { pattern: "type $NAME = $$$",                    kind: "TypeAlias", nameVar: "NAME" },
    { pattern: "function $NAME($$$): $_ { $$$}",     kind: "Function",  nameVar: "NAME" },
    { pattern: "function $NAME($$$) { $$$}",         kind: "Function",  nameVar: "NAME" },
    { pattern: "const $NAME = ($$$) => $$$",         kind: "Function",  nameVar: "NAME" },
    { pattern: "const $NAME: $_ = $_",               kind: "Variable",  nameVar: "NAME" },
  ],
  javascript: [
    { pattern: "class $NAME { $$$}",                  kind: "Class",    nameVar: "NAME" },
    { pattern: "function $NAME($$$) { $$$}",         kind: "Function", nameVar: "NAME" },
    { pattern: "const $NAME = ($$$) => $$$",         kind: "Function", nameVar: "NAME" },
    { pattern: "const $NAME = $_",                   kind: "Variable", nameVar: "NAME" },
    { pattern: "let $NAME = $_",                     kind: "Variable", nameVar: "NAME" },
  ],
  jsx: [
    { pattern: "class $NAME { $$$}",                  kind: "Class",    nameVar: "NAME" },
    { pattern: "function $NAME($$$) { $$$}",         kind: "Function", nameVar: "NAME" },
    { pattern: "const $NAME = ($$$) => $$$",         kind: "Function", nameVar: "NAME" },
  ],
  rust: [
    { pattern: "struct $NAME { $$$}",                 kind: "Struct",   nameVar: "NAME" },
    { pattern: "enum $NAME { $$$}",                   kind: "Enum",     nameVar: "NAME" },
    { pattern: "trait $NAME { $$$}",                  kind: "Trait",    nameVar: "NAME" },
    { pattern: "impl $NAME { $$$}",                   kind: "Impl",     nameVar: "NAME" },
    { pattern: "fn $NAME($$$) -> $_ { $$$}",         kind: "Function", nameVar: "NAME" },
    { pattern: "fn $NAME($$$) { $$$}",               kind: "Function", nameVar: "NAME" },
    { pattern: "const $NAME: $_ = $_",               kind: "Constant", nameVar: "NAME" },
    { pattern: "let $NAME: $_ = $_",                 kind: "Variable", nameVar: "NAME" },
  ],
  go: [
    { pattern: "type $NAME struct { $$$}",            kind: "Struct",    nameVar: "NAME" },
    { pattern: "type $NAME interface { $$$}",         kind: "Interface", nameVar: "NAME" },
    { pattern: "func $NAME($$$) $_ { $$$}",          kind: "Function",  nameVar: "NAME" },
    { pattern: "func $NAME($$$) { $$$}",             kind: "Function",  nameVar: "NAME" },
    { pattern: "func ($_ $_) $NAME($$$) $_ { $$$}", kind: "Method",    nameVar: "NAME" },
    { pattern: "const $NAME = $_",                   kind: "Constant",  nameVar: "NAME" },
    { pattern: "var $NAME $_ = $_",                  kind: "Variable",  nameVar: "NAME" },
  ],
  c: [
    { pattern: "$_ $NAME($$$) { $$$}",               kind: "Function", nameVar: "NAME" },
    { pattern: "struct $NAME { $$$}",                kind: "Struct",   nameVar: "NAME" },
  ],
  cpp: [
    { pattern: "class $NAME { $$$}",                 kind: "Class",    nameVar: "NAME" },
    { pattern: "$_ $NAME($$$) { $$$}",              kind: "Function", nameVar: "NAME" },
    { pattern: "struct $NAME { $$$}",               kind: "Struct",   nameVar: "NAME" },
  ],
  lua: [
    { pattern: "function $NAME($$$) $$$end",         kind: "Function", nameVar: "NAME" },
    { pattern: "local function $NAME($$$) $$$end",   kind: "Function", nameVar: "NAME" },
    { pattern: "local $NAME = $_",                   kind: "Variable", nameVar: "NAME" },
  ],
};

// ── Definition search patterns ────────────────────────────────────────────────
// Returns patterns to search for where `name` is defined in a given language.

function defPatterns(lang: string, name: string): string[] {
  switch (lang) {
    case "python":
      return [
        `def ${name}($$$)`,
        `def ${name}($$$) -> $_`,
        `class ${name}`,
        `class ${name}($$$)`,
        `${name}: $_ = $_`,
        `${name} = $_`,
      ];
    case "typescript":
    case "tsx":
      return [
        `function ${name}($$$)`,
        `class ${name}`,
        `const ${name} = $$$`,
        `let ${name} = $$$`,
        `interface ${name}`,
        `type ${name} = $$$`,
      ];
    case "javascript":
    case "jsx":
      return [
        `function ${name}($$$)`,
        `class ${name}`,
        `const ${name} = $$$`,
        `let ${name} = $$$`,
      ];
    case "rust":
      return [
        `fn ${name}($$$)`,
        `struct ${name}`,
        `enum ${name}`,
        `trait ${name}`,
        `const ${name}: $_ = $_`,
      ];
    case "go":
      return [
        `func ${name}($$$)`,
        `type ${name} struct`,
        `type ${name} interface`,
        `var ${name} $_ = $_`,
      ];
    default:
      return [`${name}`];
  }
}

// ── TypeScript language server client ───────────────────────────────────────────

const LSP_SYMBOL_KINDS: Record<number, string> = {
  1: "File", 2: "Module", 3: "Namespace", 4: "Package", 5: "Class",
  6: "Method", 7: "Property", 8: "Field", 9: "Constructor", 10: "Enum",
  11: "Interface", 12: "Function", 13: "Variable", 14: "Constant",
  15: "String", 16: "Number", 17: "Boolean", 18: "Array", 19: "Object",
  20: "Key", 21: "Null", 22: "EnumMember", 23: "Struct", 24: "Event",
  25: "Operator", 26: "TypeParameter",
};

const LSP_SEVERITY: Record<number, string> = {
  1: "error", 2: "warning", 3: "info", 4: "hint",
};

class TsLspClient {
  private proc: ChildProcess;
  private seq = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private diagnosticsMap = new Map<string, any[]>();
  private diagWaiters = new Map<string, (diags: any[]) => void>();
  private readBuffer = Buffer.alloc(0);

  constructor(private rootPath: string) {
    this.proc = spawn("typescript-language-server", ["--stdio"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.proc.stdout!.on("data", (chunk: Buffer) => {
      this.readBuffer = Buffer.concat([this.readBuffer, chunk]);
      this.drainBuffer();
    });
    this.proc.stderr!.on("data", () => {});
  }

  private drainBuffer() {
    while (true) {
      const sep = this.readBuffer.indexOf("\r\n\r\n");
      if (sep === -1) break;
      const header = this.readBuffer.slice(0, sep).toString();
      const m = header.match(/Content-Length:\s*(\d+)/i);
      if (!m) break;
      const length = parseInt(m[1], 10);
      const bodyStart = sep + 4;
      if (this.readBuffer.length < bodyStart + length) break;
      const body = this.readBuffer.slice(bodyStart, bodyStart + length).toString();
      this.readBuffer = this.readBuffer.slice(bodyStart + length);
      try { this.handleMessage(JSON.parse(body)); } catch {}
    }
  }

  private handleMessage(msg: any) {
    if ("id" in msg && !("method" in msg)) {
      const p = this.pending.get(msg.id);
      if (p) {
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message ?? "LSP error"));
        else p.resolve(msg.result ?? null);
      }
      return;
    }
    if (msg.method === "textDocument/publishDiagnostics") {
      const uri: string = msg.params.uri;
      const diags: any[] = msg.params.diagnostics ?? [];
      this.diagnosticsMap.set(uri, diags);
      const waiter = this.diagWaiters.get(uri);
      if (waiter) { this.diagWaiters.delete(uri); waiter(diags); }
    }
  }

  private request(method: string, params: any): Promise<any> {
    const id = ++this.seq;
    const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    this.proc.stdin!.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`LSP request '${method}' timed out`));
      }, 15_000);
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject:  (e) => { clearTimeout(timer); reject(e); },
      });
    });
  }

  private notify(method: string, params: any) {
    const body = JSON.stringify({ jsonrpc: "2.0", method, params });
    this.proc.stdin!.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      processId: process.pid,
      rootUri: `file://${this.rootPath}`,
      capabilities: {
        textDocument: {
          hover:          { contentFormat: ["markdown", "plaintext"] },
          definition:     {},
          documentSymbol: { hierarchicalDocumentSymbolSupport: false },
          publishDiagnostics: {},
        },
        workspace: {},
      },
    });
    this.notify("initialized", {});
  }

  openFile(uri: string, text: string): void {
    this.notify("textDocument/didOpen", {
      textDocument: { uri, languageId: "typescript", version: 1, text },
    });
  }

  getDiagnostics(uri: string, timeoutMs = 6_000): Promise<any[]> {
    if (this.diagnosticsMap.has(uri)) return Promise.resolve(this.diagnosticsMap.get(uri)!);
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.diagWaiters.delete(uri); resolve([]); }, timeoutMs);
      this.diagWaiters.set(uri, (diags) => { clearTimeout(timer); resolve(diags); });
    });
  }

  async hover(uri: string, line: number, character: number): Promise<any> {
    return this.request("textDocument/hover", {
      textDocument: { uri }, position: { line, character },
    });
  }

  async definition(uri: string, line: number, character: number): Promise<any[]> {
    const result = await this.request("textDocument/definition", {
      textDocument: { uri }, position: { line, character },
    });
    if (!result) return [];
    return Array.isArray(result) ? result : [result];
  }

  async symbols(uri: string): Promise<any[]> {
    const result = await this.request("textDocument/documentSymbol", {
      textDocument: { uri },
    });
    return result ?? [];
  }

  async shutdown(): Promise<void> {
    try { await this.request("shutdown", {}); } catch {}
    try { this.notify("exit", {}); }  catch {}
    this.proc.kill();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Core helpers ──────────────────────────────────────────────────────────────

function parseAstGrepOutput(stdout: string): AstGrepMatch[] {
  const text = stdout.trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Fall back to NDJSON (--json=stream)
    return text.split("\n").flatMap(line => {
      try { return [JSON.parse(line.trim())]; } catch { return []; }
    });
  }
}

async function runAstGrep(lang: string, pattern: string, filePath: string): Promise<AstGrepMatch[]> {
  try {
    const { stdout } = await execFileAsync(
      "ast-grep",
      ["run", "--pattern", pattern, "--lang", lang, "--json", filePath],
      { maxBuffer: 10 * 1024 * 1024 }
    );
    return parseAstGrepOutput(stdout);
  } catch (e: any) {
    // ast-grep exits with code 1 when no matches are found
    if (e.stdout) {
      const parsed = parseAstGrepOutput(e.stdout);
      if (parsed.length) return parsed;
    }
    if (!e.stderr?.trim()) return [];
    throw new Error(`ast-grep: ${e.stderr}`);
  }
}

async function runAstGrepScan(targetPath: string, configPath: string): Promise<AstGrepMatch[]> {
  try {
    const { stdout } = await execFileAsync(
      "ast-grep",
      ["scan", "--config", configPath, "--json", targetPath],
      { maxBuffer: 10 * 1024 * 1024 }
    );
    return parseAstGrepOutput(stdout);
  } catch (e: any) {
    if (e.stdout) {
      const parsed = parseAstGrepOutput(e.stdout);
      if (parsed.length) return parsed;
    }
    if (!e.stderr?.trim()) return [];
    throw new Error(`ast-grep scan: ${e.stderr}`);
  }
}

async function runAstGrepRule(targetPath: string, rulePath: string): Promise<AstGrepMatch[]> {
  try {
    const { stdout } = await execFileAsync(
      "ast-grep",
      ["scan", "--rule", rulePath, "--json", targetPath],
      { maxBuffer: 10 * 1024 * 1024 }
    );
    return parseAstGrepOutput(stdout);
  } catch (e: any) {
    if (e.stdout) {
      const parsed = parseAstGrepOutput(e.stdout);
      if (parsed.length) return parsed;
    }
    if (!e.stderr?.trim()) return [];
    throw new Error(`ast-grep scan --rule: ${e.stderr}`);
  }
}

function findSgConfig(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    for (const name of ["sgconfig.yml", "sgconfig.yaml"]) {
      const candidate = nodePath.join(dir, name);
      if (nodeFs.existsSync(candidate)) return candidate;
    }
    const parent = nodePath.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

function extractWordAtPosition(content: string, line: number, col: number): string | null {
  const lines = content.split("\n");
  if (line < 0 || line >= lines.length) return null;
  const text = lines[line];
  if (col < 0 || col >= text.length) return null;
  let start = col;
  let end = col;
  while (start > 0 && /\w/.test(text[start - 1])) start--;
  while (end < text.length && /\w/.test(text[end])) end++;
  const word = text.slice(start, end);
  return word || null;
}

function readFile(filePath: string): string {
  return nodeFs.readFileSync(nodePath.resolve(filePath), "utf8");
}

// ── Formatters ────────────────────────────────────────────────────────────────

interface SymbolEntry { name: string; kind: string; line: number; }

function formatSymbolList(symbols: SymbolEntry[]): string {
  if (!symbols.length) return "No symbols found.";
  const lines = [`**Symbols** (${symbols.length}):\n`];
  for (const s of symbols) {
    lines.push(`- **${s.name}** *(${s.kind})* — line ${s.line}`);
  }
  return lines.join("\n");
}

function formatScanMatches(matches: AstGrepMatch[], cwd: string): string {
  if (!matches.length) return "✅ No structural issues found.";
  const lines = [`**Diagnostics** (${matches.length} issue${matches.length > 1 ? "s" : ""}):\n`];
  for (const m of matches) {
    const file = nodePath.relative(cwd, m.file);
    const line = m.range.start.line + 1;
    const col  = m.range.start.column + 1;
    lines.push(`- \`${file}\` (${line}:${col}): ${m.lines.trim()}`);
  }
  return lines.join("\n");
}

// ── Extension factory ─────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  function text(t: string) { return [{ type: "text" as const, text: t }]; }
  function err(t: string)  { return { content: text(t), details: undefined, isError: true  as const }; }
  function ok(t: string, details?: unknown) { return { content: text(t), details, isError: false as const }; }

  async function prepareFile(
    filePath: string,
    cwd: string
  ): Promise<{ resolved: string; language: string; content: string } | { error: string }> {
    const resolved = nodePath.isAbsolute(filePath) ? filePath : nodePath.join(cwd, filePath);
    if (!nodeFs.existsSync(resolved)) return { error: `File not found: ${resolved}` };
    const language = detectLanguage(resolved);
    if (!language) return { error: `No ast-grep support for: ${nodePath.extname(resolved) || "(no extension)"}` };
    const content = readFile(resolved);
    return { resolved, language, content };
  }

  // ── lsp_diagnostics ──────────────────────────────────────────────────────────

  pi.registerTool({
    name: "lsp_diagnostics",
    label: "AST Diagnostics",
    description:
      "Run ast-grep rule-based diagnostics on a file or directory. " +
      "Requires an sgconfig.yml (project-wide rules) or a --rule YAML file. " +
      "Supports all ast-grep languages.",
    promptSnippet: "lsp_diagnostics(file) – run ast-grep structural checks",
    parameters: Type.Object({
      file:    Type.String({ description: "Path to source file or directory." }),
      rule:    Type.Optional(Type.String({ description: "Path to a single ast-grep rule YAML file." })),
      wait_ms: Type.Optional(Type.Number({ description: "Unused — kept for API compatibility.", minimum: 500, maximum: 30_000 })),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const targetPath = nodePath.isAbsolute(params.file)
        ? params.file
        : nodePath.join(ctx.cwd, params.file);

      if (!nodeFs.existsSync(targetPath)) return err(`Path not found: ${targetPath}`);

      // TypeScript / TSX → use typescript-language-server
      const fileLang = detectLanguage(targetPath);
      if (fileLang === "typescript" || fileLang === "tsx") {
        const text = readFile(targetPath);
        const uri  = `file://${nodePath.resolve(targetPath)}`;
        const root = nodePath.dirname(nodePath.resolve(targetPath));
        const client = new TsLspClient(root);
        try {
          await client.initialize();
          const diagsPromise = client.getDiagnostics(uri);
          client.openFile(uri, text);
          const diags: any[] = await diagsPromise;
          if (!diags.length) return ok("✅ No diagnostics.");
          const lines = [`**Diagnostics** (${diags.length} issue${diags.length > 1 ? "s" : ""}):\n`];
          for (const d of [...diags].sort((a, b) => a.range.start.line - b.range.start.line)) {
            const sev  = LSP_SEVERITY[d.severity ?? 1] ?? "error";
            const line = d.range.start.line + 1;
            const col  = d.range.start.character + 1;
            const code = d.code ? ` TS${d.code}` : "";
            lines.push(`- [${sev}] line ${line}, col ${col}${code}: ${d.message}`);
          }
          return ok(lines.join("\n"), { count: diags.length });
        } catch (e: any) {
          return err(`TypeScript LSP error: ${e.message}`);
        } finally {
          await client.shutdown();
        }
      }

      // Single rule file takes precedence
      if (params.rule) {
        const rulePath = nodePath.isAbsolute(params.rule)
          ? params.rule
          : nodePath.join(ctx.cwd, params.rule);
        if (!nodeFs.existsSync(rulePath)) return err(`Rule file not found: ${rulePath}`);
        const matches = await runAstGrepRule(targetPath, rulePath)
          .catch(e => { throw new Error(`Diagnostics failed: ${e}`); });
        return ok(formatScanMatches(matches, ctx.cwd), { count: matches.length, rule: rulePath });
      }

      // Walk up from target to find sgconfig.yml
      const startDir = nodeFs.statSync(targetPath).isDirectory()
        ? targetPath
        : nodePath.dirname(targetPath);
      const configPath = findSgConfig(startDir);

      if (!configPath) {
        return ok(
          "✅ No diagnostics — no `sgconfig.yml` found.\n" +
          "Create one to define structural rules, or pass `rule` parameter with a YAML rule file."
        );
      }

      const matches = await runAstGrepScan(targetPath, configPath)
        .catch(e => { throw new Error(`Diagnostics failed: ${e}`); });
      return ok(formatScanMatches(matches, ctx.cwd), { count: matches.length, config: configPath });
    },
  });

  // ── lsp_hover ────────────────────────────────────────────────────────────────

  pi.registerTool({
    name: "lsp_hover",
    label: "AST Hover",
    description: "Show the definition context of the symbol at a given position using ast-grep.",
    promptSnippet: "lsp_hover(file, line, character) – get symbol context at position",
    parameters: Type.Object({
      file:      Type.String({ description: "Path to the source file." }),
      line:      Type.Number({ description: "1-based line number.", minimum: 1 }),
      character: Type.Number({ description: "1-based character offset.", minimum: 1 }),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const prep = await prepareFile(params.file, ctx.cwd);
      if ("error" in prep) return err(prep.error);
      const { resolved, language, content } = prep;

      // TypeScript / TSX → use typescript-language-server
      if (language === "typescript" || language === "tsx") {
        const uri  = `file://${resolved}`;
        const root = nodePath.dirname(resolved);
        const client = new TsLspClient(root);
        try {
          await client.initialize();
          client.openFile(uri, content);
          await delay(500);
          const result = await client.hover(uri, params.line - 1, params.character - 1);
          if (!result?.contents) return ok("No hover info at this position.");
          const c = result.contents;
          const text = typeof c === "string" ? c
            : Array.isArray(c) ? c.map((x: any) => typeof x === "string" ? x : x.value ?? "").join("\n")
            : c.value ?? "";
          return ok(text.trim() || "No hover info at this position.", result);
        } catch (e: any) {
          return err(`TypeScript LSP error: ${e.message}`);
        } finally {
          await client.shutdown();
        }
      }

      const word = extractWordAtPosition(content, params.line - 1, params.character - 1);
      if (!word) return ok("No identifier at this position.");

      for (const pattern of defPatterns(language, word)) {
        const results = await runAstGrep(language, pattern, resolved).catch(() => []);
        if (results.length) {
          const m = results[0];
          const line = m.range.start.line + 1;
          const preview = m.lines.split("\n")[0].trim();
          return ok(
            `**\`${word}\`** — line ${line}\n\n\`\`\`${language}\n${preview}\n\`\`\``,
            m
          );
        }
      }

      return ok(`No definition found for \`${word}\` in \`${params.file}\`.`);
    },
  });

  // ── lsp_definition ───────────────────────────────────────────────────────────

  pi.registerTool({
    name: "lsp_definition",
    label: "AST Definition",
    description: "Find where the symbol at a given position is defined using ast-grep.",
    promptSnippet: "lsp_definition(file, line, character) – find definition",
    parameters: Type.Object({
      file:      Type.String({ description: "Path to the source file." }),
      line:      Type.Number({ description: "1-based line number.", minimum: 1 }),
      character: Type.Number({ description: "1-based character offset.", minimum: 1 }),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const prep = await prepareFile(params.file, ctx.cwd);
      if ("error" in prep) return err(prep.error);
      const { resolved, language, content } = prep;

      // TypeScript / TSX → use typescript-language-server
      if (language === "typescript" || language === "tsx") {
        const uri  = `file://${resolved}`;
        const root = nodePath.dirname(resolved);
        const client = new TsLspClient(root);
        try {
          await client.initialize();
          client.openFile(uri, content);
          await delay(500);
          const locs: any[] = await client.definition(uri, params.line - 1, params.character - 1);
          if (!locs.length) return ok("No definition found at this position.");
          const lines = [`**Definition${locs.length > 1 ? "s" : ""}** (${locs.length}):\n`];
          for (const loc of locs) {
            const target = (loc.targetUri ?? loc.uri ?? "").replace("file://", "");
            const r = loc.targetRange ?? loc.range;
            const line = (r?.start?.line ?? 0) + 1;
            const col  = (r?.start?.character ?? 0) + 1;
            lines.push(`- \`${nodePath.relative(ctx.cwd, target)}\` line ${line}, col ${col}`);
          }
          return ok(lines.join("\n"), locs);
        } catch (e: any) {
          return err(`TypeScript LSP error: ${e.message}`);
        } finally {
          await client.shutdown();
        }
      }

      const word = extractWordAtPosition(content, params.line - 1, params.character - 1);
      if (!word) return ok("No identifier at this position.");

      const all: AstGrepMatch[] = [];
      const seen = new Set<string>();
      for (const pattern of defPatterns(language, word)) {
        const results = await runAstGrep(language, pattern, resolved).catch(() => []);
        for (const m of results) {
          const key = `${m.range.start.line}:${m.range.start.column}`;
          if (!seen.has(key)) { seen.add(key); all.push(m); }
        }
      }

      if (!all.length) return ok(`No definition found for \`${word}\` in \`${params.file}\`.`);

      const lines = [`**Definition${all.length > 1 ? "s" : ""}** for \`${word}\` (${all.length}):\n`];
      for (const m of all) {
        const file = nodePath.relative(ctx.cwd, m.file);
        const line = m.range.start.line + 1;
        const col  = m.range.start.column + 1;
        lines.push(`- \`${file}\` line ${line}, col ${col}`);
      }
      return ok(lines.join("\n"), all);
    },
  });

  // ── lsp_symbols ──────────────────────────────────────────────────────────────

  pi.registerTool({
    name: "lsp_symbols",
    label: "AST Symbols",
    description: "List all symbols (classes, functions, variables, etc.) declared in a source file using ast-grep.",
    promptSnippet: "lsp_symbols(file) – list all symbols in a file",
    parameters: Type.Object({
      file: Type.String({ description: "Path to the source file." }),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const prep = await prepareFile(params.file, ctx.cwd);
      if ("error" in prep) return err(prep.error);
      const { resolved, language, content } = prep;

      // TypeScript / TSX → use typescript-language-server
      if (language === "typescript" || language === "tsx") {
        const uri  = `file://${resolved}`;
        const root = nodePath.dirname(resolved);
        const client = new TsLspClient(root);
        try {
          await client.initialize();
          client.openFile(uri, content);
          await delay(500);
          const raw: any[] = await client.symbols(uri);
          if (!raw.length) return ok("No symbols found.");
          const symbols: SymbolEntry[] = raw.map((s: any) => ({
            name: s.name,
            kind: LSP_SYMBOL_KINDS[s.kind as number] ?? "Unknown",
            line: ((s.location?.range ?? s.range)?.start?.line ?? 0) + 1,
          }));
          symbols.sort((a, b) => a.line - b.line);
          return ok(formatSymbolList(symbols), symbols);
        } catch (e: any) {
          return err(`TypeScript LSP error: ${e.message}`);
        } finally {
          await client.shutdown();
        }
      }

      const patterns = SYMBOL_PATTERNS[language];
      if (!patterns?.length) {
        return ok(`Symbol extraction not configured for language: ${language}`);
      }

      const seen = new Set<string>();
      const symbols: SymbolEntry[] = [];

      for (const { pattern, kind, nameVar } of patterns) {
        const matches = await runAstGrep(language, pattern, resolved).catch(() => []);
        for (const m of matches) {
          const name = m.metaVariables?.single?.[nameVar]?.text ?? "(unknown)";
          const line = m.range.start.line + 1;
          const key  = `${name}:${line}`;
          if (!seen.has(key)) {
            seen.add(key);
            symbols.push({ name, kind, line });
          }
        }
      }

      symbols.sort((a, b) => a.line - b.line);
      return ok(formatSymbolList(symbols), symbols);
    },
  });

  // ── lsp_format ───────────────────────────────────────────────────────────────

  pi.registerTool({
    name: "lsp_format",
    label: "Format",
    description: "Formatting is not provided by ast-grep. Returns the recommended formatter for each language.",
    promptSnippet: "lsp_format(file) – get formatter guidance",
    parameters: Type.Object({
      file:          Type.String({ description: "Path to the source file." }),
      tab_size:      Type.Optional(Type.Number({ description: "Tab size (unused).", minimum: 1 })),
      insert_spaces: Type.Optional(Type.Boolean({ description: "Use spaces (unused)." })),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const prep = await prepareFile(params.file, ctx.cwd);
      if ("error" in prep) return err(prep.error);
      const { language } = prep;

      const formatters: Record<string, string> = {
        python:     "ruff format <file>  or  black <file>",
        typescript: "prettier --write <file>",
        tsx:        "prettier --write <file>",
        javascript: "prettier --write <file>",
        jsx:        "prettier --write <file>",
        rust:       "rustfmt <file>",
        go:         "gofmt -w <file>",
        json:       "prettier --write <file>",
        html:       "prettier --write <file>",
        css:        "prettier --write <file>",
        lua:        "stylua <file>",
      };

      const suggestion = formatters[language] ?? "a language-specific formatter";
      return ok(
        `ast-grep does not format code.\nFor **${language}**, use: \`${suggestion}\``
      );
    },
  });

  // ── /lsp-status command ───────────────────────────────────────────────────────

  pi.registerCommand("lsp-status", {
    description: "Show ast-grep version and supported languages",
    handler: async (_args, ctx) => {
      let version = "unknown";
      try {
        const { stdout } = await execFileAsync("ast-grep", ["--version"]);
        version = stdout.trim();
      } catch { /* ignore */ }

      const langMap = Object.entries(LANG_FROM_EXT)
        .reduce<Record<string, string[]>>((acc, [ext, lang]) => {
          (acc[lang] ??= []).push(`.${ext}`);
          return acc;
        }, {});

      const langLines = Object.entries(langMap)
        .map(([lang, exts]) => `  ${lang.padEnd(12)} ${exts.join(", ")}`)
        .join("\n");

      const msg = `${version}\n\nSupported languages:\n${langLines}`;

      if (ctx.hasUI) {
        pi.sendMessage(
          { customType: "lsp-status", content: msg, display: true, details: { version } },
          { triggerTurn: false }
        );
      } else {
        process.stdout.write(msg + "\n");
      }
    },
  });

  pi.registerMessageRenderer("lsp-status", (message, _opts, theme) => {
    const { Text } = require("@mariozechner/pi-tui");
    const lines = (message.content as string).split("\n").map((line, i) => {
      if (i === 0) return theme.bold(theme.fg("accent", line));
      if (line.startsWith("  ") && !line.startsWith("   ")) {
        const [lang, ...rest] = line.trim().split(/\s+/);
        return `  ${theme.fg("toolTitle", lang.padEnd(12))} ${theme.fg("muted", rest.join(" "))}`;
      }
      if (line === "Supported languages:") return theme.bold(line);
      return line;
    });
    return new Text(lines.join("\n"), 0, 0);
  });

  pi.registerCommand("lsp-diag", {
    description: "Run ast-grep structural diagnostics on a file",
    handler: async (args, ctx) => {
      if (args.length === 0) {
        const msg = "Usage: /lsp-diag <file>";
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.log(msg);
        return;
      }
      
      const targetPath = nodePath.isAbsolute(args[0]) ? args[0] : nodePath.join(ctx.cwd, args[0]);
      if (!nodeFs.existsSync(targetPath)) {
        const msg = `Path not found: ${targetPath}`;
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.error(msg);
        return;
      }
      
      try {
        const fileLang = detectLanguage(targetPath);
        if (fileLang === "typescript" || fileLang === "tsx") {
          const textContent = readFile(targetPath);
          const uri = `file://${nodePath.resolve(targetPath)}`;
          const root = nodePath.dirname(nodePath.resolve(targetPath));
          const client = new TsLspClient(root);
          
          await client.initialize();
          const diagsPromise = client.getDiagnostics(uri);
          client.openFile(uri, textContent);
          const diags: any[] = await diagsPromise;
          await client.shutdown();
          
          if (!diags.length) {
            const msg = "✅ No diagnostics.";
            if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
            else console.log(msg);
            return;
          }
          
          const lines = [`**Diagnostics** (${diags.length} issue${diags.length > 1 ? "s" : ""}):\n`];
          for (const d of [...diags].sort((a, b) => a.range.start.line - b.range.start.line)) {
            const sev  = LSP_SEVERITY[d.severity ?? 1] ?? "error";
            const line = d.range.start.line + 1;
            const col  = d.range.start.character + 1;
            const code = d.code ? ` TS${d.code}` : "";
            lines.push(`- [${sev}] line ${line}, col ${col}${code}: ${d.message}`);
          }
          const msg = lines.join("\n");
          if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
          else console.log(msg);
          return;
        }

        const startDir = nodeFs.statSync(targetPath).isDirectory() ? targetPath : nodePath.dirname(targetPath);
        const configPath = findSgConfig(startDir);
        
        if (!configPath) {
          const msg = "✅ No diagnostics — no `sgconfig.yml` found.";
          if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
          else console.log(msg);
          return;
        }
        
        const matches = await runAstGrepScan(targetPath, configPath);
        const msg = formatScanMatches(matches, ctx.cwd);
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.log(msg);
      } catch (err: any) {
        const msg = `Diagnostics failed: ${err.message || String(err)}`;
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.error(msg);
      }
    }
  });
}
