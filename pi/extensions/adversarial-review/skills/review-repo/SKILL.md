---
name: review-repo
description: >
  Adversarial review of an entire repository, run inline in a single process:
  propose → kill → judge, one lens per run. Writes a report plus findings.json
  under .gbencke/adversarial-review/reports/. Spawns no subagents.
  Trigger: /review-repo <path> [--lenses a,b,c], "adversarial review of this repo".
argument-hint: "<path> [--lenses a,b,c]"
---

# review-repo — adversarial whole-repository review

Run the adversarial loop yourself, in this process (see CONTEXT.md at the
extension base dir for the glossary). You are the **reviewer, the challenger,
and the judge, in that order** — three roles, one process, strict phase
separation.

**No subagents.** Never use the `Agent` tool in this skill. Parallelism is the
caller's job: batch runners launch one process per (repo × lens) — see
ADR 0004. Spawning agents here would multiply concurrency by the number of
lenses and chunks.

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
3. Read `agents/reviewer.md`, `agents/challenger.md`, `agents/judge.md` from the
   extension base dir. These are **role packs**: the stance, contract, and
   output schema you adopt for each phase below. Fill their slots mentally; you
   are the audience now, not a subagent.

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
   node <extension>/bin/report-tools.mjs collect <TARGET_DIR> <target> > /tmp/<unique>-prior.json
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

## Phase 3 — The loop, one chunk at a time

Process chunks **sequentially**. For each chunk, for each lens that matches it:

1. **Propose** — adopt `agents/reviewer.md` for that lens: read the chunk's
   files under the lens's merged `rules.md` and produce findings as the JSON in
   that role pack. Every finding needs `file:line`, a failure condition, and
   evidence. Run the role pack's adversarial self-check and drop what dies.
2. **Kill** — switch to `agents/challenger.md` for the same findings: try to
   disprove each one against the actual code (callers, middleware, framework
   defaults, parent config). Emit `VALID` / `INVALID` / `AMBIGUOUS` with the
   kill attempts you actually made, preserving the complete finding in a lossless
   `{finding, challenge, disposition}` envelope. Do not raise new findings while
   wearing this hat; queue them for the chunk that owns the code, or a separate
   discovery pass if that chunk was already visited.
3. **Discard the file contents.** Keep the lossless challenge envelopes, cumulative
   finding dispositions, and coverage updates for this chunk.
   Your own context is the budget now that there are no subagents to absorb it
   — carrying source across chunks is what makes a large repo run out of room.
   If context is still tight, append each chunk's challenger JSON to a scratch
   file in the system temp dir and re-read it in Phase 4.

Never batch all chunks into one reading pass: one chunk in context at a time is
what keeps findings specific instead of vague.

If a chunk cannot be read or blows the budget, record uninspected coverage with a
next check and carry on. Before judgment, handle queued discovery gaps once or
leave them explicit. A critical skipped chunk requires INCOMPLETE, not HEALTHY
with a footnote. Missing inspectable source/CI returns to evidence gathering;
genuine runtime/domain uncertainty remains separate from confirmed defects.

## Phase 4 — Judge

Now adopt `agents/judge.md` with:

- `{{MODE}}`: `repo`
- `{{FINDINGS}}`: every chunk's challenger JSON from Phase 3
- `{{CONTEXT}}`: repo name, selected lenses, chunk count, skipped chunks

Rule on challenger output only — do not re-read code to invent new findings.
Exclude INVALID from active defects while retaining evidenced historical closure.
Dedup without losing prior IDs/aliases; reconcile every prior issue, audit severity,
and apply the v2 coverage/closure gates. Use null solution_fit for repo mode and
show a per-lens health table. Recheck source revision and recollect history if a
concurrent report arrived. Then write BOTH artifacts into
`<TARGET_DIR>/.gbencke/adversarial-review/reports/`:

- `<UTC-yyyymmdd-hhmmss>-repo-<LENS_SLUG>.md` — the report
- `<UTC-yyyymmdd-hhmmss>-repo-<LENS_SLUG>.findings.json` — the sidecar (same basename)

The lens slug is required, not cosmetic: reviews of one repo run concurrently
(one process per repo × lens), so a lens-less basename collides whenever two
runs finish in the same second.

### Concurrency safety

Other reviews of this same repo are probably running right now in other
processes, under other lenses. Therefore:

- `mkdir -p` the reports dir; never clear, prune, or rotate it.
- Write only the two files named above. Never delete or overwrite a report you
  did not just create.
- Never lock the repo, never write scratch files inside `TARGET_DIR` (use the
  system temp dir), never run a mutating `git` command (`add`, `stash`,
  `checkout`, `clean`).
- Never infer "the latest report" from the directory listing — the newest file
  there probably belongs to another lens's run.

## Phase 5 — Validate and summarize

Run the extension's data-only validator before emitting a success marker:

```bash
node <extension>/bin/report-tools.mjs validate <absolute-sidecar>
```

Validation errors require reconciliation or an honest INCOMPLETE result, never
omitting history or claiming uninspected code is verified. The finalized-message
hook and matrix launcher independently enforce the same contract.

Reply in chat with ONLY: per-lens health verdicts, severity counts
(P0/P1/P2/P3), top-5 findings (one line each), skipped chunks (if any), and the
report path. Nothing else — the report is the deliverable.

Last line, on its own, absolute, prefixed exactly `REPORT: ` — batch callers
parse that line instead of guessing from directory mtimes.

## Hard rules

- Never use the `Agent` tool. One process, three roles, phases in order.
- Keep the phases honest: propose, then kill, then judge. Never let the judge
  role rescue a finding the challenger killed, and never skip the kill phase
  because a finding "looks obvious" — proposal and refutation stay separate
  even inside one process (ADR 0001, ADR 0004).
- Never modify the reviewed repo except writing into
  `.gbencke/adversarial-review/reports/`.
- Never execute repo code, test suites, builds, or cloud/API calls (see
  docs/adr/0002-execution-boundary.md). Read-only Git metadata and the extension's
  report collector/validator are allowed; they do not execute reviewed code.
