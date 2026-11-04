// node --test bin/test-run-phase.mjs — fake `pi` on PATH; no model runs.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { countsFor, reportHeading } from "./report-tools.mjs";
import { renderMarkdown } from "./run-phase.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "run-phase.mjs");
const root = mkdtempSync(join(tmpdir(), "run-phase-test-"));
process.on("exit", () => rmSync(root, { recursive: true, force: true }));

const bin = join(root, "bin");
mkdirSync(bin);
writeFileSync(
  join(bin, "pi"),
  '#!/usr/bin/env bash\nprintf "%s\\n" "$@" > "$FAKE_ARGS"\nsleep "${FAKE_SLEEP:-0}"\nf="$FAKE_OUT.$ADVERSARIAL_REVIEW_PHASE"\n[ -f "$f" ] || f=$FAKE_OUT\ncat "$f"\nexit "${FAKE_RC:-0}"\n',
);
chmodSync(join(bin, "pi"), 0o755);

// A committed Git repo, so the judge's report passes the snapshot check.
const repo = join(root, "repo");
mkdirSync(join(repo, ".gbencke/adversarial-review/lenses/design"), { recursive: true });
writeFileSync(join(repo, ".gbencke/adversarial-review/lenses/design/rules.md"), "OVERLAY-RULE-MARKER\n");
writeFileSync(join(repo, "code.txt"), "x\n");
const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
git("init", "-q");
git("add", ".");
git("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "commit", "-qm", "fixture");
const head = git("rev-parse", "HEAD");

let n = 0;
function run(phase, task, out, env = {}) {
  const id = `t${++n}`;
  const work = join(root, "work");
  const files = { args: join(root, `${id}.args`), out: join(root, `${id}.stdout`), task: join(root, `${id}.task.json`) };
  writeFileSync(files.out, typeof out === "string" ? out : "```json\n" + JSON.stringify(out) + "\n```\n");
  writeFileSync(files.task, JSON.stringify({ id, mode: "repo", target_dir: repo, work_dir: work, ...task }));
  const r = spawnSync("node", [cli, phase, files.task], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_ARGS: files.args, FAKE_OUT: files.out, ...env },
  });
  const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
  return { ...r, args: read(files.args), context: read(join(work, `${id}.context.md`)) };
}

const finding = { id: "deep-module", lens: "design", file: "code.txt", line: 1, failure_condition: "c", evidence: "e" };
const envelope = { finding, challenge: { state: "VALID", kill_attempts: ["k"], reason: "r" }, disposition: { status: "open" } };
const findingsFile = join(root, "findings.json");
writeFileSync(findingsFile, JSON.stringify([finding]));
const scope = { lens: "design", scope: "chunk 1", paths: ["code.txt"] };

test("propose builds a filled context with global+overlay rules and read-only tools", () => {
  const r = run("propose", scope, [finding]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^RESULT: .*t\d+\.json$/m);
  assert.doesNotMatch(r.context, /\{\{[A-Z_]+\}\}/);
  assert.match(r.context, /lenses\/design\/rules\.md -->[\s\S]*OVERLAY-RULE-MARKER/);
  assert.match(r.context, /- code\.txt/);
  assert.match(r.args, /^--tools\nread,grep,find,ls\n/m);
  assert.match(r.args, /^--no-extensions$/m);
  assert.match(r.args, /^--no-approve$/m);
  const sessionDir = /^--session-dir\n.*\/sessions\/--adversarial-review--$/m;
  assert.match(r.args, sessionDir);
  assert.doesNotMatch(r.args, /^--no-session$/m);
  const utcName = /^adversarial-review propose \S+ \d{4}-\d\d-\d\dT[\d:.]+Z$/m;
  assert.match(r.args, utcName);
});

test("lens children run on the lens model; the judge keeps the default model", () => {
  const r = run("propose", scope, [finding]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.args, /^--model\namazon-bedrock\/us\.anthropic\.claude-sonnet-5-5$/m);
});

