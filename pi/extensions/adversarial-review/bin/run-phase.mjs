#!/usr/bin/env node
// Run ONE phase of the adversarial loop (propose | challenge | judge) in a
// fresh `pi -p` process with a context file built for that task alone.
// pi has no subagents, so process isolation is how phases stay independent
// (docs/adr/0006-phase-processes.md). Node standard library only.
//
// Usage: run-phase.mjs <propose|challenge|judge|pair> <task.json>
//
// `judge` over its input budget runs `judge-shard` children in parallel, then one
// `judge-final` child; bin/judge-shards.mjs does the copying and the gates
// (docs/adr/0007-sharded-judge.md).
//
// `pair` = propose, then challenge the result (skipped when empty) for one
// slice. Ids become <id>-propose / <id>-challenge; prints the envelopes path.
// bin/run-lenses.sh runs pairs for several lenses in parallel.
//
// Task fields (absolute paths):
//   id            slug for work files, e.g. "chunk-03-design-propose"   (all)
//   mode          repo | change | verification                           (all)
//   target_dir    reviewed repository root                               (all)
//   work_dir      scratch dir OUTSIDE target_dir                         (all)
//   lens          lens name, or a lens group: list of names, one rules
//                 section each, findings tagged with one of them (propose, challenge)
//   scope         what this child reviews (chunk / slice / finding IDs)
//   paths         files in scope (child reads them itself)
//   context       orchestrator notes: ledger rows, invariant rows, diff path…
//   findings_file proposer output to challenge                         (challenge)
//   envelope_files challenger outputs to judge                           (judge)
//   prior_file    collector output (report-tools.mjs collect)            (judge)
//   intent        change intent text                                     (judge)
//   report_md     <target>/.gbencke/adversarial-review/reports/<name>.md (judge)
//   meta          pinned identity {target, date, head_sha, base_sha, …}  (sharded judge)
//   judge_shard_bytes, judge_slots  optional sharding budget / parallelism
//   reuse_from    earlier judge id: reuse its saved shard/final decisions (launcher fixes only)
//   model         optional, judge phases only; propose/challenge always run LENS_MODEL
//   timeout_seconds  optional
//
// Writes <work_dir>/<id>.context.md, .out, .err, .json. The child's pi
// session goes to ~/.pi/agent/sessions/--adversarial-review--/ so its cost
// is on record. Prints `RESULT: <json>` (propose/challenge) or
// `REPORT: <md>` (judge, only after validation).
// Exit: 0 ok, 1 child/output/validation failure, 2 bad usage or task.
import { spawn, spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reportHeading, validateFile } from "./report-tools.mjs";
import { applyMerges, assemble, buildSidecar, checkShard, indexLines, lensCounts, numberEnvelopes, partition } from "./judge-shards.mjs";

const BASE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PHASES = {
  propose: { role: "reviewer", contract: false },
  challenge: { role: "challenger", contract: true },
  judge: { role: "judge", contract: true },
  "judge-shard": { role: "judge-shard", contract: true },
  "judge-final": { role: "judge-final", contract: true },
};
const isJudge = (phase) => phase.startsWith("judge");
// Lens children run on Sonnet, the judge on the default model (docs/adr/0008-lens-groups.md).
export const LENS_MODEL = "amazon-bedrock/us.anthropic.claude-sonnet-5-5";
const lensList = (task) => [task.lens ?? []].flat();
const SHARD_BYTES = 150_000; // judge input above this is sharded (docs/adr/0007-sharded-judge.md)
const SHARD_SLOTS = 8;
const STATES = new Set(["VALID", "INVALID", "AMBIGUOUS"]);

class UsageError extends Error {}

const read = (path) => readFileSync(path, "utf8");
const readJSON = (path) => JSON.parse(read(path));
const inside = (child, parent) => {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
};

