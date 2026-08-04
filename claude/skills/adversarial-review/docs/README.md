# adversarial-review

Adversarial code review for [Claude Code](https://claude.com/claude-code). A specialized reviewer
proposes findings, an adversarial challenger tries to kill each one, and a judge
rules on the survivors. Only findings that survive cross-examination reach you.

Three phases, one process, no subagents. Scale comes from processes:
`/review-consolidate` launches one review per (repo × lens) in parallel and
merges everything into a single document (ADR 0004).

This pattern cuts false positives from ~30–60% (single-pass AI review) to
~7% in published production data — see `docs/FUNCTIONALITIES.md` for the
research basis.

## Requirements

- `claude` on `PATH` (`/review-consolidate` shells out to `claude -p` per
  repo × lens).
- bash and `jq` for the matrix launcher and the consolidation merge.

## Install

Four directories under `~/.claude/skills/`:

```
~/.claude/skills/adversarial-review/   # BASE_DIR: docs, agents, lenses, bin
~/.claude/skills/review-repo/          # SKILL.md
~/.claude/skills/review-change/        # SKILL.md
~/.claude/skills/review-consolidate/   # SKILL.md
```

`BASE_DIR` holds no SKILL.md on purpose — it is shared data, not a skill.
The three skills read it by absolute path.

## Usage

```
/review-repo <path> [--lenses a,b,c]          # whole-repository review (path required)
/review-change 412 [--lenses design,security] # PR number (uses gh)
/review-change https://github.com/o/r/pull/412
/review-change feature-branch main            # branch diff vs base
/review-change /tmp/fix.patch                 # patch file

# every lens × every repo, all in parallel, then one document:
/review-consolidate ~/git.work/307.* ~/git.work/312.* --out ~/reviews/all.md
/review-consolidate ~/repo-a --out doc.md --no-run   # merge existing reports only
```

No lens picker: every matched lens runs. `--lenses a,b,c` narrows it.
Language lenses (`typescript`, `golang`, `python`) review only the chunks / diff
files that match their language.

`/review-repo` and `/review-change` write two artifacts into the reviewed repo
and return a short summary in chat whose last line is the report path:

```
<repo>/.gbencke/adversarial-review/reports/<timestamp>-<target>-<lens>.md
<repo>/.gbencke/adversarial-review/reports/<timestamp>-<target>-<lens>.findings.json
```

The lens is in the basename so parallel per-lens runs never overwrite each
other. The JSON sidecar is CI-gateable (`counts.P0 > 0` → fail the gate).

`/review-consolidate` needs a repo list and `--out`, both required. It runs the
matrix through `bin/run-matrix.sh` (one `claude -p` process per repo × lens, all at
once, exit code + log + report path per pairing in `manifest.tsv`), then writes
one document ordered by severity then repo: summary table, coverage table,
cross-repo themes, and every failed pairing under `## Not consolidated`.

The launcher runs standalone too, and self-checks without starting claude:

```
bin/run-matrix.sh --runner claude --log-dir /tmp/logs ~/repo-a ~/repo-b
bin/test-run-matrix.sh
```

## What it reviews (v1 lenses)

| Lens | Repo review | Change review | Focus |
|------|:---:|:---:|------|
| aws | ✓ | ✓ | Well-Architected practices + documented service limits |
| design | ✓ | ✓ | Ousterhout's *A Philosophy of Software Design* — complexity, deep modules, information hiding |
| docs | ✓ | ✓ | Comments/inline docs that disagree with the code |
| tests | ✓ | ✓ | Coverage gaps, hollow assertions, test smells |
| chaos | ✓ | ✓ | Failure tolerance + proposed chaos experiments |
| security | ✓ | ✓ | Reachable injection/authz/secrets defects |
| performance | ✓ | ✓ | N+1, unbounded work, hot-path waste |
| error-handling | ✓ | ✓ | Swallowed errors, lost context, data loss on failure |
| typescript | ✓ | ✓ | Type safety, escape hatches, async correctness (TS files only) |
| golang | ✓ | ✓ | Errors, goroutine/defer/slice safety, idioms (Go files only) |
| python | ✓ | ✓ | Mutable defaults, async blocking, GIL misuse, typing hatches, resource lifecycle (Python files only) |
| test-surface | — | ✓ | Every changed behavior has a test that would catch its deletion |
| blast-radius | — | ✓ | Downstream impact, risk tier, contract breaks |

Add your own lenses — see `docs/EXTENDING.md`. Override lens rules per repo
with `.gbencke/adversarial-review/lenses/<name>/` — see `docs/EXTENDING.md`.

## Documentation

- `docs/ARCHITECTURE.md` — how it works
- `docs/FUNCTIONALITIES.md` — deep dive on every lens and the review pipeline
- `docs/EXTENDING.md` — add lenses, add rules, project overrides
- `docs/adr/` — why the key decisions are what they are
- `../CONTEXT.md` — the glossary (terms used consistently everywhere)

## Hard boundaries

Reviews never execute repo code, test suites, chaos experiments, or cloud
API calls (rationale: `docs/adr/0002-execution-boundary.md`). Static analysis
plus reading existing artifacts (coverage reports, diffs) only. Launching
`claude` itself is the one process the tooling starts, and it reviews nothing
but the files it reads.
