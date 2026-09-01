/**
 * CodeGraph extension for pi.
 *
 * Wraps the `codegraph` CLI (@colbymchenry/codegraph) so the agent can query a
 * pre-indexed knowledge graph of a repo instead of grepping and reading files.
 * Pi has no MCP client, so the CLI is invoked as a subprocess per request; the
 * output is identical to the corresponding MCP tools.
 *
 * Tools exposed:
 *   codegraph_explore   – relevant symbols' source + call paths for a question
 *   codegraph_query     – symbol search by name/kind
 *   codegraph_node      – one symbol's source + caller/callee trail, or a file read
 *   codegraph_relations – callers / callees / impact / affected tests
 *   codegraph_status    – index health, file tree, incremental sync
 *
 * Command exposed:
 *   /codegraph          – index status for the current (or given) project
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const MAX_BUFFER = 8 * 1024 * 1024;
const TIMEOUT_MS = 120_000;

function text(t: string) {
  return [{ type: "text" as const, text: t }];
}

function fail(msg: string) {
  return { content: text(msg), details: undefined, isError: true };
}

/** Run codegraph and return combined stdout/stderr. Never throws. */
async function run(
  args: string[],
  cwd: string | undefined,
  signal?: AbortSignal
): Promise<{ ok: boolean; out: string }> {
  // A missing cwd makes execFile throw the same ENOENT a missing binary does,
  // so rule it out here rather than blaming the install.
  if (cwd && !existsSync(cwd)) {
    return { ok: false, out: `Project path does not exist: ${cwd}` };
  }
  try {
    const { stdout, stderr } = await execFileAsync("codegraph", args, {
      cwd: cwd || process.cwd(),
      maxBuffer: MAX_BUFFER,
      timeout: TIMEOUT_MS,
      signal,
      env: { ...process.env, NO_COLOR: "1" },
    });
    return { ok: true, out: (stdout + (stderr ? `\n${stderr}` : "")).trim() };
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      return {
        ok: false,
        out:
          "codegraph CLI not found on PATH. Install it with:\n" +
          "  npm install -g @colbymchenry/codegraph   (Node 20-24)",
      };
    }
    const out = [err?.stdout, err?.stderr, err?.message].filter(Boolean).join("\n").trim();
    return { ok: false, out: out || String(err) };
  }
}

/** Append `-p <path>` when the caller scoped the request to a project. */
function withPath(args: string[], path?: string): string[] {
  return path ? [...args, "-p", path] : args;
}

async function respond(args: string[], path: string | undefined, signal?: AbortSignal) {
  const { ok, out } = await run(args, path, signal);
  if (!ok) return fail(out);
  return {
    content: text(out || "(no results)"),
    details: { command: `codegraph ${args.join(" ")}` },
    isError: false,
  };
}

const PathParam = Type.Optional(
  Type.String({
    description:
      "Project directory to query. Defaults to the current working directory; " +
      "codegraph walks up to the nearest .codegraph/ index.",
  })
);

