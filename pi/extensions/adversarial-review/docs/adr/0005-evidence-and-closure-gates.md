# Evidence and closure gates, not empty-report approval

The NGS-3808 review history exposed four problems: sibling writers were repaired
in separate cycles; reviews of the same commit returned different subsets of
findings; uncertain UI/test claims needed later disproof; and a focused clean
report could look like whole-PR clearance. Repeated issue counts were not a
reliable measure of progress.

## Decision

Keep the single-process propose → challenge → judge pipeline. Add:

- Immutable revision/scope metadata and UTC timestamps.
- A cumulative finding ledger with stable IDs, legacy aliases, and explicit
  open/fixed_verified/disproved/deferred/not_rechecked dispositions.
- Invariant coverage across entry points, shared-state writers, final consumers,
  safety, and liveness. Critical unknowns produce INCOMPLETE.
- Lossless challenge envelopes so the judge retains the original failure and evidence.
- Finding-only verification, which cannot issue a whole-PR verdict or replace a
  full report in consolidation.
- A Node standard-library validator at final-message and matrix-output boundaries.

Historical reports are never rewritten. Legacy findings remain assertions requiring
reconciliation; no heuristic silently decides they were fixed. The collector uses
file/title fingerprints and explicit aliases rather than pretending report-local
F1 identifiers are stable. It does not infer semantic equivalence from wording.

The validator checks records, counts, dispositions, source-history digests, scope,
and local revision consistency. It does not prove that a citation is true or that
all critical behaviors were identified. Finalized-message replacement also cannot
undo text already displayed during streaming. These limits remain explicit.

## Boundaries

Reviews still cannot execute reviewed code or call live services. Read-only Git,
PR/JIRA metadata and exact-head CI logs are evidence sources; extension-owned data
helpers do not cross the execution boundary. Any targeted runtime verification is
separate, explicitly authorized work, not an implicit privilege of review mode.

## Alternatives

More lenses/agents were not the first fix: they add cost without supplying missing
coverage or closure state. Repeating a full review until it emits nothing was
rejected as a release criterion. Role labels alone are not independent replication;
older false-positive figures cited by ADR 0001 do not establish this implementation's
recall or completeness.

## Checks

`node --test bin/test-report-tools.mjs` covers scope/closure/count gates, legacy
history, alias reconciliation, snapshot drift, and final-message validation.
The extension wiring test uses Node 22's TypeScript stripping. The matrix self-check
uses dry runs and a fake CLI; no model or application is executed.