export function loadTask(phase, path) {
  if (!PHASES[phase]) throw new UsageError(`unknown phase ${phase}`);
  let task;
  try {
    task = readJSON(path);
  } catch (error) {
    throw new UsageError(`cannot read task ${path}: ${error.message}`);
  }
  const need = (field, ok = (v) => typeof v === "string" && v) => {
    if (!ok(task[field])) throw new UsageError(`task.${field} is required for ${phase}`);
  };
  const absDir = (v) => typeof v === "string" && isAbsolute(v);
  need("id", (v) => typeof v === "string" && /^[\w.-]+$/.test(v));
  need("mode", (v) => ["repo", "change", "verification"].includes(v));
  need("target_dir", (v) => absDir(v) && existsSync(v));
  need("work_dir", absDir);
  task.target_dir = realpathSync(task.target_dir);
  const scratchError = "task.work_dir must be outside target_dir (scratch never goes in the reviewed repo)";
  if (inside(resolve(task.work_dir), task.target_dir)) throw new UsageError(scratchError);
  mkdirSync(task.work_dir, { recursive: true });
  task.work_dir = realpathSync(task.work_dir);
  if (inside(task.work_dir, task.target_dir)) throw new UsageError(scratchError);
  if (!isJudge(phase)) {
    const slug = (v) => typeof v === "string" && /^[\w-]+$/.test(v);
    need("lens", (v) => slug(v) || (Array.isArray(v) && v.length > 0 && v.every(slug)));
    need("scope");
  }
  if (phase === "challenge") {
    need("findings_file", absDir);
    if (resolve(task.findings_file) === join(task.work_dir, `${task.id}.json`))
      throw new UsageError("challenge task.id must differ from the propose id; it would overwrite its own input");
  }
  if (phase === "judge-shard") need("shard_file", absDir);
  if (phase === "judge-final") need("assembled_file", absDir);
  if (phase === "judge" || phase === "judge-final") {
    if (phase === "judge") need("envelope_files", (v) => Array.isArray(v) && v.every(absDir)); // empty: no chunk had a candidate
    need("report_md", (v) => absDir(v) && v.endsWith(".md"));
    const reports = join(task.target_dir, ".gbencke", "adversarial-review", "reports");
    if (dirname(task.report_md) !== reports)
      throw new UsageError(`task.report_md must be directly under ${reports}`);
  }
  return task;
}

export function lensRules(lens, targetDir) {
  const parts = [];
  for (const dir of [join(BASE, "lenses", lens), join(targetDir, ".gbencke", "adversarial-review", "lenses", lens)])
    for (const file of ["rules.md", "conventions.md"])
      if (existsSync(join(dir, file))) parts.push(`<!-- ${join(dir, file)} -->\n${read(join(dir, file))}`);
  if (!parts.length) throw new UsageError(`lens ${lens} has no rules.md (global or project overlay)`);
  return parts.join("\n\n");
}

const fenced = (value) => "```json\n" + JSON.stringify(value, null, 2) + "\n```";

