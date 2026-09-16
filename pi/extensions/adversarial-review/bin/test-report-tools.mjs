import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  collectPrior,
  countsFor,
  guardReportMessage,
  reportHeading,
  selectReports,
  validateFile,
  validateReport,
} from "./report-tools.mjs";

const SHA = "a".repeat(40);
const issue = (changes = {}) => ({
  id: "selection-stale-write",
  severity: "P1",
  status: "open",
  lenses: ["concurrency"],
  labels: ["CONFIRMED"],
  file: "src/booking.ts",
  line: 12,
  title: "Old result overwrites selection",
  root_cause: "Shared selection has uncoordinated writers",
  failure_condition: "B commits before A settles; A restores the old selection",
  evidence: "src/booking.ts:12 writes a captured snapshot",
  suggestion: "Patch owned fields and reject obsolete results",
  first_seen: "2026-01-01T00:00:00Z",
  last_checked_sha: SHA,
  challenge: {
    state: "VALID",
    kill_attempts: ["Checked caller at src/card.ts:30; no ordering guard"],
    reason: "Both writers reach the same record",
  },
  ...changes,
});
const report = (changes = {}) => ({
  schema_version: 2,
  repository: "/tmp/example-repo",
  target: "feature/selection",
  mode: "change",
  scope: { kind: "full" },
  date: "2026-01-03T00:00:00Z",
  head_sha: SHA,
  base_sha: SHA,
  patch_sha256: null,
  pr_number: 938,
  snapshot_consistent: true,
  lenses: ["concurrency"],
  prior_reports: [],
  findings: [],
  counts: countsFor([]),
  uncertain_counts: countsFor([], true),
  coverage: [
    {
      id: "booking",
      invariant: "Latest selection is booked",
      critical: true,
      entry_points: ["card click"],
      writers: ["card", "calendar"],
      consumers: ["booking"],
      outcomes: ["success", "failure", "supersession"],
      status: "verified",
      evidence: [
        "src/booking.ts:12; tests/booking.test.ts:25 asserts final payload",
      ],
    },
  ],
  verdict: { implementation: "CORRECT", solution_fit: "FITS", overall: "SHIP" },
  ...changes,
});
function withFindings(findings, changes = {}) {
  return report({
    findings,
    counts: countsFor(findings),
    uncertain_counts: countsFor(findings, true),
    verdict: {
      implementation: "DEFECTIVE",
      solution_fit: "FITS",
      overall: "FIX-THEN-SHIP",
    },
    ...changes,
  });
}
const rejects = (value, fragment, prior) =>
  assert.ok(
    validateReport(value, prior).some((e) => e.includes(fragment)),
    JSON.stringify(validateReport(value, prior)),
  );

// Every former clean-report failure has a deterministic guard here.
test("a complete empty review is valid, without claiming zero defects", () =>
  assert.deepEqual(validateReport(report()), []));
test("active confirmed and uncertain counts are distinct", () => {
  const uncertain = issue({
    id: "runtime-order",
    challenge: {
      ...issue().challenge,
      state: "AMBIGUOUS",
      next_check:
        "Inspect exact-head CI for the deferred booking-order regression",
    },
  });
  const value = withFindings([issue(), uncertain]);
  value.verdict.overall = "INCOMPLETE";
  assert.deepEqual(validateReport(value), []);
  assert.deepEqual([value.counts.P1, value.uncertain_counts.P1], [1, 1]);
});
test("an active P1 cannot receive SHIP", () =>
  rejects(
    withFindings([issue()], { verdict: report().verdict }),
    "overall must be FIX-THEN-SHIP",
  ));
test("counts cannot hide an active finding", () =>
  rejects(
    withFindings([issue()], { counts: countsFor([]) }),
    "counts must equal",
  ));
