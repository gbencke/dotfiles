# Report contract — schema version 2

A report describes evidence at one revision and one scope. Empty discovery output
never closes earlier findings. A finding verification never approves a whole PR.
This contract applies to `review-change`, `review-repo`, and the shared role packs.
All paths below are relative to the extension directory, not the reviewed repo.

## Commands (Node standard library only)

```bash
node <extension>/bin/report-tools.mjs collect <absolute-repo> <target> [pr-number]
node <extension>/bin/report-tools.mjs validate <absolute-sidecar.findings.json> [matrix-lens]
node <extension>/bin/report-tools.mjs select <absolute-repo> [--all]
```

`collect` reads matching historical sidecars, orders by their ISO timestamps, and
returns `{repository, target, pr_number, prior_reports, findings}`. Copy
`prior_reports` verbatim, including content hashes. Keep scratch output in `/tmp`.
For PR reviews keep the real head branch as `target` and supply `pr-number`; that
also matches older reports identified by PR URL. For branch reviews keep the
exact branch name. Patch targets are `patch:<sha256>`. Repository reviews use
`repo:<lens-slug>` so a security-only pass cannot replace a different lens's audit.
Relevant legacy repo findings are imported by their recorded lenses; unknown lens
membership is kept conservatively rather than dropped.

Legacy records lack reliable lifecycle IDs. The collector fingerprints file and
title, not line numbers or report-local `F1`. Similar wording is **not** automatically
merged: use `aliases` plus an evidence-backed `merge_reason`. Retractions in legacy
free text are evidence for a new explicit disposition, not automatic closure.
An older zero-count report never clears the ledger. Invalid JSON/date history is
a visible error; repair the history input explicitly, never ignore it for approval.

`validate` rereads history up to this report's timestamp. Missing sources, missing
findings, invalid counts, unsupported verdicts, and missing closure evidence fail
with exit 1. If another review arrived while this one was running, recollect and
reconcile before publication. Dates must be UTC; stamp final artifacts after
reconciliation. Do not backdate them or overwrite other runs.

It also checks the canonical Markdown heading, pinned Git HEAD, tracked/untracked
changes outside the reports directory, and base-object availability. Repository
fsmonitor/external-diff/textconv hooks and optional Git index writes are disabled
for these metadata checks. Patch reviews
check the original patch's SHA-256. It executes only read-only Git metadata commands,
never repository code. `snapshot_consistent: false` permits an honest INCOMPLETE
report when the checkout/revision cannot be verified. A full Git review uses a clean
matching checkout; do not silently read another branch's working-tree source.

An optional `matrix-lens` makes validation require repo mode and exactly that lens.
The launcher returns nonzero if any pairing fails, while retaining every manifest row.

`select` chooses the newest **full v2** report for each target/mode/lens set by UTC
time. Focused and legacy reports are returned separately as `ignored`, with reasons;
they cannot replace a full report. Invalid selected reports appear in `invalid`,
without falling back to an older approval. Full reports contain a cumulative ledger already.
Selection does not silently rewrite a full report using later focused verifications:
list those separately and require a reconciled full report before a new approval.
`--all` includes all full v2 snapshots as history, not one combined current defect count.

## Sidecar

```json
{
  "schema_version": 2,
  "repository": "/absolute/repo",
  "target": "feature/selection",
  "pr_number": 938,
  "mode": "change",
  "scope": { "kind": "full" },
  "date": "2026-09-16T01:00:00Z",
  "base_sha": "1111111111111111111111111111111111111111",
  "head_sha": "2222222222222222222222222222222222222222",
  "patch_sha256": null,
  "snapshot_consistent": true,
  "lenses": ["concurrency", "test-surface", "blast-radius"],
  "prior_reports": [],
  "coverage": [
    {
      "id": "selected-booking",
      "invariant": "Only the latest selected, eligible appointment is booked",
      "critical": true,
      "entry_points": ["card click", "calendar drag"],
      "writers": ["selection reducer", "proposal updater"],
      "consumers": ["confirmation handler", "booking mutation"],
      "outcomes": ["success", "rejection", "supersession", "cancel", "never settles"],
      "status": "verified",
      "evidence": ["src/booking.ts:42; test/booking.test.ts:80 asserts the final payload"]
    }
  ],
  "findings": [],
  "counts": { "P0": 0, "P1": 0, "P2": 0, "P3": 0 },
  "uncertain_counts": { "P0": 0, "P1": 0, "P2": 0, "P3": 0 },
  "verdict": { "implementation": "CORRECT", "solution_fit": "FITS", "overall": "SHIP" }
}
```

Use null for unavailable hashes; do not invent revisions. Patch reviews require
`patch_sha256` and absolute `patch_path`, with null Git SHAs. Non-Git directories
cannot claim a verified immutable snapshot; report INCOMPLETE. `base_sha` is null
for repo mode. `pr_number` is null when no PR is identified.

`full` means the whole declared change/repository **under the listed lenses**, not
proof of universal correctness. Explicit `--lenses` limits must remain visible.

### Cumulative finding row

`findings` includes open findings **and lifecycle records**, not just new defects:

