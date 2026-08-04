# Claude Code

Skills for Claude Code.

## Install

```sh
mkdir -p ~/.claude/skills
cp -r claude/skills/. ~/.claude/skills/        # or symlink each subdir
```

Then **restart Claude Code** — it indexes `~/.claude/skills/` at startup, so
`/review-repo`, `/review-change`, and `/review-consolidate` are not invocable
until you do. `Skill(review-repo)` returning `Unknown skill` means the restart
is still pending.

Requirements: `claude` on `PATH` (the matrix launcher shells out to
`claude -p`), `bash` and `jq`, plus `gh` for PR-based change reviews. No
subagent plugin and no `Agent` tool — the skills run every phase inline.

## skills/

Adversarial review — propose → kill → judge per lens, then a report and
`findings.json` under `.gbencke/adversarial-review/reports/` **in the reviewed
repo**.

| Path | Purpose |
|------|---------|
| `review-repo/` | Review an entire repository. Trigger: `/review-repo <path> [--lenses a,b,c]`. The path is required. |
| `review-change/` | Review a PR, branch diff, or patch file. Trigger: `/review-change <pr-url\|pr-number\|branch\|patch-file> [base]`. |
| `review-consolidate/` | Review many repos in parallel, then merge everything into one document. Trigger: `/review-consolidate <repo> [<repo>...] --out <file.md>`. Repos and `--out` are both required. |
| `adversarial-review/` | Shared assets every skill reads: `CONTEXT.md` (glossary), `agents/` (reviewer, challenger, judge role packs), `lenses/` (15 review lenses), `bin/` (matrix launcher + its self-check), `docs/` (architecture, ADRs). No `SKILL.md` — data, not a skill. |

Every `SKILL.md` refers to the shared directory as `BASE_DIR` and resolves it to
`~/.claude/skills/adversarial-review/`. **If you install the shared assets
anywhere else, update that path in all three files** — nothing discovers it
dynamically.

## Usage notes

- **No lens picker.** Every lens whose signals match the target runs, with no
  prompt — a prompt would deadlock the non-interactive `claude -p` processes a
  matrix run is made of. `--lenses a,b,c` narrows the set.
- **No subagents; parallelism is processes.** Each review runs the three roles
  inline in one process, normally scoped to one lens.
  `adversarial-review/bin/run-matrix.sh` fans out one `claude -p` process per
  (repo × lens), all at once, and leaves an exit code, a log, and a report path
  per pairing in `manifest.tsv` (`docs/adr/0004-no-subagents.md`).
- **Cost scales as repos × lenses.** 3 repos × 13 repo-capable lenses = 39
  concurrent processes. Shake out a new install with
  `--lenses <one>` on a single repo first.
- **Reports carry the lens** — `<timestamp>-<target>-<lens>.md` — because those
  parallel processes share one reports directory. Each review prints its
  artifact path on a final `REPORT: ` line; consolidation prints
  `CONSOLIDATED: `. Parse those instead of scanning mtimes.
- **Project lens overlay.** A `.gbencke/adversarial-review/lenses/` directory in
  the reviewed repo adds repo-local lenses; same-named lenses merge, with the
  project's `rules.md` appended after the global one.
- **Nothing in the reviewed repo is executed.** Reviews never run repo code,
  tests, builds, or cloud/API calls — static reading plus existing artifacts
  only (`docs/adr/0002-execution-boundary.md`). `gh` / `git diff` / JIRA fetch
  for input gathering are the only exceptions; launching `claude` itself is the
  one process the tooling starts.

## Standalone launcher

The matrix launcher works without Claude Code, and self-checks without starting
anything:

```sh
adversarial-review/bin/run-matrix.sh --runner claude --log-dir /tmp/logs ~/repo-a ~/repo-b
adversarial-review/bin/test-run-matrix.sh
```

It defaults to `--runner pi`; the skills pass `--runner claude` explicitly.

## Provenance

Ported from `pi/extensions/adversarial-review/` (minus `index.ts`, which only
registers the pi slash commands). The three `SKILL.md` files, `CONTEXT.md`, and
the runtime sections of `docs/` are retargeted from `pi -p` to `claude -p` and
from "extension base dir" to the explicit `BASE_DIR` above. Lens rule packs and
role packs are host-agnostic and unmodified.