export default function (pi: ExtensionAPI) {
  // ── explore: the default entry point ───────────────────────────────────────
  pi.registerTool({
    name: "codegraph_explore",
    label: "CodeGraph Explore",
    description:
      "THE tool for reading and understanding code in an indexed repo. Answers almost any structural " +
      "question in ONE call: 'how does X work', a flow ('how does X reach Y'), surveying an area, or " +
      "reading a specific file or symbol. Returns the relevant symbols' verbatim source grouped by file, " +
      "the call paths between them (including dynamic-dispatch hops grep cannot follow), and a " +
      "blast-radius summary naming the tests that cover them.\n" +
      "Name a file path or symbol in the query to get its current line-numbered source — the same shape " +
      "the read tool gives you, so use this instead of read for indexed files.\n" +
      "TREAT THE RETURNED SOURCE AS ALREADY READ. Do not re-open those files with read, and do not " +
      "re-verify the results with grep — this IS the pre-built index, so a grep/read loop only repeats " +
      "work it already did. If the answer is incomplete, call this tool again with a sharper query " +
      "rather than falling back to grep or read.",
    promptSnippet:
      "codegraph_explore(query) – code context, flows, file reads, blast radius in one call; use instead of grep/read",
    parameters: Type.Object({
      query: Type.String({
        description:
          "A question ('how does the inbound event resolver work'), a flow ('how does handleEvent reach " +
          "the database'), or a bag of symbol names / file paths to pin ('src/auth/session.ts', " +
          "'SessionStore.refresh'). Naming concrete symbols and files makes the answer sharper. " +
          "Include qualified names like Class.method when you know them.",
      }),
      structure_only: Type.Optional(
        Type.Boolean({
          description:
            "Cheap map mode (~1 KB): symbols and relationships with no source bodies, via " +
            "`codegraph context --no-code`. Use only to orient on a large unfamiliar area before a real " +
            "explore. The default full mode is what answers questions.",
        })
      ),
      path: PathParam,
    }),
    async execute(_id, params, signal) {
      // No max-files knob: explore self-scales its output budget to the repo's file
      // count, and capping it measurably starves the answer without saving tokens.
      const args = params.structure_only
        ? ["context", "--no-code", "-f", "markdown", params.query]
        : ["explore", params.query];
      return respond(withPath(args, params.path), params.path, signal);
    },
  });

  // ── affected tests: the one thing explore cannot do ─────────────────────
  pi.registerTool({
    name: "codegraph_affected_tests",
    label: "CodeGraph Affected Tests",
    description:
      "Given a list of changed source files, return the test files that transitively depend on them. " +
      "Use when reviewing a diff to decide what to run. This is the only question codegraph_explore " +
      "cannot answer, because it takes a file list rather than a query.",
    promptSnippet: "codegraph_affected_tests(files) – which tests cover these changed files",
    parameters: Type.Object({
      files: Type.Array(Type.String(), {
        description: "Changed source files, e.g. from `git diff --name-only`.",
      }),
      depth: Type.Optional(
        Type.Number({ description: "Max dependency traversal depth (default 5).", minimum: 1, maximum: 10 })
      ),
      path: PathParam,
    }),
    async execute(_id, params, signal) {
      if (!params.files?.length) return fail("`files` must list at least one changed file.");
      const args = ["affected", ...params.files];
      if (params.depth) args.push("-d", String(params.depth));
      return respond(withPath(args, params.path), params.path, signal);
    },
  });

  // ── status / files / sync ──────────────────────────────────────────────────
  pi.registerTool({
    name: "codegraph_status",
    label: "CodeGraph Status",
    description:
      "Check whether a project has a CodeGraph index and how fresh it is, list indexed files, or run an " +
      "incremental sync. Run action='status' before the first graph query in a repo; run action='sync' " +
      "when results look stale after a rebase or large refactor. Never runs a full re-index.",
    promptSnippet: "codegraph_status(action) – index health, file tree, incremental sync",
    parameters: Type.Object({
      action: Type.Union([Type.Literal("status"), Type.Literal("files"), Type.Literal("sync")], {
        description:
          "'status' = index stats and pending changes. 'files' = indexed file structure. 'sync' = " +
          "incremental update of the existing index.",
      }),
      filter: Type.Optional(
        Type.String({ description: "files: restrict to this directory." })
      ),
      pattern: Type.Optional(
        Type.String({ description: "files: glob to match, e.g. '**/*.test.ts'." })
      ),
      max_depth: Type.Optional(
        Type.Number({ description: "files: maximum directory depth in tree output.", minimum: 1 })
      ),
      path: PathParam,
    }),
    async execute(_id, params, signal) {
      if (params.action === "status") {
        return respond(params.path ? ["status", params.path] : ["status"], params.path, signal);
      }
      if (params.action === "sync") {
        return respond(params.path ? ["sync", params.path] : ["sync"], params.path, signal);
      }
      const args = ["files"];
      if (params.filter) args.push("--filter", params.filter);
      if (params.pattern) args.push("--pattern", params.pattern);
      if (params.max_depth) args.push("--max-depth", String(params.max_depth));
      return respond(withPath(args, params.path), params.path, signal);
    },
  });

  // ── /codegraph command ─────────────────────────────────────────────────────
  pi.registerCommand("codegraph", {
    description: "Show the CodeGraph index status for the current or given project",
    handler: async (args, ctx) => {
      // pi hands the command tail through as a raw string, not an argv array.
      const raw = Array.isArray(args) ? args.join(" ") : String(args ?? "");
      const target = raw.trim() || undefined;
      // `codegraph status` takes the path positionally, so leave cwd alone.
      const { out } = await run(target ? ["status", target] : ["status"], undefined);
      const msg = out || "codegraph produced no output.";
      if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
      else console.log(msg);
    },
  });
}
