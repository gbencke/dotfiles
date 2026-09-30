/**
 * Self-check: drives the extension with a fake ExtensionAPI and a fake
 * `codegraph` binary on PATH that echoes its own argv.
 *
 *   npx tsx codegraph.test.ts
 *
 * Testing through a PATH shim rather than a mocked exec keeps the real
 * execFile path under test — arg building is where this extension actually
 * broke (see the `/codegraph <path>` case below).
 *
 * Fails loudly if the tool surface grows back to the five-tool menu, if
 * explore regains a max-files cap, if a guard stops rejecting empty input,
 * if the slash command mishandles a string argument, or if a missing binary
 * stops producing install guidance.
 */

import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import register from "./index.ts";

// ── Fake codegraph binary ─────────────────────────────────────────────────────
// Prints its argv as JSON on a marker line so assertions can read it back.

const shimDir = mkdtempSync(join(tmpdir(), "cg-shim-"));
const shim = join(shimDir, "codegraph");
writeFileSync(
  shim,
  `#!/usr/bin/env node
console.log("ARGV:" + JSON.stringify(process.argv.slice(2)));
console.log("CWD:" + process.cwd());
`
);
chmodSync(shim, 0o755);

const realPath = process.env.PATH;
process.env.PATH = `${shimDir}:${realPath}`;

// ── Fake ExtensionAPI ─────────────────────────────────────────────────────────

type Tool = {
  name: string;
  description: string;
  parameters: any;
  execute: (id: string, params: any, signal?: AbortSignal) => Promise<any>;
};

function harness() {
  const tools = new Map<string, Tool>();
  const commands = new Map<string, (args: any, ctx: any) => Promise<void>>();
  const sent: string[] = [];
  const pi: any = {
    registerTool: (t: Tool) => tools.set(t.name, t),
    registerCommand: (name: string, opts: any) => commands.set(name, opts.handler),
    sendMessage: (m: any) => sent.push(m.content),
  };
  register(pi);
  return { tools, commands, sent };
}

/** Run a tool and return its text output. */
async function call(tool: Tool, params: any) {
  const res = await tool.execute("id", params);
  return { text: res.content.map((c: any) => c.text).join("\n"), isError: res.isError };
}

/** Pull the argv the fake binary saw out of a tool's output. */
function argv(text: string): string[] {
  const line = text.split("\n").find((l) => l.startsWith("ARGV:"));
  assert.ok(line, `no ARGV line in output:\n${text}`);
  return JSON.parse(line!.slice("ARGV:".length));
}

function cwdOf(text: string): string {
  const line = text.split("\n").find((l) => l.startsWith("CWD:"));
  assert.ok(line, `no CWD line in output:\n${text}`);
  return line!.slice("CWD:".length);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const results: string[] = [];
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push(`  ok   ${name}`);
  } catch (err: any) {
    results.push(`  FAIL ${name}\n       ${err.message.split("\n").join("\n       ")}`);
    process.exitCode = 1;
  }
}

const { tools, commands, sent } = harness();

