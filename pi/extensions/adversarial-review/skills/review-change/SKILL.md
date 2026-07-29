---
name: review-change
description: >
  Adversarial multi-agent review of a change: a PR, a branch diff, or a patch
  file. Computes blast radius, runs per-lens propose → kill → judge, and
  writes a PR-comment-ready report plus findings.json under
  .gbencke/adversarial-review/reports/.
  Trigger: /review-change <pr-url|pr-number|branch|patch-file> [base],
  "adversarial review of this PR/branch/patch".
argument-hint: "<pr-url|pr-number|branch|patch-file> [base]"
---

# review-change — adversarial review of a PR / branch / patch

You are the **orchestrator**: coordinate subagents, never review code yourself.
Uses pi's built-in `Agent` tool to spawn reviewers, challengers, and the judge.

## Phase 0 — Resolve the change

Parse the argument (first token = target, second = optional base, default
`main`):

- **PR URL or number** → `gh pr diff <n>` and `gh pr view <n> --json title,body`
  (the title/body is the *change intent* — keep it for the judge). If `gh`
  fails, tell the user and stop.
- **Branch name** → `git diff <base>...<branch>`; intent = the branch's commit
  messages (`git log <base>..<branch> --oneline`).
- **Patch file path** → read the file; intent = none (solution-fit degrades to
  correctness-only; note this in the report).

Also resolve the repo root (absolute) as `TARGET_DIR`. Save the diff to a temp
file. If the diff is empty, say so and stop.

## Phase 1 — Blast radius (mechanical first)

1. Extract changed symbols from the diff: function/class/type names, exported
   identifiers, API routes, schema/migration definitions, feature flags.
2. Build the reverse import/caller graph over `TARGET_DIR`: for each changed
   exported symbol, find files that import or reference it. Use ast-grep
   (`sg`) when available, `grep -rn` as fallback. Skip test files in the graph
   but record which tests reference the changed symbols (feeds test-surface).
3. Produce: `{symbol → direct dependents[]}`, count of affected packages/dirs.

## Phase 2 — Lens selection (ALWAYS ask)

Read every `lenses/*/lens.md` in the extension base dir + the repo overlay
(`.gbencke/adversarial-review/lenses/`, merge same-named). For a change review ALL
signal-matched lenses apply, and `test-surface` + `blast-radius` ALWAYS
apply. Language lenses (glob signals like `*.go`, `*.ts`) match only if the
diff touches matching files.

- If the user passed `--lenses a,b,c` in the argument, use exactly those
  and skip the prompt.
- Otherwise, MANDATORY before spawning any agent, ask in plain text:
  > Matched lenses: <names> (N of M). ENTER/'all matched' to run them ·
  > 'all' for every lens · or 'skip X, add Y'.

  Wait for the reply and apply it.

## Phase 3 — Propose (parallel reviewers)

Spawn background Agents (batched, one message, `run_in_background: true`),
one per lens. Prompt = `agents/reviewer.md` template with:

- `{{LENS_NAME}}` + merged `rules.md`
- `{{SCOPE}}`: the FULL diff, plus for `blast-radius` the Phase-1 graph, and
  the instruction that agents may read any file in `TARGET_DIR` for context
  (full-repo access is what keeps false positives down).
- `{{TARGET_DIR}}`

If more than 10 lenses apply, launch in waves of ~10.

## Phase 4 — Kill (parallel challengers)

One background challenger per lens with ≥1 finding. Prompt =
`agents/challenger.md` with `{{LENS_NAME}}`, merged `rules.md`, `{{FINDINGS}}`
(lens's findings JSON), `{{TARGET_DIR}}`. Challengers may read any file to
disprove a finding.

## Phase 5 — Judge (dual verdict)

Spawn ONE foreground Agent with `agents/judge.md`:

- `{{MODE}}`: `change`
- `{{INTENT}}`: the change intent from Phase 0 (or "unknown")
- `{{FINDINGS}}`: all challenger outputs
- `{{CONTEXT}}`: target, base, diff stat, Phase-1 blast-radius graph summary
- The judge writes into `<repo>/.gbencke/adversarial-review/reports/`:
  - `<yyyymmdd-hhmmss>-<target-slug>.md` — PR-comment-ready report:
    dual verdict first (IMPLEMENTATION_CORRECTNESS × SOLUTION_FIT → overall
    SHIP / FIX-THEN-SHIP / DO-NOT-SHIP), then findings by severity, then the
    blast-radius section, then the NOT-REVIEWED list.
  - `<same-basename>.findings.json` — the sidecar.

## Phase 6 — Summary

Chat reply ONLY: dual verdict line, severity counts, top-5 findings (one line
each), blast-radius headline (N direct dependents, risk tier), report path.

## Hard rules

- Never review code yourself; never modify the repo except the reports dir.
- Never execute repo code, tests, builds, or network/cloud calls
  (`gh`/`git diff` for input gathering are the only exceptions).
- Every finding must cite file:line and a concrete failure condition.
- Agents get self-contained prompts; they cannot see this conversation.
