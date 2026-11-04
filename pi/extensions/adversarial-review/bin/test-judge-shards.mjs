// node --test bin/test-judge-shards.mjs — sharded judge data path; no model runs.
import assert from "node:assert/strict";
import test from "node:test";
import { applyMerges, assemble, buildSidecar, checkShard, indexLines, numberEnvelopes, partition } from "./judge-shards.mjs";
import { validateReport } from "./report-tools.mjs";

const HEAD = "a".repeat(40);
const meta = { target: "repo:multi", date: "2026-10-29T15:00:00Z", head_sha: HEAD, base_sha: null, snapshot_consistent: true, lenses: ["tests", "chaos"] };
const finding = (id, file, extra = {}) => ({
  id,
  lens: "tests",
  severity: "P2",
  file,
  line: 3,
  title: `t-${id}`,
  root_cause: "rc",
  failure_condition: "fc",
  evidence: "ev",
  suggestion: "sg",
  ...extra,
});
const env = (f, state = "VALID", extra = {}) => ({
  finding: f,
  challenge: { state, kill_attempts: [`k-${f.id}-${f.lens}`], reason: "r", ...(state === "AMBIGUOUS" ? { next_check: "nc" } : {}), ...extra },
  disposition: { status: state === "INVALID" ? "disproved" : "open" },
});
const prior = (id, file, extra = {}) => ({
  ...finding(id, file),
  lenses: ["tests"],
  aliases: [],
  labels: ["CONFIRMED"],
  first_seen: "2026-10-01T00:00:00Z",
  last_checked_sha: "b".repeat(40),
  status: "open",
  challenge: { state: "VALID", kill_attempts: ["old"], reason: "old" },
  ...extra,
});
const coverage = [{ id: "c1", invariant: "i", critical: true, entry_points: [], writers: [], consumers: [], outcomes: [], status: "verified", evidence: ["a.ts:1"] }];
const numbered = (...lists) => numberEnvelopes(lists.map((envelopes, i) => ({ path: `/w/f${i}.json`, envelopes })));
const report = (findings, priorFindings) =>
  buildSidecar({ meta, mode: "repo", repository: "/repo", priorReports: [], findings, coverage, solutionFit: null });
const valid = (s, priorFindings) => assert.deepEqual(validateReport(s, { findings: priorFindings, prior_reports: [] }), []);

test("partition never splits an id, packs by file, and homes loose prior rows by file", () => {
  const envs = numbered([env(finding("x", "a.ts")), env(finding("y", "b.ts"))], [env(finding("x", "c.ts", { lens: "chaos" }))]);
  const priors = [prior("x", "zzz.ts"), prior("loose-b", "b.ts"), prior("orphan", "nowhere.ts")];
  const shards = partition(envs, priors, 1);
  const withX = shards.filter((s) => s.envelopes.some((e) => e.envelope.finding.id === "x"));
  assert.equal(withX.length, 1, "both x envelopes share one shard");
  assert.equal(withX[0].envelopes.length, 2);
  assert.ok(withX[0].priors.some((p) => p.id === "x"), "the prior row named by x travels with it");
  assert.equal(shards.length, 2, "a tiny budget gives one shard per main file");
  assert.ok(shards.find((s) => s.files.includes("b.ts")).priors.some((p) => p.id === "loose-b"));
  assert.ok(!shards.some((s) => s.priors.some((p) => p.id === "orphan")), "no envelope for its file: carried, not judged");
  assert.deepEqual(envs.map((e) => e.ref), ["E1", "E2", "E3"]);
});

test("checkShard rejects incomplete or inconsistent decisions", () => {
  const shard = { envelopes: numbered([env(finding("x", "a.ts")), env(finding("y", "a.ts"), "INVALID")]), priors: [prior("x", "a.ts")] };
  const good = [
    { id: "x", sources: ["E1", "prior:x"], base: "E1", status: "open", severity: "P2" },
    { id: "y", sources: ["E2"], base: "E2", status: "disproved", severity: "P2" },
  ];
  assert.doesNotThrow(() => checkShard(good, shard, ["other"]));
  const bad = (rows, pattern) => assert.throws(() => checkShard(rows, shard, ["other"]), pattern);
  bad([good[0]], /E2 is in no row/);
  bad([{ ...good[0], base: "prior:x" }, good[1]], /base must be one of its envelope refs/);
  bad([good[0], { ...good[1], status: "open" }], /open needs a VALID or AMBIGUOUS base/);
  bad([{ ...good[0], id: "other" }, good[1]], /another shard/);
  bad([{ ...good[0], sources: ["E1", "E2"] }], /needs merge_reason/);
  bad([{ ...good[0], severity: "P1" }, good[1]], /severity change needs severity_reason/);
  bad([good[0], good[1], { id: "z", sources: ["E1"], base: "E1", status: "open", severity: "P3" }], /already used/);
});

