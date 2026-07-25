# adversarial-review

Adversarial multi-agent code review for [pi](https://pi.dev). Specialized
reviewer agents propose findings, adversarial challenger agents try to kill
each one, and a judge rules on the survivors. Only findings that survive
cross-examination reach you.

This pattern cuts false positives from ~30–60% (single-pass AI review) to
~7% in published production data — see `docs/FUNCTIONALITIES.md` for the
research basis.

## Requirements

- pi with the [`@tintinweb/pi-subagents`](https://github.com/tintinweb/pi-subagents)
  extension installed (provides the `Agent` tool that spawns reviewers).

## Install

This package lives at `~/.pi/agent/extensions/adversarial-review/`. Pi loads
it automatically (directory extension with `index.ts`). Restart pi after
installing or updating.

Optional — make the skills trigger on natural language ("adversarial review
of this repo") in addition to the slash commands: add the skills dir to
`~/.pi/agent/settings.json`:

```json
{ "skills": ["~/.pi/agent/extensions/adversarial-review/skills"] }
```

## Usage

```
/review-repo [path]                          # whole-repository review
/review-change 412                           # PR number (uses gh)
/review-change https://github.com/o/r/pull/412
/review-change feature-branch main           # branch diff vs base
/review-change /tmp/fix.patch                # patch file
```

Both commands write two artifacts into the reviewed repo and return a short
summary in chat:

```
<repo>/.gbencke/adversarial-review/reports/<timestamp>-<target>.md
<repo>/.gbencke/adversarial-review/reports/<timestamp>-<target>.findings.json
```

The JSON sidecar is CI-gateable (`counts.P0 > 0` → fail the gate).

## What it reviews (v1 lenses)

| Lens | Repo review | Change review | Focus |
|------|:---:|:---:|------|
| aws | ✓ | ✓ | Well-Architected practices + documented service limits |
| docs | ✓ | ✓ | Comments/inline docs that disagree with the code |
| tests | ✓ | ✓ | Coverage gaps, hollow assertions, test smells |
| chaos | ✓ | ✓ | Failure tolerance + proposed chaos experiments |
| security | ✓ | ✓ | Reachable injection/authz/secrets defects |
| performance | ✓ | ✓ | N+1, unbounded work, hot-path waste |
| error-handling | ✓ | ✓ | Swallowed errors, lost context, data loss on failure |
| test-surface | — | ✓ | Every changed behavior has a test that would catch its deletion |
| blast-radius | — | ✓ | Downstream impact, risk tier, contract breaks |

Add your own lenses — see `docs/EXTENDING.md`. Override lens rules per repo
with `.gbencke/adversarial-review/lenses/<name>/` — see `docs/EXTENDING.md`.

## Documentation

- `docs/ARCHITECTURE.md` — how it works
- `docs/FUNCTIONALITIES.md` — deep dive on every lens and the review pipeline
- `docs/EXTENDING.md` — add lenses, add rules, project overrides
- `docs/adr/` — why the key decisions are what they are
- `CONTEXT.md` — the glossary (terms used consistently everywhere)

## Hard boundaries

Reviews never execute repo code, test suites, chaos experiments, or cloud
API calls (rationale: `docs/adr/0002-execution-boundary.md`). Static analysis
plus reading existing artifacts (coverage reports, diffs) only.