test("missing critical coverage requires INCOMPLETE", () => {
  const value = report();
  value.coverage[0] = {
    ...value.coverage[0],
    status: "not_inspected",
    next_check: "Read final booking consumer",
  };
  rejects(value, "overall must be INCOMPLETE");
  value.verdict = {
    implementation: "UNDETERMINED",
    solution_fit: "FITS",
    overall: "INCOMPLETE",
  };
  assert.deepEqual(validateReport(value), []);
});
test("a coverage label without evidence does not pass", () => {
  const value = report();
  value.coverage[0].evidence = [];
  rejects(value, "evidence required");
});
test("not-applicable coverage needs a reason", () => {
  const value = report();
  value.coverage[0].status = "not_applicable";
  rejects(value, "needs a reason");
});
test("snapshot drift cannot yield approval", () =>
  rejects(
    report({ snapshot_consistent: false }),
    "overall must be INCOMPLETE",
  ));
test("new reports must pin full SHAs and UTC timestamps", () => {
  rejects(report({ head_sha: "abc123" }), "full Git SHA");
  rejects(report({ date: "2026-01-03T00:00:00-03:00" }), "UTC");
});
test("dropped prior findings invalidate even an empty report", () =>
  rejects(report(), "disappeared", { findings: [issue()], prior_reports: [] }));
test("duplicated stable IDs are rejected", () =>
  rejects(withFindings([issue(), issue()]), "duplicate"));
test("aliases reconcile wording changes without dropping the original ID", () => {
  const previous = issue({ id: "legacy-other-wording" });
  const current = issue({
    aliases: [previous.id],
    merge_reason: "Same writer, state field, and interleaving",
  });
  assert.deepEqual(
    validateReport(withFindings([current]), {
      findings: [previous],
      prior_reports: [],
    }),
    [],
  );
});
test("lossy challenger output is rejected", () =>
  rejects(
    withFindings([
      {
        id: "old",
        file: "a",
        line: 1,
        title: "x",
        challenge: issue().challenge,
      },
    ]),
    "preserve failure_condition",
  ));
test("fix closure needs commit and verification evidence", () =>
  rejects(
    withFindings([issue({ status: "fixed_verified" })]),
    "verified fix requires",
  ));
test("evidence-backed fixed finding leaves active counts", () => {
  const fixed = issue({
    status: "fixed_verified",
    closure: {
      evidence: ["Regression fails before fix and passes after"],
      fix_commit: SHA,
      verification: "CI run 123 at pinned head; final booking payload asserted",
    },
  });
  assert.deepEqual(
    validateReport(report({ findings: [fixed] }), {
      findings: [issue()],
      prior_reports: [],
    }),
    [],
  );
});
test("disproof must come from challenge, not judge", () =>
  rejects(
    report({
      findings: [
        issue({
          status: "disproved",
          closure: { evidence: ["Not reachable"] },
        }),
      ],
    }),
    "disproof must come",
  ));
test("deferral needs an owner, ticket and reason", () =>
  rejects(
    report({ findings: [issue({ severity: "P2", status: "deferred" })] }),
    "deferral.owner",
  ));
test("consensus needs independent evidence, not multiple lens names", () =>
  rejects(
    withFindings([
      issue({ labels: ["CONSENSUS"], lenses: ["reactjs", "concurrency"] }),
    ]),
    "independent consensus",
  ));
test("not-rechecked preserves severity and confidence", () => {
  const carried = issue({
    status: "not_rechecked",
    prior_status: "open",
    severity: "P3",
  });
  rejects(withFindings([carried]), "retain severity", {
    findings: [issue()],
    prior_reports: [],
  });
});
test("a verification report cannot approve the PR", () => {
  const value = withFindings([issue()], {
    mode: "verification",
    scope: { kind: "finding", finding_ids: [issue().id] },
  });
  rejects(value, "must not issue a whole-PR verdict", {
    findings: [issue()],
    prior_reports: [],
  });
  value.verdict = { implementation: null, solution_fit: null, overall: null };
  assert.deepEqual(
    validateReport(value, { findings: [issue()], prior_reports: [] }),
    [],
  );
});
test("verification cannot close unrelated findings", () => {
  const other = issue({
    id: "other",
    status: "disproved",
    challenge: { ...issue().challenge, state: "INVALID" },
    closure: { evidence: ["Caller guard"] },
  });
  const value = report({
    mode: "verification",
    scope: { kind: "finding", finding_ids: [issue().id] },
    findings: [issue(), other],
    counts: countsFor([issue()]),
    verdict: { implementation: null, solution_fit: null, overall: null },
  });
  rejects(value, "unrelated findings", {
    findings: [
      issue(),
      { ...other, status: "open", challenge: issue().challenge },
    ],
    prior_reports: [],
  });
});
test("carrying a previously closed finding does not reopen it", () => {
  const old = issue({
    status: "disproved",
    challenge: { ...issue().challenge, state: "INVALID" },
    closure: { evidence: ["Unreachable mode"] },
  });
  const carried = {
    ...old,
    status: "not_rechecked",
    prior_status: "disproved",
  };
  assert.deepEqual(
    validateReport(report({ findings: [carried] }), {
      findings: [old],
      prior_reports: [],
    }),
    [],
  );
});

