# CodeGraph

Read and understand a repo through its pre-indexed knowledge graph instead of
grepping and reading files.

## What it does

- Queries a persistent SQLite graph of the repo (`.codegraph/`): symbols, call
  edges, imports.
- One `codegraph_explore` call returns the relevant verbatim source grouped by
  file, the call paths between symbols (including dynamic-dispatch hops grep
  cannot follow), the blast radius of a change, and the tests that cover it.
- Naming a file path in the query returns its line-numbered source, so explore
  replaces `read` for indexed files.

Measured at **−80.6% tokens and −62.2% cost** against a grep+read baseline on a
975-file repo, median of 5 runs.

## Requirements

- The `codegraph` pi extension, which exposes `codegraph_explore`,
  `codegraph_affected_tests` and `codegraph_status`. Lives in
  `pi/extensions/codegraph/` in this repo.
- `codegraph` CLI on PATH: `npm install -g @colbymchenry/codegraph`.
- A repo that has already been indexed with `codegraph init`. The skill never
  indexes on its own — that is the user's decision.

Without the extension the tools do not exist and the skill has nothing to drive;
fall back to the CLI through bash in that case.

## Files

- `SKILL.md` — the workflow: explore first, respect the budget line, treat
  returned source as already read.

## Design notes

Why three tools instead of nine, why explore has no output cap, and the
benchmark table behind those choices: `pi/extensions/README.md`.
