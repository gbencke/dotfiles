---
name: review-repo
description: >
  Adversarial review of an entire repository: propose → kill → judge, one lens
  per run, each phase step in its own fresh pi process via bin/run-phase.mjs.
  Writes a report plus findings.json under .gbencke/adversarial-review/reports/.
  Trigger: /review-repo <path> [--lenses a,b,c], "adversarial review of this repo".
argument-hint: "<path> [--lenses a,b,c]"
---

# review-repo — adversarial whole-repository review

You are the **orchestrator** (see CONTEXT.md at the extension base dir for the
glossary). You freeze the revision, select lenses, chunk, and map invariants.
You do **not** play the reviewer, challenger, or judge: every propose,
challenge, and judge step runs in a fresh `pi -p` process launched by
`bin/run-phase.mjs`, which builds that process's context on the fly. pi has no
subagents, so a separate process per step is what keeps the phases
independent (ADR 0006).

**Lenses run in parallel; steps within a lens run one at a time.**
`bin/run-lenses.sh` starts one worker per lens. Batch runners already launch
one review per (repo × lens) — see ADR 0004 — so a matrix child has a single
lens and a single worker; parallel chunks would multiply that fan-out.

## Phase 0 — Target and scope

Read `docs/report-contract.md`. All new reports use schema v2, cumulative finding
records, evidence-backed coverage, and validation before publication. No empty
finding list or completed lens counter proves the whole repository is healthy.

1. **The repo path is required.** Take it from the argument. If the argument is
   empty (or contains only flags like `--lenses …`), stop immediately with:
   > review-repo needs a repository path: `/review-repo <path> [--lenses a,b,c]`

   Never fall back to the current working directory — batch runners invoke this
   from an unrelated cwd, and reviewing the wrong repo silently is worse than
   failing.
2. Resolve the path to absolute (`TARGET_DIR`). Confirm it exists and is a repo
   (has `.git` or source files). If not, stop and say which check failed.
3. Create a work dir in the system temp dir, never inside `TARGET_DIR`:
   `WORK=$(mktemp -d -t adversarial-review-XXXXXX)`. Every task file and child
   log lives there. The role packs in `agents/` are injected into each child by
   `run-phase.mjs`; you do not adopt them.

## Phase 1 — Lens selection (never ask)

1. List `lenses/` in the extension base dir. For each lens read `lens.md`
   (name, apply-when signals).
2. Also check `<TARGET_DIR>/.gbencke/adversarial-review/lenses/` (project
   overlay). New names are added; same-named lenses MERGE (project `rules.md`
   appended after the global `rules.md`).
3. A lens applies when its signals match the repo (globs, dependency names,
   file types). `test-surface` and `blast-radius` are change-only — skip them
   for repo reviews.
4. **Run every matched lens. Never prompt.** There is no lens picker: the
   matched set is the selection. State the selected lens names in chat and go
   straight to Phase 2. A prompt would deadlock non-interactive callers
   (`pi -p`), which is how batch runs drive this skill.
5. **`--lenses` arg**: if the argument contains `--lenses a,b,c`, use exactly
   those lenses instead of the matched set. That is the only way to narrow the
   selection. One lens per run is the batch case and the cheapest per-process
   context.
6. Compute `LENS_SLUG`: the sole lens name, or `multi` for multiple lenses. This
   keeps concurrent per-lens reports separate. Freeze the Git HEAD and verify a clean matching checkout. Record full head SHA,
   null base SHA, UTC timestamps, and `snapshot_consistent`. If Git/revision context
   is unavailable, deliver INCOMPLETE instead of claiming a verified snapshot.
   Set target to `repo:<LENS_SLUG>`, then run:

   ```bash
   node <extension>/bin/report-tools.mjs collect <TARGET_DIR> <target> > "$WORK/prior.json"
   ```

   Reconcile every prior ID in this declared scope using the v2 lifecycle contract.
   Other lens scopes and legacy repository reports remain explicit history, not
   whole-repo approvals or automatic closures. Never overwrite prior reports.
7. Per-chunk matching: language lenses (signals are file globs like `*.go`,
   `*.ts`) review ONLY the chunks whose files match — a Go-only chunk does not
   get the typescript lens. `always` lenses review every chunk.

## Phase 2 — Chunking (exhaustive)

1. Walk the repo. ALWAYS skip: `.git`, `node_modules`, `vendor`, `dist`,
   `build`, `target`, lock files, generated code, minified assets, binary
   files, the `.gbencke/adversarial-review` dir itself.
2. Chunk along top-level module/directory boundaries. Split a directory that is
   too large for one reading pass (~>40 source files or ~>30k tokens)
   mechanically into sub-chunks.
3. Produce the chunk list `[{id, paths[]}]` and state the count.
4. Before discovery, map critical invariants across chunks: entry points, all
   shared-state writers, final consumers, and relevant success/failure/cancel/
   supersession/replacement/never-settling outcomes. Record coverage statuses and
   evidence/next checks as defined in the v2 contract. Cross-chunk ownership must
   not disappear at a chunk boundary.

## Phase 3 — Propose and challenge: lenses in parallel

