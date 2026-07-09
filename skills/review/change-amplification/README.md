# Change Amplification

Detect change amplification — a clear signal of bad architecture — by analyzing merged pull requests.

## What it does

- Fetches the last N merged PRs from the current git repo (default 50).
- Formats each PR as a structured context block.
- Applies an LLM analysis lens to find one conceptual change that forced edits across scattered files.
- Produces a ranked architectural debt backlog with PR links as evidence and concrete remediation steps.

## Intellectual basis

- John Ousterhout's *change amplification* from *A Philosophy of Software Design*.
- David Parnas's *information hiding*.
- Adam Tornhill's *change coupling* from *Software Design X-Rays*.

## Prerequisites

- `GITHUB_TOKEN` with `repo` scope.
- Current directory inside a git repo with a GitHub remote (`origin`).

## Files

- `SKILL.md` — the full workflow and analysis rules.