export function buildContext(phase, task) {
  const pack = read(join(BASE, "agents", `${PHASES[phase].role}.md`));
  const slots = {
    LENS_NAME: task.lens ? lensList(task).join(", ") : "multi",
    RULES: "the “Lens rules” section below",
    SCOPE: "the “Scope” section below",
    TARGET_DIR: task.target_dir,
    FINDINGS: isJudge(phase) ? "the “Challenged envelopes” section below" : "the “Findings to challenge” section below",
    MODE: task.mode,
    INTENT: task.intent || "unknown — see the “Orchestrator context” section",
    CONTEXT: "the “Orchestrator context” section below",
  };
  const filled = pack.replace(/\{\{([A-Z_]+)\}\}/g, (all, name) => slots[name] ?? all);
  const left = filled.match(/\{\{[A-Z_]+\}\}/);
  if (left) throw new Error(`role pack ${PHASES[phase].role}.md has unfilled slot ${left[0]}`);

  const output = {
    propose: "a JSON array of complete findings (empty array if none survive)",
    challenge: "a JSON array with exactly one lossless envelope per input finding, same order",
    judge: 'one JSON object {"sidecar": {<complete schema-v2 sidecar>}, "notes": "<markdown prose sections only>"}',
    "judge-shard": "a JSON array of decision rows, one per root cause, covering every envelope ref of this shard",
    "judge-final": 'one JSON object {"merges": [...], "coverage": [...], "solution_fit": <string or null>, "notes": "<markdown prose sections only>"}',
  }[phase];
  const s = [
    `# adversarial-review — ${phase} phase (${task.id})`,
    "",
    "You are a fresh, isolated pi process running ONE phase of the adversarial loop.",
    "You are not the orchestrator: do only this phase, then stop.",
    "",
    `- Extension base dir (resolve relative references against it): ${BASE}`,
    `- Target root: ${task.target_dir}`,
    `- Review mode: ${task.mode}`,
    "- Never modify any file. Never execute reviewed code, tests, builds, or live services.",
    "- Never ask questions; nobody is there to answer.",
    isJudge(phase)
      ? "- Do NOT write the artifacts or run the validator: the launcher writes your JSON to disk and validates it."
      : "- Read source yourself with your tools; only the paths listed below are in scope.",
    `- Reply with ${output} inside a single fenced \`\`\`json block. Nothing after it; the launcher parses the last json block.`,
    "",
    "## Role pack",
    "",
    filled,
  ];
  for (const lens of lensList(task)) s.push("", `## Lens rules (${lens})`, "", lensRules(lens, task.target_dir));
  if (task.scope || task.paths?.length)
    s.push("", "## Scope", "", task.scope ?? "", ...(task.paths ?? []).map((p) => `- ${p}`));
  if (task.context) s.push("", "## Orchestrator context", "", task.context);
  if (phase === "challenge")
    s.push("", "## Findings to challenge (verbatim proposer output)", "", fenced(readJSON(task.findings_file)));
  if (phase === "judge-shard") {
    const shard = readJSON(task.shard_file);
    s.push("", "## Prior ledger rows owned by this shard (verbatim)", "", shard.priors.length ? fenced(shard.priors) : "(none)");
    s.push("", "## Prior ids owned by other shards (never use one as a row id)", "", shard.foreign_prior_ids.join(", ") || "(none)");
    s.push("", "## Challenged envelopes of this shard (verbatim; cite them by ref)");
    for (const e of shard.envelopes) s.push("", `### ${e.ref} (${e.source})`, "", fenced(e.envelope));
  }
  if (phase === "judge-final") {
    const assembled = readJSON(task.assembled_file);
    s.push(
      "",
      "## Assembled ledger",
      "",
      `Full rows: ${task.assembled_file} (read it, or the envelope files named in each row's \`envelope_refs\`, when a merge or coverage call needs detail).`,
      "",
      "Index — id | status | severity | challenge | lenses | file:line | title:",
      "",
      "```text",
      ...indexLines(assembled.findings),
      "```",
      "",
      "Active rows per lens (confirmed by severity, uncertain, not_rechecked):",
      "",
      fenced(lensCounts(assembled.findings)),
    );
  }
  if (phase === "judge" || phase === "judge-final") {
    const md = task.report_md;
    s.push(
      "",
      "## Artifacts",
      "",
      `- Markdown: ${md}`,
      `- Sidecar: ${md.replace(/\.md$/, ".findings.json")} — its \`repository\` must be ${task.target_dir}`,
    );
    if (phase === "judge" && task.prior_file) s.push("", "## Prior ledger (collector output, verbatim)", "", fenced(readJSON(task.prior_file)));
    if (phase === "judge") s.push("", "## Challenged envelopes (verbatim challenger outputs)");
    if (phase === "judge" && !task.envelope_files.length) s.push("", "(none — no slice produced a candidate finding)");
    for (const file of phase === "judge" ? task.envelope_files : []) s.push("", `### ${file}`, "", fenced(readJSON(file)));
  }
  if (PHASES[phase].contract) s.push("", "## Report contract (docs/report-contract.md)", "", read(join(BASE, "docs", "report-contract.md")));
  return s.join("\n") + "\n";
}

export const SESSION_DIR = join(
  homedir(), ".pi", "agent", "sessions", "--adversarial-review--",
);