function repository() {
  const repo = mkdtempSync(join(tmpdir(), "review-reports-test-"));
  const directory = join(repo, ".gbencke/adversarial-review/reports");
  mkdirSync(directory, { recursive: true });
  const save = (name, value) => {
    const path = join(directory, `${name}.findings.json`);
    writeFileSync(path, JSON.stringify(value));
    writeFileSync(
      path.replace(".findings.json", ".md"),
      (value.schema_version === 2 ? reportHeading(value) : "# Legacy report") +
        "\n",
    );
    return path;
  };
  return {
    repo,
    save,
    cleanup: () => rmSync(repo, { recursive: true, force: true }),
  };
}

test("history preserves old issues when a later legacy review reports zero", () => {
  const f = repository();
  try {
    f.save("older", {
      target: "branch",
      mode: "change",
      date: "2026-01-01T00:00:00Z",
      findings: [issue({ id: "F1" })],
    });
    f.save("newer", {
      target: "branch",
      mode: "change",
      date: "2026-01-02T00:00:00Z",
      findings: [],
    });
    const history = collectPrior(f.repo, "branch");
    assert.equal(history.findings.length, 1);
    assert.match(history.findings[0].id, /^legacy-/);
  } finally {
    f.cleanup();
  }
});
test("history orders by timestamps, not filenames; unrelated PRs do not mix", () => {
  const f = repository();
  try {
    f.save(
      "zzz-first",
      report({
        repository: f.repo,
        date: "2026-01-01T00:00:00Z",
        findings: [issue()],
      }),
    );
    f.save(
      "aaa-last",
      report({
        repository: f.repo,
        date: "2026-01-02T00:00:00Z",
        findings: [issue({ severity: "P2" })],
      }),
    );
    f.save(
      "other-pr",
      report({
        repository: f.repo,
        pr_number: 999,
        date: "2026-01-03T00:00:00Z",
        findings: [issue({ severity: "P0" })],
      }),
    );
    assert.equal(
      collectPrior(f.repo, "feature/selection", 938).findings[0].severity,
      "P2",
    );
  } finally {
    f.cleanup();
  }
});
test("a later verification does not replace a full review in consolidation", () => {
  const f = repository();
  try {
    const full = report({ repository: f.repo });
    f.save("full", full);
    f.save("focused", {
      ...full,
      mode: "verification",
      scope: { kind: "finding", finding_ids: ["x"] },
      date: "2026-01-04T00:00:00Z",
      verdict: { implementation: null, solution_fit: null, overall: null },
    });
    const selected = selectReports(f.repo);
    assert.equal(selected.reports.length, 1);
    assert.match(selected.reports[0].path, /full\.findings/);
    assert.equal(selected.ignored.length, 1);
  } finally {
    f.cleanup();
  }
});
test("malformed history fails visibly rather than silently clearing the ledger", () => {
  const f = repository();
  try {
    writeFileSync(
      join(f.repo, ".gbencke/adversarial-review/reports/bad.findings.json"),
      "{",
    );
    assert.throws(
      () => collectPrior(f.repo, "branch"),
      /Cannot parse prior report/,
    );
  } finally {
    f.cleanup();
  }
});
test("validator checks Git snapshot and canonical markdown; message guard removes false approval", () => {
  const f = repository();
  try {
    const git = (...args) =>
      execFileSync("git", ["-C", f.repo, ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    git("init");
    writeFileSync(join(f.repo, "code.txt"), "original\n");
    git("add", "code.txt");
    git(
      "-c",
      "user.name=Review Test",
      "-c",
      "user.email=review@example.test",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=/dev/null",
      "commit",
      "-m",
      "fixture",
    );
    const head = git("rev-parse", "HEAD");
    const hook = join(f.repo, ".git", "metadata-hook.sh");
    const marker = join(f.repo, ".git", "metadata-hook-ran");
    writeFileSync(hook, `#!/bin/sh\n: > ${JSON.stringify(marker)}\n`);
    chmodSync(hook, 0o700);
    git("config", "core.fsmonitor", hook);
    git("config", "diff.external", hook);
    const path = f.save(
      "full",
      report({ repository: f.repo, head_sha: head, base_sha: head }),
    );
    assert.equal(validateFile(path).verdict.overall, "SHIP");
    const message = {
      role: "assistant",
      content: [
        {
          type: "text",
          text: `SHIP\nREPORT: ${path.replace(".findings.json", ".md")}`,
        },
      ],
    };
    assert.match(
      guardReportMessage(message).content[0].text,
      /Confirmed active/,
    );
    assert.match(
      guardReportMessage(message, "verification").content[0].text,
      /requested mode verification/,
    );
    assert.match(
      guardReportMessage(message, "change", 999).content[0].text,
      /requested PR 999/,
    );
    const repoPath = f.save(
      "repo-review",
      report({
        repository: f.repo,
        target: "repo:concurrency",
        mode: "repo",
        pr_number: null,
        head_sha: head,
        base_sha: null,
        verdict: {
          implementation: "CORRECT",
          solution_fit: null,
          overall: "SHIP",
        },
      }),
    );
    const cli = new URL("./report-tools.mjs", import.meta.url).pathname;
    assert.match(
      execFileSync(
        process.execPath,
        [cli, "validate", repoPath, "concurrency"],
        { encoding: "utf8" },
      ),
      /VALID: SHIP/,
    );
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          [cli, "validate", repoPath, "security"],
          { stdio: "pipe" },
        ),
      /Command failed/,
    );
    writeFileSync(join(f.repo, "code.txt"), "changed\n");
    assert.throws(() => validateFile(path), /working tree has changes/);
    assert.doesNotMatch(
      guardReportMessage(message).content[0].text,
      /^REPORT:/m,
    );
    assert.match(
      guardReportMessage(message).content[0].text,
      /no approval issued/,
    );
    assert.equal(
      existsSync(marker),
      false,
      "validation must not execute repository-configured metadata hooks",
    );
  } finally {
    f.cleanup();
  }
});
test("message guard ignores other tools and user messages", () => {
  assert.equal(
    guardReportMessage({
      role: "user",
      content: [{ type: "text", text: "REPORT: /tmp/a.md" }],
    }),
    null,
  );
  assert.equal(
    guardReportMessage({
      role: "assistant",
      content: [{ type: "text", text: "REPORT: /tmp/a.md" }],
    }),
    null,
  );
});

