# Pinned Debt

Measure technical debt and cognitive load in JS/TS and Python git repos with pinned tools, inside a bubblewrap sandbox with no network and every repo read-only.

## What it does

- Scores the cognitive complexity of every function: `eslint-plugin-sonarjs` for JS/TS, `complexipy` for Python.
- Finds duplication with `jscpd`, and files over 300 lines.
- Reads git history to measure change amplification (code files per commit) and to rank hotspots (commits x complexity).
- Writes one report per repo, plus a summary that compares all repos.

## Files

- `SKILL.md`: how to run it and how to read the results.
- `pinned-debt`: zsh runner. Installs the pinned tools into `~/.cache/pinned-debt/<hash>`, then runs the analysis in `bwrap`.
- `debt_analysis.py`: the analysis. Runs inside the sandbox. `python3 debt_analysis.py --self-test` checks the parsers.
- `eslint.debt.config.mjs`: ESLint config with only `sonarjs/cognitive-complexity` enabled.

## Prerequisites

`bwrap`, `node`, `npm`, `python3`, `git`, `sha256sum`.