test("a lens group gets one rules section per lens and must tag findings with one of them", () => {
  const group = { ...scope, lens: ["design", "docs"] };
  const r = run("propose", group, [finding, { ...finding, id: "stale-doc", lens: "docs" }]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.context, /## Lens rules \(design\)[\s\S]*## Lens rules \(docs\)/);
  const foreign = run("propose", group, [{ ...finding, lens: "security" }]);
  assert.equal(foreign.status, 1);
  assert.match(foreign.stderr, /must be one of: design, docs/);
});

test("change reviews add bash for git show at the pinned SHA", () => {
  const r = run("propose", { ...scope, mode: "change" }, []);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.args, /^read,grep,find,ls,bash$/m);
});

test("challenge passes proposer JSON verbatim and requires lossless envelopes", () => {
  const ok = run("challenge", { ...scope, findings_file: findingsFile }, [envelope]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.context, /"failure_condition": "c"/);
  const lost = run("challenge", { ...scope, findings_file: findingsFile }, []);
  assert.equal(lost.status, 1);
  assert.match(lost.stderr, /exactly 1 envelope/);
  const bad = run("challenge", { ...scope, findings_file: findingsFile }, [{ ...envelope, challenge: { state: "MAYBE" } }]);
  assert.match(bad.stderr, /challenge\.state/);
});

test("child failure, timeout, and unparseable output fail the phase", () => {
  assert.match(run("propose", scope, [], { FAKE_RC: "3" }).stderr, /pi exited 3/);
  assert.match(run("propose", { ...scope, timeout_seconds: 1 }, [], { FAKE_SLEEP: "3" }).stderr, /timed out/);
  const junk = run("propose", scope, "no json here");
  assert.equal(junk.status, 1);
  assert.match(junk.stderr, /no parseable json/);
});

test("bad tasks are usage errors", () => {
  assert.equal(run("propose", { ...scope, work_dir: join(repo, "tmp") }, []).status, 2);
  assert.ok(!existsSync(join(repo, "tmp")), "rejected work_dir must not be created inside the repo");
  assert.equal(run("propose", { ...scope, lens: "no-such-lens" }, []).status, 2);
  assert.equal(run("judge", { envelope_files: [findingsFile], report_md: "/tmp/x.md" }, {}).status, 2);
  assert.equal(run("nope", scope, []).status, 2);
  const work = join(root, "work");
  mkdirSync(work, { recursive: true });
  writeFileSync(join(work, "same-id.json"), JSON.stringify([finding]));
  const clash = run("challenge", { ...scope, id: "same-id", findings_file: join(work, "same-id.json") }, [envelope]);
  assert.equal(clash.status, 2);
  assert.match(clash.stderr, /must differ from the propose id/);
});

const reports = join(repo, ".gbencke/adversarial-review/reports");
const sidecar = (changes = {}) => ({
  schema_version: 2,
  repository: repo,
  target: "feature/x",
  mode: "change",
  scope: { kind: "full" },
  date: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  head_sha: head,
  base_sha: head,
  patch_sha256: null,
  pr_number: null,
  snapshot_consistent: true,
  lenses: ["design"],
  prior_reports: [],
  findings: [],
  counts: countsFor([]),
  uncertain_counts: countsFor([], true),
  coverage: [
    {
      id: "c1",
      invariant: "i",
      critical: true,
      entry_points: ["e"],
      writers: ["w"],
      consumers: ["c"],
      outcomes: ["success"],
      status: "verified",
      evidence: ["code.txt:1"],
    },
  ],
  verdict: { implementation: "CORRECT", solution_fit: "FITS", overall: "SHIP" },
  ...changes,
});