async function main() {
await test("exposes exactly the three-tool surface", async () => {
  assert.deepEqual(
    [...tools.keys()].sort(),
    ["codegraph_affected_tests", "codegraph_explore", "codegraph_status"],
    "the five-tool menu measured worse than one strong tool — see README"
  );
});

await test("does not re-register the tools explore already subsumes", async () => {
  for (const gone of ["codegraph_node", "codegraph_query", "codegraph_relations"]) {
    assert.ok(!tools.has(gone), `${gone} is back; explore already inlines it`);
  }
});

await test("explore builds `explore <query>`", async () => {
  const { text } = await call(tools.get("codegraph_explore")!, { query: "how does auth work" });
  assert.deepEqual(argv(text), ["explore", "how does auth work"]);
});

await test("explore never passes a file cap", async () => {
  const { text } = await call(tools.get("codegraph_explore")!, { query: "q", max_files: 3 });
  assert.ok(
    !argv(text).includes("--max-files"),
    "capping starves the answer without saving tokens — measured 25046 vs 24998 chars"
  );
});

await test("explore exposes no max_files parameter at all", async () => {
  const props = tools.get("codegraph_explore")!.parameters.properties ?? {};
  assert.ok(!("max_files" in props), "a knob that does nothing invites the agent to fiddle with it");
});

await test("explore tells the agent the source is already read", async () => {
  const d = tools.get("codegraph_explore")!.description.toLowerCase();
  assert.match(d, /already read/, "the biggest measured saving came from this instruction");
  assert.match(d, /grep|read/, "must steer away from the grep/read loop");
});

await test("explore structure_only uses the cheap context mode", async () => {
  const { text } = await call(tools.get("codegraph_explore")!, { query: "q", structure_only: true });
  assert.deepEqual(argv(text), ["context", "--no-code", "-f", "markdown", "q"]);
});

await test("path is appended as -p, after a variadic query", async () => {
  const { text } = await call(tools.get("codegraph_explore")!, { query: "a b c", path: "/tmp" });
  assert.deepEqual(argv(text), ["explore", "a b c", "-p", "/tmp"]);
});

await test("path also becomes the subprocess cwd", async () => {
  const { text } = await call(tools.get("codegraph_explore")!, { query: "q", path: shimDir });
  assert.equal(cwdOf(text), shimDir);
});

await test("affected_tests passes the file list through", async () => {
  const { text } = await call(tools.get("codegraph_affected_tests")!, {
    files: ["src/a.ts", "src/b.ts"],
    depth: 3,
  });
  assert.deepEqual(argv(text), ["affected", "src/a.ts", "src/b.ts", "-d", "3"]);
});

await test("affected_tests rejects an empty file list without spawning", async () => {
  const { text, isError } = await call(tools.get("codegraph_affected_tests")!, { files: [] });
  assert.equal(isError, true);
  assert.match(text, /at least one changed file/);
  assert.ok(!text.includes("ARGV:"), "must not reach the binary");
});

await test("status action maps to the bare status command", async () => {
  const { text } = await call(tools.get("codegraph_status")!, { action: "status" });
  assert.deepEqual(argv(text), ["status"]);
});

await test("status takes its path positionally, not as -p", async () => {
  const { text } = await call(tools.get("codegraph_status")!, { action: "status", path: "/tmp" });
  assert.deepEqual(argv(text), ["status", "/tmp"], "`codegraph status` has no -p option");
});

await test("sync action maps to sync", async () => {
  const { text } = await call(tools.get("codegraph_status")!, { action: "sync" });
  assert.deepEqual(argv(text), ["sync"]);
});

await test("files action forwards its filters", async () => {
  const { text } = await call(tools.get("codegraph_status")!, {
    action: "files",
    filter: "src",
    pattern: "*.ts",
    max_depth: 2,
    path: "/tmp",
  });
  assert.deepEqual(argv(text), [
    "files", "--filter", "src", "--pattern", "*.ts", "--max-depth", "2", "-p", "/tmp",
  ]);
});

// Regression: pi hands the command tail through as a raw string, so `args[0]`
// was the leading "/" of an absolute path and every /codegraph <path> reported
// `Project: /`.
await test("/codegraph accepts a path passed as a raw string", async () => {
  sent.length = 0;
  await commands.get("codegraph")!("/home/me/project", { hasUI: true });
  assert.deepEqual(argv(sent[0]), ["status", "/home/me/project"]);
});

await test("/codegraph accepts a path passed as an argv array", async () => {
  sent.length = 0;
  await commands.get("codegraph")!(["/home/me/project"] as any, { hasUI: true });
  assert.deepEqual(argv(sent[0]), ["status", "/home/me/project"]);
});

await test("/codegraph with no argument checks the current project", async () => {
  sent.length = 0;
  await commands.get("codegraph")!("   ", { hasUI: true });
  assert.deepEqual(argv(sent[0]), ["status"]);
});

await test("a non-existent project path is reported as such, not as a bad install", async () => {
  const { text, isError } = await call(tools.get("codegraph_explore")!, {
    query: "q",
    path: "/nonexistent/project",
  });
  assert.equal(isError, true);
  assert.match(text, /path does not exist/, "a missing cwd throws the same ENOENT a missing binary does");
  assert.doesNotMatch(text, /npm install/, "must not blame the install for a bad path");
});

await test("a missing binary returns install guidance, not a stack trace", async () => {
  process.env.PATH = "/nonexistent";
  try {
    const { text, isError } = await call(tools.get("codegraph_explore")!, { query: "q" });
    assert.equal(isError, true);
    assert.match(text, /not found on PATH/);
    assert.match(text, /npm install -g @colbymchenry\/codegraph/);
  } finally {
    process.env.PATH = `${shimDir}:${realPath}`;
  }
});

}

main().then(() => {

// ── Report ────────────────────────────────────────────────────────────────────

rmSync(shimDir, { recursive: true, force: true });
process.env.PATH = realPath;

console.log(results.join("\n"));
const failed = results.filter((r) => r.includes("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
});