test("blocking findings cannot be hidden by deferral", () =>
  rejects(
    report({
      findings: [
        issue({
          status: "deferred",
          deferral: { reason: "later", owner: "team", ticket: "BUG-1" },
        }),
      ],
    }),
    "blocking findings cannot be deferred",
  ));
test("unknown verification IDs are rejected", () => {
  const value = report({
    mode: "verification",
    scope: { kind: "finding", finding_ids: ["invented"] },
    verdict: { implementation: null, solution_fit: null, overall: null },
  });
  rejects(value, "must exist in prior history");
});
test("missing prior source hashes cannot make history disappear", () =>
  rejects(report(), "differs from history", {
    findings: [],
    prior_reports: [{ path: "/tmp/prior.json", sha256: "b".repeat(64) }],
  }));
test("legacy report-local F1 labels do not merge unrelated defects", () => {
  const f = repository();
  try {
    f.save("one", {
      mode: "change",
      target: "branch",
      date: "2026-01-01T00:00:00Z",
      findings: [issue({ id: "F1" })],
    });
    f.save("two", {
      mode: "change",
      target: "branch",
      date: "2026-01-02T00:00:00Z",
      findings: [issue({ id: "F1", file: "src/other.ts" })],
    });
    assert.equal(collectPrior(f.repo, "branch").findings.length, 2);
  } finally {
    f.cleanup();
  }
});
test("repository scopes import relevant legacy issues without mixing new lens scopes", () => {
  const f = repository();
  try {
    f.save("legacy", {
      mode: "repo",
      target: f.repo,
      date: "2026-01-01T00:00:00Z",
      findings: [
        issue(),
        issue({ id: "F2", lenses: ["security"], file: "src/auth.ts" }),
      ],
    });
    assert.equal(collectPrior(f.repo, "repo:concurrency").findings.length, 1);
    assert.equal(collectPrior(f.repo, "repo:multi").findings.length, 2);
  } finally {
    f.cleanup();
  }
});
test("newest invalid full report is visible and cannot fall back to old approval", () => {
  const f = repository();
  try {
    f.save("old", report({ repository: f.repo }));
    f.save(
      "new",
      report({
        repository: f.repo,
        date: "2026-01-04T00:00:00Z",
        findings: [issue()],
      }),
    );
    const selected = selectReports(f.repo);
    assert.equal(selected.reports.length, 0);
    assert.equal(selected.invalid.length, 1);
  } finally {
    f.cleanup();
  }
});
test("tool-call messages are never replaced by the summary guard", () =>
  assert.equal(
    guardReportMessage({
      role: "assistant",
      content: [
        {
          type: "text",
          text: "REPORT: /tmp/.gbencke/adversarial-review/reports/a.md",
        },
        { type: "toolCall", name: "write" },
      ],
    }),
    null,
  ));
