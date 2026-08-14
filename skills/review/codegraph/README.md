# CodeGraph

Structural code intelligence for a git repo via the `codegraph` CLI.

## What it does

- Queries a persistent SQLite knowledge graph of the repo (`.codegraph/`): symbols, call edges, imports.
- Answers structural queries: symbol search, callers, callees, change impact, affected tests.
- `codegraph explore "<question>"` returns the relevant source plus call paths in one shot.
- Drives the CLI directly — no MCP client required (works in pi).

## Requirements

- `codegraph` CLI on PATH: `npm install -g @colbymchenry/codegraph` (Node 20–24).

## Files

- `SKILL.md` — the CLI-driven codegraph workflow.
