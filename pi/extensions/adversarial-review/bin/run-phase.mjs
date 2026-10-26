#!/usr/bin/env node
// Run ONE phase of the adversarial loop (propose | challenge | judge) in a
// fresh `pi -p` process with a context file built for that task alone.
// pi has no subagents, so process isolation is how phases stay independent
// (docs/adr/0006-phase-processes.md). Node standard library only.
//
// Usage: run-phase.mjs <propose|challenge|judge|pair> <task.json>
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
//   lens          lens name                                (propose, challenge)
//   scope         what this child reviews (chunk / slice / finding IDs)
//   paths         files in scope (child reads them itself)
//   context       orchestrator notes: ledger rows, invariant rows, diff path…
//   findings_file proposer output to challenge                         (challenge)
//   envelope_files challenger outputs to judge                           (judge)
//   prior_file    collector output (report-tools.mjs collect)            (judge)
//   intent        change intent text                                     (judge)
//   report_md     <target>/.gbencke/adversarial-review/reports/<name>.md (judge)
//   model, timeout_seconds  optional
//
// Writes <work_dir>/<id>.context.md, .out, .err, .json. Prints `RESULT: <json>`
// (propose/challenge) or `REPORT: <md>` (judge, only after validation).
// Exit: 0 ok, 1 child/output/validation failure, 2 bad usage or task.
import { spawnSync } from "node:child_process";
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
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateFile } from "./report-tools.mjs";

const BASE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PHASES = {
  propose: { role: "reviewer", contract: false },
  challenge: { role: "challenger", contract: true },
  judge: { role: "judge", contract: true },
};
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
  if (phase !== "judge") {
    need("lens", (v) => typeof v === "string" && /^[\w-]+$/.test(v));
    need("scope");
  }
  if (phase === "challenge") {
    need("findings_file", absDir);
    if (resolve(task.findings_file) === join(task.work_dir, `${task.id}.json`))
      throw new UsageError("challenge task.id must differ from the propose id; it would overwrite its own input");
  }
  if (phase === "judge") {
    need("envelope_files", (v) => Array.isArray(v) && v.every(absDir)); // empty: no chunk had a candidate
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
    LENS_NAME: task.lens ?? "multi",
    RULES: "the “Lens rules” section below",
    SCOPE: "the “Scope” section below",
    TARGET_DIR: task.target_dir,
    FINDINGS: phase === "judge" ? "the “Challenged envelopes” section below" : "the “Findings to challenge” section below",
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
    judge: 'one JSON object {"markdown": "<full report markdown>", "sidecar": {<complete schema-v2 sidecar>}}',
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
    phase === "judge"
      ? "- Do NOT write the artifacts or run the validator: the launcher writes your JSON to disk and validates it."
      : "- Read source yourself with your tools; only the paths listed below are in scope.",
    `- Reply with ${output} inside a single fenced \`\`\`json block. Nothing after it; the launcher parses the last json block.`,
    "",
    "## Role pack",
    "",
    filled,
  ];
  if (task.lens) s.push("", `## Lens rules (${task.lens})`, "", lensRules(task.lens, task.target_dir));
  if (task.scope || task.paths?.length)
    s.push("", "## Scope", "", task.scope ?? "", ...(task.paths ?? []).map((p) => `- ${p}`));
  if (task.context) s.push("", "## Orchestrator context", "", task.context);
  if (phase === "challenge")
    s.push("", "## Findings to challenge (verbatim proposer output)", "", fenced(readJSON(task.findings_file)));
  if (phase === "judge") {
    const md = task.report_md;
    s.push(
      "",
      "## Artifacts",
      "",
      `- Markdown: ${md}`,
      `- Sidecar: ${md.replace(/\.md$/, ".findings.json")} — its \`repository\` must be ${task.target_dir}`,
    );
    if (task.prior_file) s.push("", "## Prior ledger (collector output, verbatim)", "", fenced(readJSON(task.prior_file)));
    s.push("", "## Challenged envelopes (verbatim challenger outputs)");
    if (!task.envelope_files.length) s.push("", "(none — no slice produced a candidate finding)");
    for (const file of task.envelope_files) s.push("", `### ${file}`, "", fenced(readJSON(file)));
  }
  if (PHASES[phase].contract) s.push("", "## Report contract (docs/report-contract.md)", "", read(join(BASE, "docs", "report-contract.md")));
  return s.join("\n") + "\n";
}

export function piArgs(phase, task, contextPath) {
  const tools = phase === "judge" ? "read" : task.mode === "repo" ? "read,grep,find,ls" : "read,grep,find,ls,bash";
  return [
    "-p",
    "--no-session",
    "--no-extensions", // keeps this extension (and its message guard) out of the child
    "--no-skills",
    "--no-prompt-templates",
    "--no-context-files",
    "--no-approve", // never trust .pi files shipped inside the reviewed repo
    "--no-mcp",
    "--tools",
    tools,
    ...(task.model ? ["--model", task.model] : []),
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
  } else if (typeof result?.markdown !== "string" || !result.sidecar || typeof result.sidecar !== "object") {
    throw new Error('judge output must be {"markdown": string, "sidecar": object}');
  }
}

// Exclusive create: concurrent lens runs share the reports dir; never overwrite.
export function publish(task, result) {
  const md = task.report_md;
  const sidecar = md.replace(/\.md$/, ".findings.json");
  mkdirSync(dirname(md), { recursive: true });
  writeFileSync(md, result.markdown, { flag: "wx" });
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [phase, taskPath, ...rest] = process.argv.slice(2);
  try {
    if (!phase || !taskPath || rest.length) throw new UsageError("usage: run-phase.mjs <propose|challenge|judge|pair> <task.json>");
    console.log(phase === "pair" ? runPair(resolve(taskPath)) : runPhase(phase, resolve(taskPath)));
  } catch (error) {
    console.error(`run-phase: ${error.message}`);
    process.exitCode = error instanceof UsageError ? 2 : 1;
  }
}
