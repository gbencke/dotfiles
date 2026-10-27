# Architecture

## Pipeline

```text
freeze revision + collect prior ledger
  → map invariant coverage and callers
  → run-lenses.sh: one slot per lens, one shared queue of (lens, chunk) tasks
      → per task: run-phase.mjs pair = propose → challenge
      (each a fresh pi -p child; lossless JSON records + manifest.tsv in $WORK)
  → gather missing evidence / record incomplete coverage
  → run-phase.mjs judge (child returns sidecar + prose notes as JSON)
  → launcher renders markdown, writes both exclusively → validate → REPORT
  → orchestrator: finalized scoped summary

/review-consolidate
  → run-matrix.sh (one process per repo/lens)
  → validate each child output
  → consolidate full reports by target, revision and lens set
```

The skill's process orchestrates; each phase step is a separate, locked-down
`pi -p` child built from a per-task context pack. All (lens, chunk) tasks share
one pool, the judge last (ADR 0006).
Fresh processes still share one model, so they are not independent replication.
Parallelism remains in the matrix launcher.

## Components

| Path | Responsibility |
|---|---|
| `index.ts` | Register commands, load skills, validate/rewrite finalized REPORT summaries through the message-end hook. |
| `bin/report-tools.mjs` | Read-only history collection, legacy fingerprints, schema/closure/coverage/count validation, Git/patch snapshot checks, scope-safe selection. Node standard library only. |
| `docs/report-contract.md` | Canonical v2 metadata, cumulative ledger, coverage statuses, verdict gates, and publication format. |
| `skills/review-change/SKILL.md` | Frozen PR/branch/patch review; optional `--verify` without whole-PR approval. |
| `skills/review-repo/SKILL.md` | Per-lens exhaustive repository chunks with explicit incomplete coverage and history. |
| `skills/review-consolidate/SKILL.md` | Arrange validated full reports; preserve failed pairings and focused/legacy history separately. |
| `agents/*.md` | Discovery, challenge, judgment. Preserve complete finding evidence across phases. |
| `lenses/*` | Domain rules and signals, including project overlays. |
| `bin/run-phase.mjs` | Build a context pack per task, run one locked-down `pi -p` phase child, check its JSON (lossless envelopes), and for the judge render the markdown from the sidecar, then write + validate artifacts exclusively. |
| `bin/run-lenses.sh` | Shared pool, one slot per lens, running every `run-phase.mjs pair` task; writes `manifest.tsv` (completion order), exits 1 on any failed pair. |
| `bin/run-matrix.sh` | Parallel CLI runs and manifest; validates report paths/sidecars before accepting them. |
| `bin/test-*.mjs`, `bin/test-run-matrix.sh` | Built-in Node tests, SDK-wiring check, launcher and phase-runner checks with a fake `pi`. |

## State and identity

The files are the ledger; there is no database, global singleton, or background
service. Collection orders matching report timestamps, never directory mtimes.
Each full report carries forward all findings in its declared target scope.
Historical absence never closes an issue. Alias merges require an explanation.

A verification can change only named prior IDs. Other rows retain their actual
prior status and evidence. Its overall verdict is null. Consolidation selects full
reports independently of later focused checks and exposes reconciliation work.
Repository lens scopes are `repo:<lens-slug>`; PR history is identified by PR number
when available and branch target otherwise. Conflicting/mixed revisions are visible.

## Evidence gates

The challenger can filter a proposed finding but cannot discover an omitted one.
The invariant matrix addresses that separate coverage obligation: entry points,
writers, consumers, reachable modes, and relevant terminal/nonterminal outcomes.
Critical uninspected paths or unrechecked active history prevent SHIP.

The judge consumes only lossless `{finding, challenge, disposition}` records plus
coverage/history. It does not reconstruct lost evidence or invent fixes. Confirmed
and uncertain findings have separate counts. Verified fixes and disproofs require
closure evidence; nonblocking deferrals require owner, reason, and ticket.

## Enforcement and limitations

The mandatory CLI validator checks schema and evidence-record consistency before
publication. The Pi `message_end` hook repeats validation and derives the final
summary from the sidecar, removing the success marker from invalid drafts. The
matrix launcher independently rejects invalid/out-of-repo output. This guards
finalized output; streaming text may already have appeared.

Read-only Git checks detect a mismatched HEAD, unavailable base object, or working
tree edits outside reports. PR base/head freshness is acquired by the skill from
GitHub and rechecked before publication. The helper itself makes no network calls.
Tests/builds and live cloud/service requests remain forbidden in review mode.

Validation cannot establish the semantic truth of evidence or guarantee discovery
of every defect. SHIP means no outstanding confirmed blockers within complete,
declared coverage—not “zero defects.” See ADR 0005 for the rationale and limits.
