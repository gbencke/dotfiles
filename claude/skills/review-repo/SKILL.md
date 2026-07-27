---
name: review-repo
description: >
  Adversarial multi-agent review of an entire repository. Spawns per-lens
  reviewer and challenger subagents (propose → kill → judge) and writes a
  report plus findings.json under .gbencke/adversarial-review/reports/.
  Trigger: /review-repo [path], "adversarial review of this repo".
argument-hint: "[path]"
---

# review-repo — adversarial whole-repository review

Orchestrate the adversarial loop (see CONTEXT.md at the extension base dir for
the glossary). You are the **orchestrator**: you coordinate, you never review
code yourself. Reviewing is the subagents' job.

Requires the `Agent` tool (pi-subagents extension). If it is unavailable, stop
and tell the user to install `@tintinweb/pi-subagents`.

## Phase 0 — Target and scope

1. Target dir = the argument, or the current working directory if empty.
   Resolve to an absolute path. Confirm it is a repo (has `.git` or source files).
2. Read `agents/reviewer.md`, `agents/challenger.md`, `agents/judge.md` from the
   extension base dir — these are the prompt templates for every spawn.

## Phase 1 — Lens selection (ALWAYS ask)

1. List `lenses/` in the extension base dir. For each lens read `lens.md`
   (name, apply-when signals).
2. Also check `<target>/.gbencke/adversarial-review/lenses/` (project overlay). New
   names are added; same-named lenses MERGE (project rules.md appended after
   the global rules.md).
3. A lens applies when its signals match the repo (globs, dependency names,
   file types). `test-surface` and `blast-radius` are change-only — skip them
   for repo reviews.
4. **`--lenses` arg**: if the user passed `--lenses a,b,c` in the target
   argument, use exactly those lenses (parse the remainder of the argument
   for it) and skip step 5. Otherwise step 5 is MANDATORY.
5. **Ask the user, in plain text, before any agent is spawned:**
   > Matched lenses: <names> (N of M available: <all names>).
   > Reply ENTER or 'all matched' to run them · 'all' to run every lens ·
   > or adjustments like 'skip aws, add chaos'.

   Wait for the reply and apply it. Never skip this prompt without
   `--lenses` — even if the match looks obvious.
6. Note per-chunk matching: language lenses (their signals are file globs
   like `*.go`, `*.ts`) review ONLY the chunks whose files match — a
   Go-only chunk does not get the typescript lens. `always` lenses review
   every chunk.

## Phase 2 — Chunking (exhaustive)

1. Walk the repo. ALWAYS skip: `.git`, `node_modules`, `vendor`, `dist`,
   `build`, `target`, lock files, generated code, minified assets, binary
   files, the `.gbencke/adversarial-review` dir itself.
2. Chunk along top-level module/directory boundaries. If a single directory is
   too large for one agent (~>40 source files or ~>30k tokens), split it
   mechanically into sub-chunks.
3. Produce the chunk list: `[{id, paths[]}]`. State the count to the user.

## Phase 3 — Propose (parallel reviewers)

For each (lens × chunk) pair, spawn a **background** Agent (respecting
per-chunk language-lens matching from Phase 1):

- `subagent_type`: `general-purpose`
- `description`: `review <lens> chunk <id>`
- `run_in_background`: true — launch ALL spawns in ONE message (batched), then
  collect results as they complete. Do not launch sequentially.
- Prompt: the `agents/reviewer.md` template with slots filled:
  - `{{LENS_NAME}}`, the lens's merged `rules.md` content
  - `{{SCOPE}}`: the chunk's path list, and the instruction that this is a
    REPO REVIEW (review the listed files fully, not a diff)
  - `{{TARGET_DIR}}`: absolute path of the target repo

Cap concurrency by trusting the subagents queue — launch everything, let it
schedule. If (lenses × chunks) exceeds 25 pairings, process chunks in waves of ~25.

Collect each reviewer's findings as JSON. If an agent fails or returns
non-JSON, note it and continue — partial coverage beats aborting.

## Phase 4 — Kill (parallel challengers)

For each lens that produced ≥1 finding, spawn one background challenger Agent
per lens (not per chunk — one challenger sees all of the lens's findings for
dedup context):

- Prompt: the `agents/challenger.md` template with `{{LENS_NAME}}`, the merged
  `rules.md`, `{{FINDINGS}}` (that lens's findings JSON), `{{TARGET_DIR}}`.
- Batched launches, background, same as Phase 3.

## Phase 5 — Judge

Spawn ONE foreground Agent with `agents/judge.md`:

- `{{MODE}}`: `repo`
- `{{FINDINGS}}`: all challenger outputs (VALID / INVALID / AMBIGUOUS with evidence)
- `{{CONTEXT}}`: repo name, selected lenses, chunk count, any skipped/failed agents
- Instruct it to write BOTH artifacts into
  `<target>/.gbencke/adversarial-review/reports/`:
  - `<yyyymmdd-hhmmss>-repo.md` — the report
  - `<yyyymmdd-hhmmss>-repo.findings.json` — the findings sidecar (same basename)

## Phase 6 — Summary

Reply in chat with ONLY: per-lens health verdicts, severity counts
(P0/P1/P2/P3), top-5 findings (one line each), agents that failed (if any),
and the report path. Nothing else — the report is the deliverable.

## Hard rules

- Never review code yourself. Never "spot-check" — that is a lens's job.
- Never modify the reviewed repo except writing into `.gbencke/adversarial-review/reports/`.
- Never execute repo code, test suites, builds, or cloud/API calls (see
  docs/adr/0002-execution-boundary.md).
- Keep every agent prompt self-contained: agents do not see this conversation.