```json
{
  "id": "selection-stale-write",
  "aliases": [],
  "severity": "P1",
  "lenses": ["concurrency"],
  "labels": ["CONFIRMED"],
  "file": "src/booking.ts",
  "line": 42,
  "title": "An old result restores the previous selection",
  "root_cause": "Two writers update the same selection without shared ownership",
  "failure_condition": "A starts; B commits; A settles and overwrites B",
  "evidence": "src/booking.ts:42 writes the captured appointment",
  "suggestion": "Coordinate writers and patch only fields this operation owns",
  "first_seen": "2026-09-15T12:00:00Z",
  "last_checked_sha": "2222222222222222222222222222222222222222",
  "status": "open",
  "challenge": {
    "state": "VALID",
    "kill_attempts": ["Checked src/card.ts:30; both writers reach the same record"],
    "reason": "No common ownership guard exists"
  }
}
```

Reuse IDs across runs and preserve the earliest `first_seen`. Severity changes
require `severity_reason`; not_rechecked rows cannot change severity, confidence,
failure condition, source evidence, or last-checked revision. New IDs describe a
root cause; never restart numbering each run. Preserve file, failure condition,
evidence, suggestion, and the complete challenge. `last_checked_sha` is this
report's full head SHA (or patch digest) for any freshly assessed disposition.

| Status | Required record |
|---|---|
| `open` | Current VALID or AMBIGUOUS challenge, with concrete citations/checks. |
| `fixed_verified` | `closure.evidence[]`, `closure.fix_commit` (full SHA), `closure.verification`; test/result or discriminating static evidence, not a commit subject alone. |
| `disproved` | INVALID challenge plus `closure.evidence[]` establishing why the original failure cannot occur. |
| `deferred` | P2/P3 only; `deferral.reason`, `deferral.owner`, `deferral.ticket`. Do not defer a blocker into approval. |
| `not_rechecked` | Preserve evidence, severity, confidence, and last-checked revision; add `prior_status` containing the last actual status, never another `not_rechecked`. |

When combining legacy identities, list them in `aliases`, explain `merge_reason`,
and keep their earliest first-seen date. Every prior ID must appear either as a
canonical ID or as an alias. A scope change or a missing row is not a disposition.
For inherited evidence not reread, say so in `challenge.kill_attempts`; never invent
an inspection. Preserve valid historic closures when carrying them forward.

Active means effective status `open`: a `not_rechecked` row uses `prior_status`.
Previously fixed/disproved/deferred rows do not become active merely because they
were not rechecked. `counts` includes active VALID findings; `uncertain_counts`
includes active AMBIGUOUS findings. Fresh AMBIGUOUS challenges require a concrete
`challenge.next_check`. List deferred and historical rows separately in Markdown. Do not present uncertainty as a demonstrated failure.

### Coverage statuses

- `verified`: cite source/consumer traces and discriminating tests or exact-head
  CI evidence. Static verification is allowed; state when tests were only read.
- `unresolved` / `not_inspected`: supply a concrete `next_check`.
- `not_applicable`: supply `reason` and evidence (for example, a proved mode gate).

Every row includes the entry-point/writer/consumer/outcome arrays; empty arrays
are appropriate only where genuinely inapplicable or not yet inspected. A critical
unresolved/uninspected row prevents SHIP. An empty coverage array is not a shortcut:
record an uninspected critical scope row if the budget ran out.

### Verdict gates, in order

1. Confirmed active P0 or WRONG-APPROACH → `DO-NOT-SHIP`.
2. Inconsistent snapshot, critical coverage gap, active `not_rechecked` finding,
   or active P0/P1 AMBIGUOUS question → `INCOMPLETE`.
3. Confirmed active P1 or QUESTIONABLE fit → `FIX-THEN-SHIP`.
4. Otherwise → `SHIP` **within the declared scope**, not “zero defects.”

Implementation values: CORRECT, CORRECT-WITH-NITS, DEFECTIVE, UNDETERMINED.
Confirmed active P0/P1 requires DEFECTIVE. Incomplete evidence uses UNDETERMINED
unless confirmed P1 already establishes DEFECTIVE. `solution_fit` is FITS,
QUESTIONABLE, WRONG-APPROACH, or unknown-intent (null in repo mode).
Repo reviews retain a per-lens health table; an incomplete lens is INCOMPLETE,
not HEALTHY. The same evidence gates govern their summary.

## Focused verification

`mode: "verification"`, `scope: {"kind":"finding","finding_ids":["stable-id"]}`.
IDs must exist in collected history. Verify only those IDs; other rows are carried
as `not_rechecked` with their last real disposition. Set **all three verdict fields
to null**. Report each targeted disposition and say “no whole-PR verdict.”
A newly noticed issue returns to a separate full discovery cycle, not a hidden
expansion of this verification's scope.

## Markdown and publication

First line must exactly match one of:

```text
# Adversarial review — SHIP
# Adversarial review — FIX-THEN-SHIP
# Adversarial review — DO-NOT-SHIP
# Adversarial review — INCOMPLETE
# Finding verification — NO WHOLE-PR VERDICT
```

Then include pinned scope/revision, dual verdict (full reviews only), confirmed
findings, verification questions, cumulative dispositions, coverage, blast radius,
and not-reviewed sections. State what the assertions actually verify, not just
how many tests exist. Describe safety **and** liveness where state crosses awaits.

Validate after writing both artifacts and before emitting `REPORT: `. Correct
validation errors by reconciling evidence, not deleting findings or marking skipped
work verified. The Pi message-end hook validates and replaces the final summary
from the sidecar; explicit command mode/PR identity is also checked. Invalid drafts
lose their `REPORT: ` success marker and approval.
Streaming text may already have appeared: this guards the finalized summary, not
an assertion that streaming output was never visible. The matrix launcher also
validates before accepting a child's report path. Neither mechanism executes
reviewed code or independently proves the truth of supplied evidence.
