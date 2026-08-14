---
name: codegraph
description: Query a pre-indexed CodeGraph knowledge graph of the current repo — symbol search, callers/callees, change impact, affected tests, and one-shot area exploration — so you read only the files that matter instead of grepping the tree. Use when asked to "explore this codebase", "who calls X", "what does X call", "what breaks if I change X", "which tests cover these changes", "index this repo with codegraph", or "codegraph <anything>". Pi has no MCP client, so ignore the project's MCP-tool docs and use the CLI below.
---

# codegraph (CLI)

`codegraph` keeps a SQLite graph of the repo in `.codegraph/` (symbols, call
edges, imports). Query it before reading files.

Requires the `codegraph` CLI on PATH (`npm install -g @colbymchenry/codegraph`,
Node 20–24). All commands resolve the project by walking up from cwd; `-p <path>`
overrides.

## First step, always

```bash
codegraph status              # initialized? file/node/edge counts, last indexed
```

Not initialized → **ask the user first**; indexing is their call, and the CLI
itself refuses to index `$HOME` or `/`.

```bash
codegraph init                # initialize + build initial index
codegraph sync                # incremental update (fast, safe to run often)
codegraph index               # full rebuild from scratch
```

Stale results after a rebase or big refactor → `codegraph sync` first.

## Exploring an area (start here)

```bash
codegraph explore "how does the inbound event resolver work"
codegraph explore "jira ticket update flow" --max-files 8
```

Returns the relevant symbols' source grouped by file plus the call paths between
them — usually enough to answer without opening anything.

## Structural queries

```bash
codegraph query <search> -l 20 -k function   # find symbols (-k: function, class, method, ...)
codegraph callers <symbol>                   # who calls it
codegraph callees <symbol>                   # what it calls
codegraph impact <symbol> -d 2               # blast radius, depth 1-10
codegraph node <name>                        # full detail for one symbol
codegraph files                              # indexed files
```

## Reviewing changes

```bash
git diff --name-only HEAD~1 | codegraph affected --stdin      # tests covering changed files
codegraph affected src/foo.ts -f "e2e/*.spec.ts"              # custom test glob
codegraph impact <changed-symbol> -d 2                        # then blast radius per risky symbol
```

Workflow: `affected` for test coverage → `impact` on each changed symbol →
report by risk, flag symbols with impact but no covering test.

## Notes

- Add `-j/--json` to any query command for machine-readable output.
- Add `.codegraph/` to `.gitignore` if it isn't already.
- `codegraph daemon` / `serve` are for MCP hosts — unused by pi.
- Symbol not found → try `codegraph query` first; `callers`/`impact` need a name
  the index knows (methods are stored as `Class.method`).
