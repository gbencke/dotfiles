---
name: code-review-graph
description: Structural code intelligence for the current git repo — build a persistent Tree-sitter knowledge graph, then answer callers/callees/tests/impact-radius questions and run risk-scored change reviews reading only the files that matter. Use when asked to "build the code graph", "review my changes", "what's the blast radius of X", "who calls X", "what tests cover X", or "explore this codebase". Pi drives the CLI directly (pi has no MCP client, so ignore any MCP-tool instructions in the upstream project).
---

# code-review-graph (CLI)

Builds a SQLite knowledge graph of the repo (`.code-review-graph/graph.db`) from
the AST, then answers structural questions so you read only the relevant files
instead of scanning the whole tree.

**Requires** the `code-review-graph` CLI on PATH (`~/.local/bin/`, installed via
`uv tool install code-review-graph`). All commands auto-detect the repo root from
git — run them from inside the target repo, or pass `--repo <path>`.

**Pi has no MCP client.** The upstream skills reference MCP tools like
`build_or_update_graph_tool`; ignore those. Every capability has the CLI
equivalent below. Run commands with the `bash` tool.

## First step, always

Check whether a graph exists before querying it:

```bash
code-review-graph status          # errors/empty if never built
```

If no graph exists (or after a branch switch / big refactor), build it. A
500-file repo builds in ~10s:

```bash
code-review-graph build           # full parse of all tracked files
code-review-graph update          # incremental, changed files only (--base HEAD~1)
```

`build` writes `.code-review-graph/` into the repo root. That dir is normally
git-ignored; if not, add it to `.gitignore`.

## Reviewing changes (most common task)

```bash
code-review-graph detect-changes --brief              # risk panel, diff vs HEAD~1, read-only
code-review-graph detect-changes --brief --base HEAD  # include uncommitted changes
code-review-graph update --brief                      # re-parse changed files FIRST, then panel (use after rebase / stale graph)
code-review-graph impact --depth 2                    # blast radius of changed files (auto-detected)
code-review-graph impact --files path/to/file.py      # blast radius of specific files
```

Review workflow: `detect-changes --brief` for the risk score → `impact` for the
blast radius → for each risky symbol, `query tests_for <name>` to check coverage
→ report findings grouped by risk (high/medium/low) with test-gap callouts and a
merge recommendation.

## Structural queries

```bash
code-review-graph query callers_of   <name>   # who calls it
code-review-graph query callees_of   <name>   # what it calls
code-review-graph query tests_for     <name>   # tests covering it
code-review-graph query importers_of  <path>   # who imports this file/module
code-review-graph query imports_of    <path>   # what this file imports
code-review-graph query inheritors_of <name>   # subclasses / implementers
code-review-graph query children_of   <name>   # members of a class
code-review-graph query file_summary  <path>   # nodes in a file
```

`query` prints JSON. If a name is ambiguous it returns candidates with a
`qualified_name` — re-run with that exact qualified name as the target.

## Exploration

```bash
code-review-graph search "auth"              # find entities by name/keyword
code-review-graph search "auth" --kind Function --limit 10
code-review-graph architecture --detail-level minimal   # community-based overview
code-review-graph flows --sort criticality --limit 10   # execution flows, most critical first
code-review-graph dead-code --kind Function             # unreferenced functions
code-review-graph visualize --format html               # interactive D3 graph -> HTML file
```

## Keeping it fresh

Pi has no file-save hooks, so the graph goes stale as you edit. Options:

- Run `code-review-graph update` before a review (cheap, incremental).
- Background daemon for auto-updates: `crg-daemon add <path> && crg-daemon start`
  (writes `~/.code-review-graph/watch.toml`; `crg-daemon status` / `stop`).

## Token discipline

The point of this tool is reading less. Start with `status`, then the single
most specific query for the question (`detect-changes --brief`, one `query`, or
`impact`). Don't dump the full graph — pull the minimal slice, answer, stop.