test("judge gets read only, writes validated artifacts exclusively, prints REPORT", () => {
  const s = sidecar();
  const md = join(reports, "20260101-000000-x-full-design.md");
  const task = { mode: "change", envelope_files: [findingsFile], report_md: md };
  const r = run("judge", task, { sidecar: s, notes: "## Blast radius\n\nNOTES-MARKER" });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.args, /^--model$/m, "judge keeps the default model");
  assert.equal(r.stdout.trim(), `REPORT: ${md}`);
  const written = readFileSync(md, "utf8");
  assert.equal(written.split("\n")[0], reportHeading(s), "launcher renders the canonical heading");
  assert.match(written, /NOTES-MARKER[\s\S]*## Confirmed findings[\s\S]*## Coverage\n\n\| ID .*\n.*\n\| c1 \| yes \| verified/);
  assert.match(r.args, /^--tools\nread\n/m);
  assert.match(r.context, /### .*findings\.json/);
  assert.ok(existsSync(md.replace(/\.md$/, ".findings.json")));
  const again = run("judge", task, { sidecar: s, notes: "" });
  assert.equal(again.status, 1);
  assert.match(again.stderr, /EEXIST/);
});

test("judge output without notes is rejected before anything is written", () => {
  const md = join(reports, "20260101-000002-x-full-design.md");
  const r = run("judge", { mode: "change", envelope_files: [findingsFile], report_md: md }, { markdown: "# x\n", sidecar: sidecar() });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /"notes": string/);
  assert.ok(!existsSync(md));
});

