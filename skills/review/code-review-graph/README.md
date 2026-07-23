# Code Review Graph

Structural code intelligence for a git repo via the `code-review-graph` CLI.

## What it does

- Builds a persistent Tree-sitter knowledge graph of the repo (`.code-review-graph/graph.db`).
- Answers structural queries: callers, callees, tests, imports, inheritance, impact radius.
- Runs risk-scored change reviews that read only the affected files.
- Drives the CLI directly — no MCP client required (works in pi).

## Requirements

- `code-review-graph` CLI on PATH: `uv tool install code-review-graph`.

## Files

- `SKILL.md` — the CLI-driven code-review-graph workflow.
