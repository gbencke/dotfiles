#!/usr/bin/env node
// Report data only: no model calls, package scripts, or reviewed-code execution.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SEVERITIES = ["P0", "P1", "P2", "P3"];
const STATUSES = [
  "open",
  "fixed_verified",
  "disproved",
  "deferred",
  "not_rechecked",
];
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const text = (value) => typeof value === "string" && value.trim().length > 0;
const strings = (value) =>
  Array.isArray(value) && value.length > 0 && value.every(text);
const utc = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const reportDirectory = (repo) =>
  join(repo, ".gbencke/adversarial-review/reports");
const readJSON = (path) => JSON.parse(readFileSync(path, "utf8"));
const effectiveStatus = (finding) =>
  finding.status === "not_rechecked" ? finding.prior_status : finding.status;
const active = (finding) => effectiveStatus(finding) === "open";
const revision = (report) => report.head_sha ?? report.patch_sha256;

function prNumber(report) {
  const value = report.pr_number ?? report.pr?.number;
  if (Number.isInteger(value)) return value;
  const url =
    report.pr_url ?? report.pr?.url ?? report.context?.pr_url ?? report.target;
  const match = typeof url === "string" && url.match(/\/pull\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function matches(report, target, pr) {
  if (
    target.startsWith("repo:") &&
    report.mode === "repo" &&
    report.schema_version !== 2
  )
    return true;
  if (pr != null && prNumber(report) != null) return prNumber(report) === pr;
  return report.target === target;
}

// ponytail: linear archive scan; add an index only if collection becomes slow.
function records(repo) {
  const directory = reportDirectory(repo);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(".findings.json"))
    .map((name) => {
      const path = join(directory, name);
      const raw = readFileSync(path, "utf8");
      try {
        return { path, sha256: hash(raw), report: JSON.parse(raw) };
      } catch (error) {
        throw new Error(`Cannot parse prior report ${path}: ${error.message}`);
      }
    });
}

// Legacy F1 is report-local. Fingerprint file + title (not moving line numbers).
// Wording variants need evidence-backed aliases; never guess semantic closure.
export function legacyFinding(finding, report) {
  const key = `${finding.file ?? ""}\n${finding.title ?? finding.id ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, " ");
  return {
    ...finding,
    id: `legacy-${hash(key).slice(0, 16)}`,
    status: "open",
    first_seen: report.date,
    last_checked_sha:
      report.head_sha ??
      report.head ??
      report.head_commit ??
      report.context?.head ??
      null,
    challenge: finding.challenge ?? {
      state:
        finding.state === "AMBIGUOUS" || finding.labels?.includes("NEEDS-HUMAN")
          ? "AMBIGUOUS"
          : "VALID",
      reason:
        "Imported historical assertion; verify its evidence before closure.",
      kill_attempts: finding.kill_attempts ?? [],
    },
  };
}

export function collectPrior(
  repo,
  target,
  pr = null,
  before = Infinity,
  exclude = "",
) {
  repo = realpathSync(repo);
  const sources = records(repo).filter(({ path, report }) => {
    if (resolve(path) === resolve(exclude || "/__no_report__")) return false;
    if (
      !["change", "repo", "verification", "finding-verification"].includes(
        report.mode,
      )
    )
      return false;
    return matches(report, target, pr);
  });
  for (const { path, report } of sources) {
    if (!Number.isFinite(Date.parse(report.date)))
      throw new Error(
        `Missing/invalid date in ${path}; cannot order history safely`,
      );
  }
  sources.sort(
    (a, b) =>
      Date.parse(a.report.date) - Date.parse(b.report.date) ||
      a.path.localeCompare(b.path),
  );
  const ledger = new Map();
  const included = [];
  for (const source of sources) {
    const { report } = source;
    if (Date.parse(report.date) >= before) continue;
    included.push({ path: source.path, sha256: source.sha256 });
    for (const raw of report.findings ?? []) {
      const repoLens = target.startsWith("repo:") ? target.slice(5) : null;
      if (
        report.schema_version !== 2 &&
        repoLens &&
        repoLens !== "multi" &&
        raw.lenses?.length &&
        !raw.lenses.includes(repoLens)
      )
        continue;
      const finding =
        report.schema_version === 2 ? raw : legacyFinding(raw, report);
      const previous = ledger.get(finding.id);
      // A focused report can update only its named targets. Missing rows never close anything.
      if (
        report.mode === "verification" &&
        !report.scope?.finding_ids?.some(
          (id) => id === finding.id || finding.aliases?.includes(id),
        )
      )
        continue;
      for (const alias of finding.aliases ?? []) ledger.delete(alias);
      ledger.set(finding.id, {
        ...finding,
        first_seen: previous?.first_seen ?? finding.first_seen,
      });
    }
  }
  return {
    repository: repo,
    target,
    pr_number: pr,
    prior_reports: included,
    findings: [...ledger.values()],
  };
}

export function countsFor(findings, uncertain = false) {
  return Object.fromEntries(
    SEVERITIES.map((severity) => [
      severity,
      findings.filter(
        (f) =>
          active(f) &&
          f.severity === severity &&
          (f.challenge?.state === "AMBIGUOUS") === uncertain,
      ).length,
    ]),
  );
}

export function validateReport(
  report,
  prior = { findings: [], prior_reports: [] },
) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  check(
    report?.schema_version === 2,
    "schema_version must be 2 (legacy reports are history, not new approvals)",
  );
  check(isAbsolute(report?.repository ?? ""), "repository must be absolute");
  check(text(report?.target), "target is required");
  check(
    ["change", "repo", "verification"].includes(report?.mode),
    "mode must be change, repo, or verification",
  );
  check(utc(report?.date), "date must be ISO-8601 UTC ending in Z");
  check(
    strings(report?.lenses),
    "lenses must list the domains actually reviewed",
  );
  check(
    typeof report?.snapshot_consistent === "boolean",
    "snapshot_consistent is required",
  );
  check(
    report?.pr_number === null ||
      (Number.isInteger(report?.pr_number) && report.pr_number > 0),
    "pr_number must be a positive integer or null",
  );
  if (report?.mode === "repo")
    check(
      report.pr_number === null,
      "repository reviews require null pr_number",
    );
  const patch = DIGEST.test(report?.patch_sha256 ?? "");
  check(
    SHA.test(report?.head_sha ?? "") ||
      patch ||
      report?.snapshot_consistent === false,
    "pin head_sha or patch_sha256; unavailable revisions require an incomplete snapshot",
  );
  check(
    report?.mode === "repo" ||
      SHA.test(report?.base_sha ?? "") ||
      patch ||
      report?.snapshot_consistent === false,
    "pin base_sha for a change",
  );
  check(
    report?.head_sha === null || SHA.test(report?.head_sha ?? ""),
    "head_sha must be a full Git SHA or null",
  );
  check(
    report?.base_sha === null || SHA.test(report?.base_sha ?? ""),
    "base_sha must be a full Git SHA or null",
  );
  check(
    report?.patch_sha256 === null || patch,
    "patch_sha256 must be SHA-256 or null",
  );
  if (patch)
    check(isAbsolute(report.patch_path ?? ""), "patch_path must be absolute");
  check(
    Array.isArray(report?.findings),
    "findings must be an array containing the cumulative ledger",
  );
  check(
    Array.isArray(report?.coverage) && report.coverage.length > 0,
    "coverage must enumerate at least one behavior or an explicit uninspected scope",
  );
  check(
    Array.isArray(report?.prior_reports),
    "prior_reports must preserve the collector's source paths and digests",
  );
  const sources = (items) =>
    (items ?? []).map((s) => `${s.path}:${s.sha256}`).sort();
  check(
    JSON.stringify(sources(report?.prior_reports)) ===
      JSON.stringify(sources(prior.prior_reports)),
    "prior_reports differs from history; collect again and reconcile every source",
  );

  const findings = Array.isArray(report?.findings) ? report.findings : [];
  const represented = new Set();
  for (const f of findings) {
    const label = f.id ?? "<missing id>";
    check(text(f.id), "every finding needs a stable id");
    check(Array.isArray(f.aliases ?? []), `${label}: aliases must be an array`);
    for (const id of [f.id, ...(Array.isArray(f.aliases) ? f.aliases : [])]) {
      check(
        text(id) && !represented.has(id),
        `${label}: duplicate/invalid id or alias ${id}`,
      );
      represented.add(id);
    }
    if (f.aliases?.length)
      check(
        text(f.merge_reason),
        `${label}: merged legacy identities need merge_reason`,
      );
    for (const field of [
      "file",
      "title",
      "root_cause",
      "failure_condition",
      "evidence",
      "suggestion",
    ])
      check(text(f[field]), `${label}: preserve ${field}`);
    check(
      Number.isInteger(f.line) && f.line > 0,
      `${label}: line must be positive`,
    );
    check(SEVERITIES.includes(f.severity), `${label}: unknown severity`);
    check(STATUSES.includes(f.status), `${label}: unknown status`);
    if (f.status === "not_rechecked")
      check(
        STATUSES.includes(f.prior_status) && f.prior_status !== "not_rechecked",
        `${label}: prior_status must retain the last actual disposition`,
      );
    check(strings(f.lenses), `${label}: lenses required`);
    check(
      text(f.first_seen) && Number.isFinite(Date.parse(f.first_seen)),
      `${label}: first_seen required`,
    );
    check(
      ["VALID", "INVALID", "AMBIGUOUS"].includes(f.challenge?.state),
      `${label}: lossless challenge state required`,
    );
    check(
      strings(f.challenge?.kill_attempts),
      `${label}: cite actual kill attempts (or explicitly record inherited evidence not rechecked)`,
    );
    check(text(f.challenge?.reason), `${label}: challenge reason required`);
    if (f.challenge?.state === "AMBIGUOUS" && f.status !== "not_rechecked")
      check(
        text(f.challenge.next_check),
        `${label}: AMBIGUOUS requires a concrete next_check`,
      );
    if (f.status !== "not_rechecked")
      check(
        f.last_checked_sha === revision(report) && text(f.last_checked_sha),
        `${label}: last_checked_sha must identify this revision`,
      );
    if (active(f))
      check(
        f.challenge?.state !== "INVALID",
        `${label}: invalid candidates must be disproved, not active`,
      );
    if (["fixed_verified", "disproved"].includes(effectiveStatus(f))) {
      check(
        strings(f.closure?.evidence),
        `${label}: closure evidence required`,
      );
      if (effectiveStatus(f) === "fixed_verified")
        check(
          SHA.test(f.closure?.fix_commit ?? "") &&
            text(f.closure?.verification),
          `${label}: verified fix requires fix_commit and verification`,
        );
      else
        check(
          f.challenge?.state === "INVALID",
          `${label}: disproof must come from the challenger`,
        );
    }
    if (effectiveStatus(f) === "deferred") {
      check(
        !["P0", "P1"].includes(f.severity),
        `${label}: blocking findings cannot be deferred into approval`,
      );
      for (const key of ["reason", "owner", "ticket"])
        check(text(f.deferral?.[key]), `${label}: deferral.${key} required`);
    }
    if (f.labels?.includes("CONSENSUS"))
      check(
        strings(f.independent_evidence) &&
          new Set(f.independent_evidence).size >= 2,
        `${label}: lens labels alone are not independent consensus`,
      );
  }
  for (const old of prior.findings ?? []) {
    check(
      represented.has(old.id),
      `prior finding ${old.id} disappeared without a disposition`,
    );
    const current = findings.find(
      (f) => f.id === old.id || f.aliases?.includes(old.id),
    );
    if (!current) continue;
    check(
      Date.parse(current.first_seen) <= Date.parse(old.first_seen),
      `${old.id}: preserve first_seen across reviews`,
    );
    if (current.severity !== old.severity)
      check(
        text(current.severity_reason),
        `${old.id}: severity changes require severity_reason`,
      );
    if (current.status === "not_rechecked") {
      for (const field of [
        "file",
        "line",
        "title",
        "root_cause",
        "failure_condition",
        "evidence",
        "suggestion",
        "last_checked_sha",
      ]) {
        if (old[field] !== undefined)
          check(
            JSON.stringify(current[field]) === JSON.stringify(old[field]),
            `${old.id}: not_rechecked must preserve ${field}`,
          );
      }
      check(
        current.severity === old.severity &&
          current.challenge?.state === old.challenge?.state,
        `${old.id}: not_rechecked must retain severity and confidence`,
      );
      check(
        current.prior_status === effectiveStatus(old),
        `${old.id}: retain prior_status when not rechecked`,
      );
    }
  }
  for (const uncertain of [false, true]) {
    const key = uncertain ? "uncertain_counts" : "counts";
    check(
      SEVERITIES.every(
        (s) => report?.[key]?.[s] === countsFor(findings, uncertain)[s],
      ),
      `${key} must equal active ${uncertain ? "AMBIGUOUS" : "VALID"} findings`,
    );
  }

  const coverage = Array.isArray(report?.coverage) ? report.coverage : [];
  const coverageIds = new Set();
  for (const item of coverage) {
    check(
      text(item.id) && !coverageIds.has(item.id),
      "coverage ids must be unique and nonempty",
    );
    coverageIds.add(item.id);
    check(
      text(item.invariant) && typeof item.critical === "boolean",
      `${item.id}: coverage invariant and critical flag required`,
    );
    check(
      ["verified", "unresolved", "not_inspected", "not_applicable"].includes(
        item.status,
      ),
      `${item.id}: invalid coverage status`,
    );
    for (const key of ["entry_points", "writers", "consumers", "outcomes"])
      check(Array.isArray(item[key]), `${item.id}: ${key} inventory required`);
    if (["verified", "not_applicable"].includes(item.status))
      check(
        strings(item.evidence),
        `${item.id}: evidence required, not just 'reviewed'`,
      );
    else
      check(
        text(item.next_check),
        `${item.id}: unresolved coverage needs a concrete next_check`,
      );
    if (item.status === "not_applicable")
      check(text(item.reason), `${item.id}: not_applicable needs a reason`);
  }

  const criticalGap =
    report?.snapshot_consistent !== true ||
    coverage.some(
      (c) => c.critical && ["unresolved", "not_inspected"].includes(c.status),
    ) ||
    findings.some(
      (f) =>
        active(f) &&
        (f.status === "not_rechecked" ||
          (["P0", "P1"].includes(f.severity) &&
            f.challenge?.state === "AMBIGUOUS")),
    );
  const verdict = report?.verdict ?? {};
  if (report?.mode === "verification") {
    check(
      report.scope?.kind === "finding" && strings(report.scope?.finding_ids),
      "verification requires scope.kind=finding and finding_ids",
    );
    check(
      verdict.overall === null &&
        verdict.implementation === null &&
        verdict.solution_fit === null,
      "finding verification must not issue a whole-PR verdict",
    );
    const targets = new Set(report.scope?.finding_ids ?? []);
    for (const id of targets)
      check(
        represented.has(id) &&
          prior.findings?.some((f) => f.id === id || f.aliases?.includes(id)),
        `verification target ${id} must exist in prior history`,
      );
    for (const old of prior.findings ?? []) {
      if (targets.has(old.id) || old.aliases?.some((id) => targets.has(id)))
        continue;
      const carried = findings.find(
        (f) => f.id === old.id || f.aliases?.includes(old.id),
      );
      check(
        carried?.status === "not_rechecked",
        `${old.id}: verification cannot close unrelated history through aliases`,
      );
    }
    for (const f of findings) {
      const selected =
        targets.has(f.id) || f.aliases?.some((id) => targets.has(id));
      if (!selected)
        check(
          f.status === "not_rechecked",
          `${f.id}: unrelated findings must be not_rechecked in verification mode`,
        );
    }
  } else {
    check(
      report?.scope?.kind === "full",
      "full reviews require scope.kind=full (within the explicitly listed lenses)",
    );
    const valid = findings.filter(
      (f) => active(f) && f.challenge?.state === "VALID",
    );
    const p0 = valid.some((f) => f.severity === "P0");
    const p1 = valid.some((f) => f.severity === "P1");
    const expected =
      p0 || verdict.solution_fit === "WRONG-APPROACH"
        ? "DO-NOT-SHIP"
        : criticalGap
          ? "INCOMPLETE"
          : p1 || verdict.solution_fit === "QUESTIONABLE"
            ? "FIX-THEN-SHIP"
            : "SHIP";
    check(
      verdict.overall === expected,
      `overall must be ${expected}; scope/closure gates take precedence over zero new findings`,
    );
    check(
      ["CORRECT", "CORRECT-WITH-NITS", "DEFECTIVE", "UNDETERMINED"].includes(
        verdict.implementation,
      ),
      "invalid implementation verdict",
    );
    check(
      [
        "FITS",
        "QUESTIONABLE",
        "WRONG-APPROACH",
        "unknown-intent",
        null,
      ].includes(verdict.solution_fit),
      "invalid solution_fit verdict",
    );
    if (criticalGap && !p0)
      check(
        verdict.implementation === "UNDETERMINED" ||
          (p1 && verdict.implementation === "DEFECTIVE"),
        "incomplete review cannot claim implementation correctness",
      );
    if (p0 || p1)
      check(
        verdict.implementation === "DEFECTIVE",
        "confirmed P0/P1 requires DEFECTIVE",
      );
  }
  return errors;
}

export function reportHeading(report) {
  return report.mode === "verification"
    ? "# Finding verification — NO WHOLE-PR VERDICT"
    : `# Adversarial review — ${report.verdict.overall}`;
}

export function validateFile(path, checkSnapshot = true) {
  path = resolve(path);
  const report = readJSON(path);
  if (
    !isAbsolute(report.repository ?? "") ||
    dirname(realpathSync(path)) !==
      realpathSync(reportDirectory(report.repository))
  )
    throw new Error(
      "sidecar must belong to its declared repository's reports directory",
    );
  const prior = collectPrior(
    report.repository,
    report.target,
    prNumber(report),
    Date.parse(report.date),
    path,
  );
  const errors = validateReport(report, prior);
  const markdown = path.replace(/\.findings\.json$/, ".md");
  if (
    markdown === path ||
    !existsSync(markdown) ||
    readFileSync(markdown, "utf8").split(/\r?\n/)[0] !== reportHeading(report)
  )
    errors.push(
      "markdown must exist and start with the canonical scope-aware verdict heading",
    );
  if (checkSnapshot && report.snapshot_consistent) {
    if (report.patch_sha256) {
      if (
        !text(report.patch_path) ||
        !existsSync(report.patch_path) ||
        hash(readFileSync(report.patch_path)) !== report.patch_sha256
      )
        errors.push("patch no longer matches patch_sha256");
    } else {
      try {
        const git = (...args) =>
          execFileSync(
            "git",
            ["-c", "core.fsmonitor=false", "-C", report.repository, ...args],
            {
              encoding: "utf8",
              env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
              stdio: ["ignore", "pipe", "pipe"],
            },
          ).trim();
        if (git("rev-parse", "HEAD") !== report.head_sha)
          errors.push(
            "working tree HEAD differs from reviewed head_sha; reread the correct revision or mark snapshot inconsistent",
          );
        const changes = [
          git("diff", "--no-ext-diff", "--no-textconv", "--name-only", "HEAD"),
          git("ls-files", "--others", "--exclude-standard"),
        ]
          .join("\n")
          .split("\n");
        if (
          changes.some(
            (file) =>
              file && !file.startsWith(".gbencke/adversarial-review/reports/"),
          )
        )
          errors.push(
            "reviewed working tree has changes outside reports; snapshot is not consistent",
          );
        if (report.base_sha)
          git("cat-file", "-e", `${report.base_sha}^{commit}`);
      } catch {
        errors.push(
          "cannot verify pinned Git objects in the reviewed repository",
        );
      }
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return report;
}

// Never let a targeted or legacy report replace a full review. Group by scope,
// mode, target, and explicit lenses; parse timestamps rather than filenames.
export function selectReports(repo, all = false) {
  const groups = new Map();
  const ignored = [];
  for (const record of records(realpathSync(repo))) {
    const r = record.report;
    if (
      r.schema_version !== 2 ||
      r.scope?.kind !== "full" ||
      r.mode === "verification"
    ) {
      ignored.push({
        path: record.path,
        reason:
          "legacy or focused report; history only, never whole-scope approval",
      });
      continue;
    }
    const key = JSON.stringify([
      prNumber(r) == null ? r.target : `pr:${prNumber(r)}`,
      r.mode,
      [...(r.lenses ?? [])].sort(),
    ]);
    if (!Number.isFinite(Date.parse(r.date)))
      throw new Error(`Invalid report timestamp: ${record.path}`);
    const old = groups.get(key);
    if (!old || Date.parse(r.date) > Date.parse(old.report.date))
      groups.set(key, record);
  }
  const chosen = all
    ? records(realpathSync(repo)).filter(
        (r) =>
          r.report.schema_version === 2 &&
          r.report.scope?.kind === "full" &&
          r.report.mode !== "verification",
      )
    : [...groups.values()];
  const reports = [];
  const invalid = [];
  for (const { path } of chosen) {
    try {
      reports.push({ path, report: validateFile(path, false) });
    } catch (error) {
      invalid.push({ path, reason: error.message });
    }
  }
  return { reports, ignored, invalid };
}

export function guardReportMessage(message, expectedMode, expectedPr) {
  if (
    message.role !== "assistant" ||
    !Array.isArray(message.content) ||
    message.content.some((part) => part.type === "toolCall")
  )
    return null;
  const output = message.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trimEnd();
  const match = output.match(/(?:^|\n)REPORT: (.+\.md)$/);
  if (!match || !match[1].includes("/.gbencke/adversarial-review/reports/"))
    return null;
  const path = match[1].trim();
  try {
    const r = validateFile(path.replace(/\.md$/, ".findings.json"));
    if (expectedMode && r.mode !== expectedMode)
      throw new Error(
        `requested mode ${expectedMode} differs from reported mode ${r.mode}`,
      );
    if (expectedPr !== undefined && r.pr_number !== expectedPr)
      throw new Error(
        `requested PR ${expectedPr} differs from reported PR ${r.pr_number}`,
      );
    const heading =
      r.mode === "verification"
        ? "Finding verification only — no whole-PR verdict."
        : `${r.verdict.implementation} × ${r.verdict.solution_fit ?? "repo review"} → ${r.verdict.overall} (lenses: ${r.lenses.join(", ")})`;
    const lines = [
      heading,
      `Confirmed active: ${SEVERITIES.map((s) => `${s}: ${r.counts[s]}`).join(" · ")}`,
      `Uncertain active: ${SEVERITIES.map((s) => `${s}: ${r.uncertain_counts[s]}`).join(" · ")}`,
    ];
    for (const f of r.findings
      .filter((f) =>
        r.mode === "verification"
          ? r.scope.finding_ids.some(
              (id) => f.id === id || f.aliases?.includes(id),
            )
          : active(f),
      )
      .slice(0, 5))
      lines.push(`${f.id}: ${f.status} — ${f.title}`);
    lines.push(
      `Not rechecked: ${r.findings.filter((f) => f.status === "not_rechecked").length}`,
    );
    lines.push(`REPORT: ${path}`);
    return { ...message, content: [{ type: "text", text: lines.join("\n") }] };
  } catch (error) {
    return {
      ...message,
      content: [
        {
          type: "text",
          text: `Review report validation failed; no approval issued.\n${error.message}\nDraft: ${path}`,
        },
      ],
    };
  }
}

function main(args) {
  const [command, path, target, ...rest] = args;
  if (command === "validate" && path && rest.length === 0) {
    const report = validateFile(path);
    if (
      target &&
      (report.mode !== "repo" ||
        report.lenses.length !== 1 ||
        report.lenses[0] !== target)
    )
      throw new Error(
        `matrix expected a repository review under exactly lens ${target}`,
      );
    console.log(
      `VALID: ${report.mode === "verification" ? "finding-only; no whole-PR verdict" : report.verdict.overall}`,
    );
  } else if (command === "collect" && path && target && rest.length <= 1) {
    const pr = rest[0] == null ? null : Number(rest[0]);
    if (pr !== null && (!Number.isInteger(pr) || pr <= 0))
      throw new Error("PR number must be a positive integer");
    console.log(JSON.stringify(collectPrior(path, target, pr), null, 2));
  } else if (command === "select" && path && (!target || target === "--all")) {
    console.log(
      JSON.stringify(selectReports(path, target === "--all"), null, 2),
    );
  } else {
    throw new Error(
      "Usage: report-tools.mjs validate <sidecar> [matrix-lens] | collect <repo> <target> [pr-number] | select <repo> [--all]",
    );
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`review-reports: ${error.message}`);
    process.exitCode = 1;
  }
}
