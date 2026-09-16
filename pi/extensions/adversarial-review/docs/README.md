# adversarial-review

Adversarial code review for [pi](https://pi.dev). A specialized reviewer
proposes findings, an adversarial challenger tries to kill each one, and a judge
rules on the evidence. Active defects survive cross-examination; the cumulative
ledger also preserves fixes, disproofs, deferrals, and issues not rechecked.

Three phases, one process, no subagents. Scale comes from processes:
`/review-consolidate` launches one review per (repo × lens) in parallel and
merges everything into a single document (ADR 0004).

Reviews now reconcile prior findings and require evidence-backed coverage before
approval. A focused verification cannot clear a whole PR. This structure aims to
reduce false positives and incomplete repairs; it is not a measured guarantee of
recall or zero defects. See ADR 0005 and `docs/report-contract.md`.

## Requirements

- pi on `PATH` (`/review-consolidate` shells out to `pi -p` per repo × lens).
- Node.js 20+ for the dependency-free report tools; Node.js 22+ for the SDK wiring test.
- bash for the matrix launcher. `gh` for PR metadata and exact-head CI evidence.

## Install

This package lives at `~/.pi/agent/extensions/adversarial-review/`. Pi loads
it automatically (directory extension with `index.ts`). Restart pi after
installing or updating (or use pi's `/reload`).

Optional — make the skills trigger on natural language ("adversarial review
of this repo") in addition to the slash commands: add the skills dir to
`~/.pi/agent/settings.json`:

```json
{ "skills": ["~/.pi/agent/extensions/adversarial-review/skills"] }
```

## Usage

```
/review-repo <path> [--lenses a,b,c]          # whole-repository review (path required)
/review-change 412 [--lenses design,security] # PR number (uses gh)
/review-change https://github.com/o/r/pull/412
/review-change feature-branch main            # branch diff vs base
/review-change /tmp/fix.patch                 # patch file
/review-change 412 --verify selection-stale-write # verify an existing stable finding ID

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

New sidecars use schema v2: full SHA/scope metadata, cumulative finding dispositions,
separate confirmed/uncertain counts, and evidence-backed coverage. Change filenames
also include `full` or `verify`. UTC stamps avoid mixed-timezone ordering.

Never approve from zero counts alone: require validated `mode != verification`,
the intended full scope/lenses/revision, and `verdict.overall == SHIP`. Missing
critical coverage or unrechecked active history produces INCOMPLETE. The final
summary hook and matrix runner reject structurally invalid reports.

Legacy reports remain history. They are not overwritten, and a newer empty report
does not erase their issues. Focused reports return no whole-PR verdict and cannot
replace a full report during consolidation.

`/review-consolidate` needs a repo list and `--out`, both required. It runs the
matrix through `bin/run-matrix.sh` (one `pi -p` process per repo × lens, all at
once, exit code + log + report path per pairing in `manifest.tsv`), then writes
one document ordered by severity then repo: summary table, coverage table,
cross-repo themes, and every failed pairing under `## Not consolidated`.

The launcher runs standalone too, and self-checks without starting pi:

```
bin/run-matrix.sh --log-dir /tmp/logs ~/repo-a ~/repo-b
bin/test-run-matrix.sh
node --test bin/test-report-tools.mjs
node --experimental-default-type=module --experimental-strip-types --test bin/test-extension.mjs

# Read-only helpers; paths are absolute:
node bin/report-tools.mjs collect /path/to/repo feature-branch 412
node bin/report-tools.mjs validate /path/to/repo/.gbencke/adversarial-review/reports/report.findings.json
node bin/report-tools.mjs select /path/to/repo
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

- `docs/report-contract.md` — schema v2, lifecycle, coverage, and validation
- `docs/ARCHITECTURE.md` — how it works
- `docs/FUNCTIONALITIES.md` — deep dive on every lens and the review pipeline
- `docs/EXTENDING.md` — add lenses, add rules, project overrides
- `docs/adr/` — why the key decisions are what they are
- `CONTEXT.md` — the glossary (terms used consistently everywhere)

## Hard boundaries

Reviews never execute repo code, test suites, chaos experiments, or cloud
API calls (rationale: `docs/adr/0002-execution-boundary.md`). Static analysis
plus reading existing artifacts (coverage reports, diffs, exact-head CI logs).
Extension-owned Node helpers execute only data processing and read-only Git
metadata checks. Matrix processes launch pi reviewers, never reviewed application
code. A claimed test result must identify its revision and evidence.