test("rendered markdown lists confirmed, uncertain, and carried findings in their own sections", () => {
  const f = (id, extra) => ({ id, severity: "P2", title: `t-${id}`, file: "a.ts", line: 3, failure_condition: "fc", status: "open", challenge: { state: "VALID" }, ...extra });
  const md = renderMarkdown(
    sidecar({
      findings: [
        f("conf"),
        f("unsure", { challenge: { state: "AMBIGUOUS", next_check: "NEXT-CHECK" } }),
        f("old", { status: "not_rechecked", prior_status: "fixed_verified", closure: { evidence: ["pipe|cell"] } }),
      ],
    }),
    "",
  );
  assert.match(md, /## Confirmed findings\n\n### P2 \(1\)\n\n- \*\*conf\*\* \(a\.ts:3\): t-conf\. fc\n/);
  assert.match(md, /- \*\*unsure\*\* \[P2\] \(a\.ts:3\): t-unsure\. Next check: NEXT-CHECK/);
  assert.match(md, /\| old \| not_rechecked \(was fixed_verified\) \| P2 \| t-old \| pipe\\\|cell \|/);
});

test("judge output that fails validation leaves no artifacts", () => {
  const md = join(reports, "20260101-000001-x-full-design.md");
  const s = sidecar({ counts: { ...countsFor([]), P0: 1 } });
  const r = run("judge", { mode: "change", envelope_files: [findingsFile], report_md: md }, { sidecar: s, notes: "" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /failed validation/);
  assert.ok(!existsSync(md));
  assert.ok(!existsSync(md.replace(/\.md$/, ".findings.json")));
});

// Per-phase fake output: FAKE_OUT.<phase> wins over FAKE_OUT.
function fakeEnv(outputs, extra = {}) {
  const base = join(root, `fake${++n}`);
  writeFileSync(base, "```json\n[]\n```\n");
  for (const [phase, value] of Object.entries(outputs)) writeFileSync(`${base}.${phase}`, "```json\n" + JSON.stringify(value) + "\n```\n");
  return { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_ARGS: join(root, `fake${n}.args`), FAKE_OUT: base, ...extra };
}
function taskFile(dir, name, fields) {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${name}.task.json`);
  writeFileSync(path, JSON.stringify({ mode: "repo", target_dir: repo, work_dir: join(root, "work"), ...scope, ...fields }));
  return path;
}

test("pair challenges a non-empty proposal and skips the challenge when empty", () => {
  const dir = join(root, "pairs");
  const full = spawnSync("node", [cli, "pair", taskFile(dir, "a", { id: "pair-a" })], { encoding: "utf8", env: fakeEnv({ propose: [finding], challenge: [envelope] }) });
  assert.equal(full.status, 0, full.stderr);
  assert.match(full.stdout, /RESULT: .*pair-a-challenge\.json/);
  assert.ok(existsSync(join(root, "work", "pair-a-propose.json")));
  const empty = spawnSync("node", [cli, "pair", taskFile(dir, "b", { id: "pair-b" })], { encoding: "utf8", env: fakeEnv({ propose: [] }) });
  assert.equal(empty.status, 0, empty.stderr);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "work", "pair-b-challenge.json"), "utf8")), []);
  assert.ok(!existsSync(join(root, "work", "pair-b-challenge.context.md")), "no challenge child for an empty proposal");
});

const lenses = join(here, "run-lenses.sh");
test("run-lenses runs lens workers in parallel and records every pair", () => {
  const dir = join(root, "tasks-ok");
  taskFile(join(dir, "design"), "chunk-1", { id: "chunk-1-design" });
  taskFile(join(dir, "python"), "chunk-1", { id: "chunk-1-python", lens: "python" });
  const start = Date.now();
  const r = spawnSync(lenses, [dir], { encoding: "utf8", env: fakeEnv({}, { FAKE_SLEEP: "2" }) });
  const seconds = (Date.now() - start) / 1000;
  assert.equal(r.status, 0, r.stderr);
  assert.ok(seconds < 3.5, `two 2s lens workers took ${seconds}s; they did not run in parallel`);
  const rows = readFileSync(join(dir, "manifest.tsv"), "utf8").trim().split("\n").slice(1);
  assert.deepEqual(rows.map((row) => row.split("\t")[0]).sort(), ["design", "python"]);
  assert.ok(rows.every((row) => row.split("\t")[2] === "0" && row.split("\t")[3].endsWith("-challenge.json")));
});

test("run-lenses shares slots across lenses: a free slot takes another lens's chunk", () => {
  const dir = join(root, "tasks-pool");
  for (const c of ["01-a", "02-b", "03-c"]) taskFile(join(dir, "design"), c, { id: `pool-${c}-design` });
  taskFile(join(dir, "python"), "01-a", { id: "pool-01-a-python", lens: "python" });
  const start = Date.now();
  const r = spawnSync(lenses, [dir], { encoding: "utf8", env: fakeEnv({}, { FAKE_SLEEP: "2" }) });
  const seconds = (Date.now() - start) / 1000;
  assert.equal(r.status, 0, r.stderr);
  // 4 tasks of 2s on 2 slots: ~4s pooled; per-lens workers would take 6s; >2 slots would take 2s.
  assert.ok(seconds >= 3.9 && seconds < 5.5, `4 x 2s tasks on 2 slots took ${seconds}s`);
  assert.equal(readFileSync(join(dir, "manifest.tsv"), "utf8").trim().split("\n").length, 5);
});

test("run-lenses marks failed pairs and exits nonzero; empty dir is a usage error", () => {
  const dir = join(root, "tasks-fail");
  taskFile(join(dir, "design"), "chunk-1", { id: "chunk-1-design-fail" });
  const r = spawnSync(lenses, [dir], { encoding: "utf8", env: fakeEnv({}, { FAKE_RC: "3" }) });
  assert.equal(r.status, 1);
  const row = readFileSync(join(dir, "manifest.tsv"), "utf8").trim().split("\n")[1].split("\t");
  assert.deepEqual([row[2], row[3]], ["1", "none"]);
  mkdirSync(join(root, "tasks-none"));
  assert.equal(spawnSync(lenses, [join(root, "tasks-none")]).status, 2);
});

test("a judge input over budget runs shard judges, assembles in code, and publishes a valid report", () => {
  const full = { ...finding, lens: "design", severity: "P2", title: "t", root_cause: "rc", suggestion: "s" };
  const envFile = join(root, "sharded-envelopes.json");
  writeFileSync(envFile, JSON.stringify([{ ...envelope, finding: full }]));
  const md = join(reports, "20260101-000003-repo-sharded.md");
  const meta = { target: "repo:sharded", date: new Date().toISOString().replace(/\.\d+Z$/, "Z"), head_sha: head, base_sha: null, snapshot_consistent: true, lenses: ["design"] };
  const task = taskFile(join(root, "sharded"), "judge", { id: "sharded-judge", envelope_files: [envFile], report_md: md, meta, judge_shard_bytes: 1 });
  const shardRows = [{ id: "deep-module", sources: ["E1"], base: "E1", status: "open", severity: "P2" }];
  const final = { merges: [], coverage: sidecar().coverage, solution_fit: null, notes: "## Per-lens health\n\nFINAL-NOTES" };
  const r = spawnSync("node", [cli, "judge", task], { encoding: "utf8", env: fakeEnv({ "judge-shard": shardRows, "judge-final": final }) });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), `REPORT: ${md}`);
  assert.match(r.stderr, /1 shard\(s\)/);
  const s = JSON.parse(readFileSync(md.replace(/\.md$/, ".findings.json"), "utf8"));
  assert.equal(s.findings[0].root_cause, "rc", "finding text copied by code, not by the model");
  assert.deepEqual(s.counts, { ...countsFor([]), P2: 1 });
  assert.equal(s.verdict.overall, "SHIP");
  assert.match(readFileSync(md, "utf8"), /FINAL-NOTES/);
  const work = join(root, "work");
  assert.match(readFileSync(join(work, "sharded-judge-shard-01.context.md"), "utf8"), /### E1 \(.*sharded-envelopes\.json#0\)/);
  assert.match(readFileSync(join(work, "sharded-judge-final.context.md"), "utf8"), /deep-module \| open \| P2 \| VALID \| design/);

  const md2 = join(reports, "20260101-000004-repo-sharded.md");
  const task2 = taskFile(join(root, "sharded"), "judge2", { id: "sharded-bad", envelope_files: [envFile], report_md: md2, meta, judge_shard_bytes: 1 });
  const bad = spawnSync("node", [cli, "judge", task2], { encoding: "utf8", env: fakeEnv({ "judge-shard": [], "judge-final": final }) });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /sharded-bad-shard-01-retry failed[\s\S]*failed twice/);
  assert.ok(!existsSync(md2), "no report when a shard fails twice");
  const noMeta = taskFile(join(root, "sharded"), "judge3", { id: "sharded-nometa", envelope_files: [envFile], report_md: md2, judge_shard_bytes: 1 });
  assert.equal(spawnSync("node", [cli, "judge", noMeta], { encoding: "utf8", env: fakeEnv({}) }).status, 2);
});

test("reuse_from reuses saved shard decisions when the shard input is unchanged", () => {
  const full = { ...finding, lens: "design", severity: "P2", title: "t", root_cause: "rc", suggestion: "s" };
  const envFile = join(root, "reuse-envelopes.json");
  writeFileSync(envFile, JSON.stringify([{ ...envelope, finding: full }]));
  const meta = { target: "repo:reuse", date: new Date().toISOString().replace(/\.\d+Z$/, "Z"), head_sha: head, base_sha: null, snapshot_consistent: true, lenses: ["design"] };
  const shardRows = [{ id: "deep-module", sources: ["E1"], base: "E1", status: "open", severity: "P2" }];
  const goodFinal = { merges: [], coverage: sidecar().coverage, solution_fit: null, notes: "" };
  const badFinal = { ...goodFinal, coverage: [{ ...goodFinal.coverage[0], evidence: [] }] };
  const md1 = join(reports, "20260101-000005-repo-reuse.md");
  const first = taskFile(join(root, "reuse"), "first", { id: "reuse-1", envelope_files: [envFile], report_md: md1, meta, judge_shard_bytes: 1 });
  const r1 = spawnSync("node", [cli, "judge", first], { encoding: "utf8", env: fakeEnv({ "judge-shard": shardRows, "judge-final": badFinal }) });
  assert.equal(r1.status, 1);
  assert.match(r1.stderr, /failed validation/);
  rmSync(join(root, "work", "reuse-1-final.json")); // the final decision was the bad part: rerun only it
  const md2 = join(reports, "20260101-000006-repo-reuse.md");
  const second = taskFile(join(root, "reuse"), "second", { id: "reuse-2", envelope_files: [envFile], report_md: md2, meta, judge_shard_bytes: 1, reuse_from: "reuse-1" });
  const r2 = spawnSync("node", [cli, "judge", second], { encoding: "utf8", env: fakeEnv({ "judge-shard": [], "judge-final": goodFinal }) });
  assert.equal(r2.status, 0, r2.stderr);
  assert.match(r2.stderr, /reused reuse-1-shard-01 decisions/);
  assert.ok(!existsSync(join(root, "work", "reuse-2-shard-01.context.md")), "no shard child ran");
});
