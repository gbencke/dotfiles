---
name: review-change
description: >
  Evidence-backed PR, branch, or patch review with cumulative finding reconciliation,
  invariant coverage, and sequential propose → challenge → judge phases. Supports
  focused verification without whole-PR approval. Validates reports before delivery.
argument-hint: "[pr-url|pr-number|branch|patch-file] [base] [--lenses a,b,c] [--verify finding-id,...]"
---

# review-change

Run inline, without subagents. Review only: do not apply fixes or run reviewed code.
Read `docs/report-contract.md` and the three `agents/*.md` role packs from the
extension directory. Schema v2 is required. Relative references in this skill are
relative to that directory. Node helpers belong to the extension, not the target.

## 0 — Resolve and freeze the input

Parse target, optional base, `--lenses`, and `--verify`. An empty target means the
current branch; report that choice. Unrecognized prose is **not** a branch or a
license to turn a focused allegation into a full review. Stop with usage instead.
An explicit `--verify` selects finding verification; otherwise scope is the full
change under the selected lenses.

Resolve the absolute Git root as `TARGET_DIR`. Record UTC time, repository, target,
PR number (or null), full `base_sha`/`head_sha`, and the input's intent:

- **PR URL/number:** use `gh pr view` for title, body, head/base names and OIDs.
  Freeze those OIDs; use their three-dot diff when available locally. A live
  `gh pr diff` is usable only if PR OIDs checked before/after it are unchanged.
  GitHub's actual base wins over a stale local `main`. If `gh` fails, stop.
- **Branch:** resolve its commit. Honor an explicit base. Without one, use the
  matching PR's actual base OID; if there is no PR, resolve hosted `main` through
  `gh api`. If freshness cannot be established, request an explicit base rather
  than silently treating local `main` as current. Record commit messages as intent
  and include matching PR title/body when available.
- **Patch:** read it, compute SHA-256, record absolute `patch_path`, use target
  `patch:<digest>` and null Git SHAs. Intent is unknown: solution-fit is
  correctness-only unless the user supplies requirements. State that context is
  limited to what can be matched to the patch, not an arbitrary checkout.

Save the diff in the system temp directory. Empty diff: say so and stop.
Use a clean checkout at the frozen head for source context. Read-only Git metadata
checks must confirm it matches; do not checkout, stash, reset, fetch, or modify
refs to make it match. If objects/context are unavailable or the working tree
changes, mark `snapshot_consistent: false` and deliver INCOMPLETE, not approval.
Do not mix current working-tree source with a different reviewed revision.

### Requirements

With JIRA credentials, extract ticket keys from the branch, PR, and commit subjects;
fetch API v2 summary/description/status/type/parent. Never print credentials.
Prioritize the primary story and linked implementation spec; separate inherited
cross-repository requirements from work owned by this PR. A PR number/issue text
is not evidence that a requirement has shipped.

No credentials/no key/fetch failure: record the limitation without stopping.
Exact-head existing CI logs may be read with `gh` to settle test claims. Do not use
old PR-description pass counts or coverage from another SHA as current evidence.
No repository tests/builds or live service/cloud calls are allowed in this skill.

## 1 — Load the cumulative ledger

Before discovery, collect matching history:

```bash
node <extension>/bin/report-tools.mjs collect <TARGET_DIR> <target> [pr-number] > /tmp/<unique>-prior.json
```

Read the resulting ledger, source paths, and relevant prior evidence. Preserve the
collector's `prior_reports` digests. Every known ID must survive, either directly
or as an evidence-backed alias. Do not restart F1 numbering; reuse stable IDs.
Legacy IDs are supplied by the collector. Reconcile wording variants explicitly,
not by guessing that findings in the same file are identical.

Assign each prior issue one of: open, fixed_verified, disproved, deferred,
not_rechecked. Use the closure requirements in `docs/report-contract.md`.
Missing findings are **not** fixed findings. A clean recent report cannot erase
older open concerns. Preserve first-seen date, confidence, severity, and evidence
when a finding is not rechecked. Separate severity from certainty.

For `--verify id,...`, resolve IDs against this ledger (accept a legacy report-local
ID only when the user identifies its source report). Verify only those findings;
carry every other finding as not_rechecked with its prior disposition. No overall
implementation/solution-fit/SHIP verdict is allowed in verification mode.

## 2 — Mechanical impact and behavior coverage

Extract changed exported symbols, routes, flags, data contracts, and action names.
Build the reverse importer/caller map using the repo's indexed analysis or ast-grep
(fallback grep). Record test references separately. Restrict results to TARGET_DIR;
parent-workspace/sibling-repo hits and stale excerpts are not trustworthy coverage.
Record gaps; do not infer no callers or no tests from missing graph results.

Then build a compact invariant/behavior matrix BEFORE proposing fixes:

- Entry point and reachable mode/flag/permission combinations.
- Shared mutable state, **all writers**, and the final consumer/business outcome.
- Success, rejection, cancellation, supersession, replacement, unmount, and
  never-settling work where relevant. Check both safety and liveness.