export function piArgs(phase, task, contextPath) {
  const tools = isJudge(phase) ? "read" : task.mode === "repo" ? "read,grep,find,ls" : "read,grep,find,ls,bash";
  const model = isJudge(phase) ? task.model : LENS_MODEL;
  return [
    "-p",
    // saved (not --no-session) so child token cost shows up in session logs
    "--session-dir",
    SESSION_DIR,
    "--name",
    `adversarial-review ${phase} ${task.id} ${new Date().toISOString()}`, // UTC
    "--no-extensions", // keeps this extension (and its message guard) out of the child
    "--no-skills",
    "--no-prompt-templates",
    "--no-context-files",
    "--no-approve", // never trust .pi files shipped inside the reviewed repo
    "--no-mcp",
    "--tools",
    tools,
    ...(model ? ["--model", model] : []),
    `@${contextPath}`,
    `Run the ${phase} phase described in the attached file and reply with only the JSON block it specifies.`,
  ];
}

export function parseOutput(text) {
  const blocks = [...text.matchAll(/```json[^\n]*\n([\s\S]*?)\n```/g)];
  const raw = blocks.length ? blocks.at(-1)[1] : text.trim();
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`child output has no parseable json block: ${error.message}`);
  }
}

// Per-lens health needs every finding tagged with exactly one lens of its task.
function checkLensTags(findings, task) {
  const lenses = lensList(task);
  const bad = findings.find((f) => !lenses.includes(f.lens));
  if (bad) throw new Error(`finding ${bad.id} has lens ${JSON.stringify(bad.lens)}; it must be one of: ${lenses.join(", ")}`);
}

export function checkResult(phase, result, task) {
  if (phase === "propose") {
    if (!Array.isArray(result) || !result.every((f) => f && typeof f.id === "string"))
      throw new Error("propose output must be an array of findings, each with a string id");
  } else if (phase === "challenge") {
    const input = readJSON(task.findings_file);
    if (!Array.isArray(result) || result.length !== input.length)
      throw new Error(`challenge output must hold exactly ${input.length} envelope(s)`);
    result.forEach((e, i) => {
      if (e?.finding?.id !== input[i].id) throw new Error(`envelope ${i} lost or reordered finding ${input[i].id}`);
      if (!STATES.has(e?.challenge?.state)) throw new Error(`envelope ${i} challenge.state must be VALID, INVALID, or AMBIGUOUS`);
      if (!e.disposition || typeof e.disposition !== "object") throw new Error(`envelope ${i} has no disposition`);
    });
  } else if (phase === "judge-shard") {
    const shard = readJSON(task.shard_file);
    checkShard(result, shard, shard.foreign_prior_ids);
  } else if (phase === "judge-final") {
    if (typeof result?.notes !== "string" || !Array.isArray(result.coverage) || !result.coverage.length || !Array.isArray(result.merges ?? []))
      throw new Error('judge-final output must be {"merges": [], "coverage": [non-empty], "solution_fit": ..., "notes": string}');
  } else if (typeof result?.notes !== "string" || !result.sidecar || typeof result.sidecar !== "object") {
    throw new Error('judge output must be {"sidecar": object, "notes": string}');
  }
}

const SEVERITIES = ["P0", "P1", "P2", "P3"];
const cell = (v) => String(v ?? "").replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|");
const where = (f) => (f.file ? ` (${f.file}${f.line ? `:${f.line}` : ""})` : "");
const effective = (f) => (f.status === "not_rechecked" ? f.prior_status : f.status);