test("verification aliases cannot close an unrelated prior issue", () => {
  const other = issue({ id: "other" });
  const merged = issue({
    aliases: ["other"],
    merge_reason: "claimed duplicate",
    status: "disproved",
    closure: { evidence: ["control unreachable"] },
    challenge: { ...issue().challenge, state: "INVALID" },
  });
  const value = report({
    mode: "verification",
    scope: { kind: "finding", finding_ids: [issue().id] },
    findings: [merged],
    verdict: { implementation: null, solution_fit: null, overall: null },
  });
  rejects(value, "cannot close unrelated history", {
    findings: [issue(), other],
    prior_reports: [],
  });
});
test("carried findings cannot silently change their failure condition", () => {
  const carried = issue({
    status: "not_rechecked",
    prior_status: "open",
    failure_condition: "A different easier condition",
  });
  rejects(withFindings([carried]), "preserve failure_condition", {
    findings: [issue()],
    prior_reports: [],
  });
});
test("severity adjustments must be explained", () =>
  rejects(withFindings([issue({ severity: "P2" })]), "severity_reason", {
    findings: [issue()],
    prior_reports: [],
  }));
test("patch validation uses the original digest and rejects changed input", async () => {
  const { createHash } = await import("node:crypto");
  const f = repository();
  try {
    const patch = join(f.repo, "fix.patch");
    writeFileSync(patch, "patch input");
    const digest = createHash("sha256").update("patch input").digest("hex");
    const path = f.save(
      "patch-review",
      report({
        repository: f.repo,
        target: `patch:${digest}`,
        pr_number: null,
        head_sha: null,
        base_sha: null,
        patch_sha256: digest,
        patch_path: patch,
      }),
    );
    assert.equal(validateFile(path).verdict.overall, "SHIP");
    writeFileSync(patch, "different patch");
    assert.throws(() => validateFile(path), /patch no longer matches/);
  } finally {
    f.cleanup();
  }
});
test("fresh uncertain findings require a specific next verification check", () =>
  rejects(
    withFindings([
      issue({ challenge: { ...issue().challenge, state: "AMBIGUOUS" } }),
    ]),
    "AMBIGUOUS requires a concrete next_check",
  ));