test("assemble copies envelopes losslessly, keeps prior identity, and carries untouched history", () => {
  const envs = numbered([
    env(finding("x", "a.ts", { experiment: "keep-me" })),
    env(finding("x2", "a.ts", { lens: "chaos" })),
    env(finding("y", "a.ts"), "INVALID"),
  ]);
  const priors = [prior("x", "a.ts", { severity: "P3" }), prior("old", "q.ts", { status: "disproved", challenge: { state: "INVALID", kill_attempts: ["k"], reason: "r" }, closure: { evidence: ["e"] } }), prior("stale", "q.ts")];
  const shards = [{ envelopes: envs, priors: priors.slice(0, 1) }];
  const rows = [
    [
      { id: "x", sources: ["E1", "E2"], base: "E1", status: "open", severity: "P2", severity_reason: "now reaches undo", merge_reason: "same root cause" },
      { id: "y", sources: ["E3"], base: "E3", status: "disproved", severity: "P2" },
    ],
  ];
  const findings = assemble(shards, rows, priors, meta);
  const x = findings.find((f) => f.id === "x");
  assert.equal(x.experiment, "keep-me", "extra finding fields survive");
  assert.equal(x.lens, undefined);
  assert.deepEqual(x.aliases, ["x2"]);
  assert.deepEqual(x.lenses.sort(), ["chaos", "tests"]);
  assert.equal(x.first_seen, "2026-10-01T00:00:00Z", "earliest first_seen kept");
  assert.deepEqual(x.challenge.kill_attempts, ["k-x-tests", "k-x2-chaos"]);
  assert.deepEqual(x.envelope_refs, ["/w/f0.json#0", "/w/f0.json#1"]);
  assert.deepEqual(findings.find((f) => f.id === "y").closure, { evidence: ["k-y-tests"] });
  const stale = findings.find((f) => f.id === "stale");
  assert.equal(stale.status, "not_rechecked");
  assert.equal(stale.prior_status, "open");
  assert.equal(findings.find((f) => f.id === "old").prior_status, "disproved");
  const s = report(findings);
  valid(s, priors);
  assert.equal(s.verdict.overall, "INCOMPLETE", "an active not_rechecked row blocks SHIP");
  assert.equal(s.verdict.implementation, "UNDETERMINED");
  assert.equal(s.counts.P2, 2, "x plus the carried, still-open stale row");
  assert.match(indexLines(findings)[0], /^x \| open \| P2 \| VALID \| /);
});

test("final merges fold a fresh row into a stale prior id and clear the gap", () => {
  const envs = numbered([env(finding("fresh", "a.ts", { severity: "P1" }))]);
  const priors = [prior("stale", "q.ts")];
  let findings = assemble([{ envelopes: envs, priors: [] }], [[{ id: "fresh", sources: ["E1"], base: "E1", status: "open", severity: "P1" }]], priors, meta);
  assert.throws(() => applyMerges(findings, [{ alias: "fresh", into: "nope", merge_reason: "m" }]), /both ids must exist/);
  findings = applyMerges(findings, [{ alias: "fresh", into: "stale", merge_reason: "same invariant" }]);
  assert.equal(findings.length, 1);
  const [row] = findings;
  assert.equal(row.id, "stale");
  assert.equal(row.status, "open", "fresh content wins over the not_rechecked copy");
  assert.deepEqual(row.aliases, ["fresh"]);
  assert.match(row.severity_reason, /Merged fresh \(P1\) with stale \(P2\)/);
  const s = report(findings);
  valid(s, priors);
  assert.equal(s.verdict.overall, "FIX-THEN-SHIP");
  assert.equal(s.verdict.implementation, "DEFECTIVE");
});

test("legacy aliases keep their merge_reason, and an id another row claims is never a second alias", () => {
  const envs = numbered([env(finding("legacy", "a.ts")), env(finding("shared", "a.ts")), env(finding("shared", "a.ts"), "INVALID")]);
  const priors = [prior("legacy", "a.ts", { aliases: ["old-name"], merge_reason: "old-name was the v1 id" }), prior("shared", "a.ts"), prior("gone", "a.ts", { status: "disproved", challenge: { state: "INVALID", kill_attempts: ["k"], reason: "r" }, closure: { evidence: ["e"] } })];
  const rows = [
    [
      { id: "legacy", sources: ["E1", "prior:legacy"], base: "E1", status: "open", severity: "P2" },
      { id: "shared", sources: ["E2", "prior:shared"], base: "E2", status: "open", severity: "P2" },
      { id: "gone", sources: ["E3", "prior:gone"], base: "E3", status: "disproved", severity: "P3" },
    ],
  ];
  const findings = assemble([{ envelopes: envs, priors }], rows, priors, meta);
  const by = Object.fromEntries(findings.map((f) => [f.id, f]));
  assert.equal(by.legacy.merge_reason, "old-name was the v1 id");
  assert.deepEqual(by.gone.aliases, [], "E3 reuses 'shared', which another row owns");
  assert.match(by.gone.severity_reason, /prior gone was P2/);
  valid(report(findings), priors);
});