// The judge writes only the sidecar plus prose notes; every section derivable
// from the sidecar is rendered here, so the judge spends no output tokens on it
// and the heading always matches the verdict.
export function renderMarkdown(s, notes) {
  const findings = Array.isArray(s.findings) ? s.findings : [];
  const open = (state) => findings.filter((f) => effective(f) === "open" && (f.challenge?.state === "AMBIGUOUS") === (state === "AMBIGUOUS"));
  const tally = (counts) => SEVERITIES.map((k) => `${k} ${counts?.[k] ?? 0}`).join(" · ");
  const scope = s.scope?.kind === "finding" ? `finding verification of ${(s.scope.finding_ids ?? []).join(", ")}` : (s.scope?.kind ?? "unknown");
  const out = [
    reportHeading(s),
    "",
    "## Scope and revision",
    "",
    `- Repository: ${s.repository}`,
    `- Target: ${s.target}${s.pr_number ? ` (PR #${s.pr_number})` : ""} · mode ${s.mode} · scope ${scope}`,
    `- Lenses: ${(s.lenses ?? []).join(", ")}`,
    s.patch_sha256 ? `- Patch: ${s.patch_path} (sha256 ${s.patch_sha256})` : `- Head: ${s.head_sha} · base: ${s.base_sha ?? "none"}`,
    `- Date: ${s.date} · snapshot consistent: ${s.snapshot_consistent}`,
    "",
    "## Verdict",
    "",
  ];
  if (s.mode === "verification") out.push("- No whole-PR verdict: this verifies only the listed findings.");
  else
    out.push(
      `- Overall: **${s.verdict?.overall}**, within the declared scope and lenses`,
      `- Implementation: ${s.verdict?.implementation} · solution fit: ${s.verdict?.solution_fit ?? "n/a (repository review)"}`,
    );
  out.push(`- Confirmed active: ${tally(s.counts)}`, `- Uncertain active: ${tally(s.uncertain_counts)}`);
  if (notes.trim()) out.push("", notes.trim());

  out.push("", "## Confirmed findings");
  const confirmed = open("VALID");
  if (!confirmed.length) out.push("", "None in scope.");
  for (const sev of SEVERITIES) {
    const rows = confirmed.filter((f) => f.severity === sev);
    if (!rows.length) continue;
    out.push("", `### ${sev} (${rows.length})`, "");
    for (const f of rows) out.push(`- **${f.id}**${where(f)}: ${cell(f.title)}. ${cell(f.failure_condition)}`);
  }

  out.push("", "## Verification questions (uncertain, not counted as confirmed)", "");
  const uncertain = open("AMBIGUOUS");
  if (!uncertain.length) out.push("None.");
  for (const f of uncertain) out.push(`- **${f.id}** [${f.severity}]${where(f)}: ${cell(f.title)}. Next check: ${cell(f.challenge?.next_check)}`);

  out.push("", "## Prior-finding dispositions", "");
  const closed = findings.filter((f) => f.status !== "open");
  if (!closed.length) out.push("None.");
  else {
    out.push("| ID | Status | Severity | Title | Basis |", "|---|---|---|---|---|");
    for (const f of closed) {
      const status = f.status === "not_rechecked" ? `not_rechecked (was ${f.prior_status})` : f.status;
      const basis = f.closure?.evidence?.join("; ") ?? f.deferral?.reason ?? f.challenge?.reason;
      out.push(`| ${cell(f.id)} | ${status} | ${f.severity} | ${cell(f.title)} | ${cell(basis)} |`);
    }
  }

  out.push("", "## Coverage", "");
  const coverage = Array.isArray(s.coverage) ? s.coverage : [];
  if (!coverage.length) out.push("No coverage rows.");
  else {
    out.push("| ID | Critical | Status | Invariant | Evidence or next check |", "|---|---|---|---|---|");
    for (const c of coverage)
      out.push(`| ${cell(c.id)} | ${c.critical ? "yes" : "no"} | ${c.status} | ${cell(c.invariant)} | ${cell(c.evidence?.join("; ") || c.next_check || c.reason)} |`);
  }
  return out.join("\n") + "\n";
}

// Exclusive create: concurrent lens runs share the reports dir; never overwrite.
export function publish(task, result) {
  const md = task.report_md;
  const sidecar = md.replace(/\.md$/, ".findings.json");
  mkdirSync(dirname(md), { recursive: true });
  writeFileSync(md, renderMarkdown(result.sidecar, result.notes), { flag: "wx" });
  try {
    writeFileSync(sidecar, JSON.stringify(result.sidecar, null, 2) + "\n", { flag: "wx" });
  } catch (error) {
    unlinkSync(md);
    throw error;
  }
  try {
    validateFile(sidecar);
  } catch (error) {
    unlinkSync(md);
    unlinkSync(sidecar);
    throw new Error(`report failed validation, artifacts removed:\n${error.message}`);
  }
  return md;
}

export function runPhase(phase, taskPath) {
  const task = loadTask(phase, taskPath);
  const file = (ext) => join(task.work_dir, `${task.id}.${ext}`);
  writeFileSync(file("context.md"), buildContext(phase, task));
  const out = openSync(file("out"), "w");
  const err = openSync(file("err"), "w");
  let child;
  try {
    child = spawnSync("pi", piArgs(phase, task, file("context.md")), {
      cwd: task.target_dir,
      stdio: ["ignore", out, err],
      timeout: (task.timeout_seconds ?? 1800) * 1000,
      env: { ...process.env, ADVERSARIAL_REVIEW_PHASE: phase },
    });
  } finally {
    closeSync(out);
    closeSync(err);
  }
  if (child.error?.code === "ETIMEDOUT") throw new Error(`pi timed out; log ${file("err")}`);
  if (child.error) throw new Error(`cannot start pi: ${child.error.message}`);
  if (child.status !== 0) throw new Error(`pi exited ${child.status ?? child.signal}; log ${file("err")}`);
  const result = parseOutput(read(file("out")));
  checkResult(phase, result, task);
  if (!isJudge(phase)) checkLensTags(phase === "challenge" ? result.map((e) => e.finding) : result, task);
  writeFileSync(file("json"), JSON.stringify(result, null, 2) + "\n");
  return phase === "judge" ? `REPORT: ${publish(task, result)}` : `RESULT: ${file("json")}`;
}

export function runPair(taskPath) {
  const raw = readJSON(taskPath);
  const task = loadTask("propose", taskPath); // fail fast before any child runs
  const derive = (step, extra = {}) => {
    const path = join(task.work_dir, `${task.id}-${step}.task.json`);
    writeFileSync(path, JSON.stringify({ ...raw, id: `${task.id}-${step}`, ...extra }, null, 2));
    return path;
  };
  const findings = runPhase("propose", derive("propose")).slice("RESULT: ".length);
  if (readJSON(findings).length) return runPhase("challenge", derive("challenge", { findings_file: findings }));
  const empty = join(task.work_dir, `${task.id}-challenge.json`);
  writeFileSync(empty, "[]\n"); // nothing proposed: an empty envelope list keeps the judge input uniform
  return `RESULT: ${empty}`;
}

const SELF = fileURLToPath(import.meta.url);
const log = (message) => console.error(`run-phase: ${message}`);

function spawnPhase(phase, taskPath) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [SELF, phase, taskPath], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => done({ code: 1, out, err: err + e.message }));
    child.on("close", (code) => done({ code, out, err }));
  });
}