- Downstream effects: payload sent, state committed, user-visible result, persisted
  operation. Do not stop at an intermediate request if a later callback books.
- Test/assertion or exact-head CI evidence that discriminates the behavior.

For each row record criticality and verified / unresolved / not_inspected /
not_applicable, with evidence or a concrete next check. Do not enumerate impossible
Cartesian combinations; prove render/caller eligibility before claiming a UI race.
An inspected hunk or a listed test name does not by itself verify a behavior.

All diff sections remain in scope. For large changes, group into coherent behavior
slices and explicitly inventory what each slice covers. If the budget is too small,
mark the remaining critical rows uninspected; do not redefine the change as reviewed.

## 3 — Select lenses and discover, then challenge

Read every `lenses/*/lens.md` plus the repo overlay; append same-named overlay rules.
Apply all matched lenses. `test-surface` and `blast-radius` always apply to change
reviews; language lenses match changed files only. `--lenses` explicitly overrides
the set. Never prompt for a lens picker. State the selected lenses and scope.
`LENS_SLUG` is the sole lens name or `multi`.

Process lenses sequentially, over the full diff and the behavior slices:

1. **Propose:** adopt `agents/reviewer.md`. Reuse prior IDs; group by root cause.
   Finding a stale write in one handler requires checking its sibling writers,
   not prescribing only a patch to the cited line. Include failure condition,
   reachability, evidence, final outcome, and a discriminating regression.
2. **Challenge:** adopt `agents/challenger.md`. Attempt real disproof. Keep the
   complete `{finding, challenge, disposition}` envelope; never discard the
   original evidence/failure condition while retaining only a title and verdict.
3. Persist only these lossless envelopes and coverage/ledger updates between slices.
   Source excerpts need not be carried into every later lens.

Do not introduce new findings while challenging or judging. Queue uncovered sibling
paths/new concerns for a separate discovery phase before judgment. Missing reachable
source or inspectable CI is an evidence-gathering task, not a runtime uncertainty.
Return to discovery once for queued gaps; if still unresolved or over budget, mark
coverage incomplete rather than looping indefinitely or inventing a conclusion.

Collect the root-cause groups before recommending repairs. For each, cover all
relevant writers and require tests that would fail if the ownership/field guard,
error propagation, or cancellation release were removed. Do not execute mutation
experiments here; identify the exact check the repair/verification phase must run.

## 4 — Judge and reconcile

Judge only challenged evidence, using `agents/judge.md` and the v2 contract.
Deduplicate current findings without losing legacy aliases or prior dispositions.
Drop INVALID from active defects but retain disproof/closure in the ledger.
Do not count AMBIGUOUS questions as confirmed failures. Lens agreement is not
independent verification; CONSENSUS needs separate supporting evidence.

Apply gates in order: confirmed P0/wrong approach → DO-NOT-SHIP; missing critical
coverage, snapshot drift, unrechecked active history, or high-risk uncertainty →
INCOMPLETE; confirmed P1/questionable fit → FIX-THEN-SHIP; otherwise scoped SHIP.
Unknown-intent patches remain correctness-only. No “zero defects” claim.

A focused verification instead reports the targeted finding dispositions and sets
all three overall verdict fields to null. Other issues remain explicitly not
rechecked; it cannot supersede the full review's approval status.

## 5 — Validate and deliver

Recheck the pinned source/PR OIDs (or patch digest) before publication. Recollect
history if another report arrived; reconcile it, then stamp UTC publication time.
Write only your two artifacts, exclusively, under:

```text
<TARGET_DIR>/.gbencke/adversarial-review/reports/<UTCstamp>-<target>-<scope>-<LENS_SLUG>.md
<TARGET_DIR>/.gbencke/adversarial-review/reports/<same>.findings.json
```

`scope` is `full` or `verify`. Never overwrite/prune someone else's artifacts.
The first Markdown line and complete v2 sidecar must follow `docs/report-contract.md`.
Include confirmed findings, verification questions, prior dispositions, coverage,
blast radius, and not-reviewed limitations. Fixed claims cite evidence, not just
commit subjects or presence of tests.

Run the extension's validator (not reviewed code):

```bash
node <extension>/bin/report-tools.mjs validate <absolute-sidecar>
```

Fix validation errors by restoring missing evidence/history or reporting INCOMPLETE.
Never remove a prior finding or relabel skipped work to get a green result. Only
validated artifacts receive a final `REPORT: ` line. The extension also validates
the finalized message; the matrix runner independently checks the artifact.

Chat: scoped verdict (none for verification), confirmed/uncertain counts, top five
findings or targeted dispositions, incomplete coverage if any, and the report path.
Last line: `REPORT: <absolute-markdown-path>`.

## Hard boundaries

No subagents; no source changes; no repository code/tests/builds; no live services.
Read-only Git/gh/JIRA input gathering and the extension's data-only helpers are
allowed. Scratch belongs in system temp. Keep phases honest and sources pinned.
The release criterion is verified closure within scope, not an empty newest report.