1. **Write every task first.** For each lens, for each chunk that lens matches,
   write `$WORK/tasks/<lens>/<NN>-<chunk>.task.json` (`NN` = zero-padded chunk
   order, so the worker keeps that order):

   ```json
   {
     "id": "<chunk>-<lens>",
     "mode": "repo",
     "target_dir": "<TARGET_DIR>",
     "work_dir": "<WORK>",
     "lens": "<lens>",
     "scope": "Chunk <chunk> of a repository review at <head_sha>",
     "paths": ["<every file in the chunk, relative to TARGET_DIR>"],
     "context": "<ledger rows and invariant/coverage rows that touch these paths; queued gaps owned by this chunk>"
   }
   ```

   `<chunk>` and `<lens>` are slugs (letters, digits, `.`, `_`, `-`).
2. **Run all lenses at once:**

   ```bash
   nohup <extension>/bin/run-lenses.sh "$WORK/tasks" > "$WORK/tasks.log" 2>&1 &
   ```

   Poll `$WORK/tasks.log` (sleep between checks, each check under your tool
   timeout) until its `run-lenses: … done` line appears. A lens worker runs up
   to two children per chunk, each limited to 30 minutes (`timeout_seconds`),
   so a single foreground call can outlive any tool timeout.

   Each worker runs `run-phase.mjs pair` per task: a **propose** child
   (`<id>-propose`), then — only if it proposed something — a **kill** child
   (`<id>-challenge`) that gets the proposal verbatim. Never run the same lens
   twice at once, and never start the judge before every worker is done.
3. **Read `$WORK/tasks/manifest.tsv`** (lens, task, exit, result, log). Rows
   with exit 0: append `result` (an envelopes file, `[]` when nothing was
   proposed) to `ENVELOPES` in lens then chunk order, and record the chunk as
   inspected under that lens. Read the result JSON only to update coverage and
   queue gaps (`next_check` items, sibling paths in other chunks). Do not read
   the chunk's source to add or drop findings — that is the children's job.

A non-zero row is a failed pair: record the chunk as `not_inspected` for that
lens with the next check `rerun; see <log>` and the `<id>-propose.err` /
`<id>-challenge.err` files in `$WORK`. Never retry silently and never do the
failed phase yourself. Exit 2 in a log means the task file is wrong: fix it and
rerun that one task with `node <extension>/bin/run-phase.mjs pair <task>`.

Before judgment, handle queued discovery gaps once: write their tasks under
`$WORK/tasks-gaps/<lens>/` (new ids) and run `run-lenses.sh` on that dir the same
way, or leave the gaps explicit. A critical
uninspected chunk requires INCOMPLETE, not HEALTHY with a footnote.

## Phase 4 — Judge child

Recheck the source revision and recollect history if a concurrent report
arrived. Then write `$WORK/<LENS_SLUG>-judge.task.json`:

```json
{
  "id": "<LENS_SLUG>-judge",
  "mode": "repo",
  "target_dir": "<TARGET_DIR>",
  "work_dir": "<WORK>",
  "envelope_files": ["<every ENVELOPES path, in chunk order>"],
  "prior_file": "<the collector output from Phase 1>",
  "report_md": "<TARGET_DIR>/.gbencke/adversarial-review/reports/<UTC-yyyymmdd-hhmmss>-repo-<LENS_SLUG>.md",
  "context": "<repo name; target repo:<LENS_SLUG>; head SHA, null base, UTC date, snapshot_consistent; selected lenses; chunk count; the full coverage matrix; failed or skipped chunks with their logs>"
}
```

Run `run-phase.mjs judge <task>`. The child returns the markdown and the v2
sidecar as JSON; the launcher writes both files exclusively (never overwriting
another lens's report) and validates them. Its last line is `REPORT: <md>` only
when validation passed. On a validation failure it removes both files; you may
run one more judge with a new `id`, a new timestamp, and the validator errors
appended to `context`. A second failure ends the review without a `REPORT:`
line — say which errors remained.

The lens slug in the basename is required, not cosmetic: reviews of one repo
run concurrently (one process per repo × lens).

### Concurrency safety

Other reviews of this same repo are probably running right now in other
processes, under other lenses. Therefore:

- Never clear, prune, or rotate the reports dir; only the launcher writes there.
- Never lock the repo, never write scratch files inside `TARGET_DIR`, never run
  a mutating `git` command (`add`, `stash`, `checkout`, `clean`).
- Never infer "the latest report" from the directory listing — the newest file
  there probably belongs to another lens's run.

## Phase 5 — Summarize

Confirm the published sidecar is still valid (another run may have reported
since), then read it:

```bash
node <extension>/bin/report-tools.mjs validate <absolute-sidecar>
```

If this fails, emit no `REPORT:` line and say why. Reply in chat with ONLY:
per-lens health verdicts, severity counts (P0/P1/P2/P3), top-5 findings (one
line each), skipped or failed chunks (if any), and the report path. Nothing
else — the report is the deliverable.

Last line, on its own, absolute, prefixed exactly `REPORT: ` — batch callers
parse that line instead of guessing from directory mtimes. The finalized-message
hook and matrix launcher validate it again.

## Hard rules

- Never use the `Agent` tool. Every propose, challenge, and judge step is a
  `run-phase.mjs` child. Lenses run in parallel through `run-lenses.sh`; within
  a lens, propose → challenge per chunk in order; the judge runs last (ADR 0006).
- Keep the phases honest: never produce, rescue, or drop a finding yourself,
  and never skip the kill step because a finding "looks obvious" (ADR 0001).
- Never modify the reviewed repo except writing into
  `.gbencke/adversarial-review/reports/`.
- Never execute repo code, test suites, builds, or cloud/API calls (see
  docs/adr/0002-execution-boundary.md). Read-only Git metadata and the extension's
  report collector/validator are allowed; they do not execute reviewed code.