async function pool(items, slots, work) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await work(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(slots, items.length) }, worker));
  return results;
}

export function checkMeta(meta) {
  const sha = (v) => v == null || /^[a-f0-9]{40}$/.test(v);
  const ok =
    meta &&
    typeof meta.target === "string" &&
    typeof meta.date === "string" &&
    /Z$/.test(meta.date) &&
    Array.isArray(meta.lenses) &&
    meta.lenses.length > 0 &&
    typeof meta.snapshot_consistent === "boolean" &&
    sha(meta.head_sha) &&
    sha(meta.base_sha);
  if (!ok)
    throw new UsageError(
      "a sharded judge needs task.meta {target, date (UTC Z), lenses[], snapshot_consistent, head_sha, base_sha, pr_number, patch_sha256}",
    );
}

/**
 * The judge step. Small inputs: one judge child writes the whole sidecar (ADR 0006).
 * Large inputs: shard judges decide in parallel, code assembles the ledger and
 * applies the gates, one final judge merges across shards and writes coverage and
 * notes (ADR 0007). Either way publish() writes and validates the artifacts.
 */
export async function runJudge(taskPath) {
  const task = loadTask("judge", taskPath);
  const files = task.envelope_files.map((path) => ({ path, envelopes: readJSON(path) }));
  const prior = task.prior_file ? readJSON(task.prior_file) : { findings: [], prior_reports: [] };
  const budget = task.judge_shard_bytes ?? SHARD_BYTES;
  const total = JSON.stringify(files).length + JSON.stringify(prior.findings ?? []).length;
  if (task.mode === "verification" || total <= budget) return runPhase("judge", taskPath);
  checkMeta(task.meta);

  const base = { mode: task.mode, target_dir: task.target_dir, work_dir: task.work_dir, context: task.context, model: task.model, timeout_seconds: task.timeout_seconds };
  const writeTask = (id, extra) => {
    const path = join(task.work_dir, `${id}.task.json`);
    writeFileSync(path, JSON.stringify({ ...base, id, ...extra }, null, 2));
    return path;
  };
  const shards = partition(numberEnvelopes(files), prior.findings ?? [], budget);
  // reuse_from: an earlier judge id in this work dir. Its saved decisions are reused
  // where the shard input is byte-identical, e.g. after a launcher fix; no model reruns.
  const reused = (oldId, data) => {
    if (!task.reuse_from) return null;
    const oldShard = join(task.work_dir, `${oldId}.shard.json`);
    if (!existsSync(oldShard) || read(oldShard) !== JSON.stringify(data, null, 2)) return null;
    for (const attempt of [oldId, `${oldId}-retry`]) {
      const file = join(task.work_dir, `${attempt}.json`);
      if (!existsSync(file)) continue;
      const rows = readJSON(file);
      checkShard(rows, data, data.foreign_prior_ids);
      log(`judge: reused ${attempt} decisions`);
      return rows;
    }
    return null;
  };
  const allPriorIds = (prior.findings ?? []).flatMap((p) => [p.id, ...(p.aliases ?? [])]);
  log(`judge: ${total} bytes -> ${shards.length} shard(s), ${Math.min(SHARD_SLOTS, shards.length)} at a time`);
  const decisions = await pool(shards, task.judge_slots ?? SHARD_SLOTS, async (shard, i) => {
    const id = `${task.id}-shard-${String(i + 1).padStart(2, "0")}`;
    const own = new Set(shard.priors.flatMap((p) => [p.id, ...(p.aliases ?? [])]));
    const shardFile = join(task.work_dir, `${id}.shard.json`);
    const data = { ...shard, foreign_prior_ids: allPriorIds.filter((x) => !own.has(x)) };
    writeFileSync(shardFile, JSON.stringify(data, null, 2));
    const saved = reused(`${id.replace(task.id, task.reuse_from)}`, data);
    if (saved) return saved;
    for (const attempt of [id, `${id}-retry`]) {
      const r = await spawnPhase("judge-shard", writeTask(attempt, { shard_file: shardFile }));
      const result = r.out.match(/^RESULT: (.+)$/m)?.[1];
      if (r.code === 0 && result) {
        log(`judge: ${attempt} ok (${shard.envelopes.length} envelopes, ${shard.priors.length} prior rows)`);
        return readJSON(result);
      }
      log(`judge: ${attempt} failed: ${r.err.trim().split("\n").slice(-3).join(" | ")}`);
    }
    throw new Error(`shard ${id} failed twice; see ${join(task.work_dir, `${id}-retry.err`)}`);
  });

  const findings = assemble(shards, decisions, prior.findings ?? [], task.meta);
  const assembledFile = join(task.work_dir, `${task.id}-assembled.json`);
  writeFileSync(assembledFile, JSON.stringify({ findings }, null, 2));
  log(`judge: assembled ${findings.length} ledger rows; running the final judge`);
  const savedFinal = task.reuse_from && join(task.work_dir, `${task.reuse_from}-final.json`);
  const final = savedFinal && existsSync(savedFinal)
    ? (log(`judge: reused ${task.reuse_from}-final decisions`), readJSON(savedFinal))
    : readJSON(runPhase("judge-final", writeTask(`${task.id}-final`, { assembled_file: assembledFile, report_md: task.report_md })).slice("RESULT: ".length));
  checkResult("judge-final", final, task);
  const sidecar = buildSidecar({
    meta: task.meta,
    mode: task.mode,
    repository: task.target_dir,
    priorReports: prior.prior_reports ?? [],
    findings: applyMerges(findings, final.merges),
    coverage: final.coverage,
    solutionFit: final.solution_fit,
  });
  return `REPORT: ${publish(task, { sidecar, notes: final.notes })}`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [phase, taskPath, ...rest] = process.argv.slice(2);
  try {
    if (!phase || !taskPath || rest.length) throw new UsageError("usage: run-phase.mjs <propose|challenge|judge|judge-shard|judge-final|pair> <task.json>");
    const path = resolve(taskPath);
    console.log(phase === "pair" ? runPair(path) : phase === "judge" ? await runJudge(path) : runPhase(phase, path));
  } catch (error) {
    console.error(`run-phase: ${error.message}`);
    process.exitCode = error instanceof UsageError ? 2 : 1;
  }
}
