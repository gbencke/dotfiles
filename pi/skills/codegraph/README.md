# CodeGraph

Read a codebase through its pre-indexed knowledge graph instead of grepping and
reading files.

An agent exploring unfamiliar code normally does the same thing every session:
glob, grep, open a file, follow an import, open another. Dozens of tool calls
rebuilding structure that a parser could have established once. CodeGraph parses
the repo ahead of time into a SQLite graph of symbols, call edges and imports,
and answers structural questions from that graph.

**Measured on this setup: −80.6% tokens and −62.2% cost** against a grep+read
baseline, median of 5 runs on a 975-file TypeScript repo. Four of the five runs
opened zero files.

## Requirements

| Requirement | Notes |
|---|---|
| `codegraph` CLI on PATH | `npm install -g @colbymchenry/codegraph` |
| The `codegraph` pi extension | `pi/extensions/codegraph/` in this repo |
| An indexed repo | A `.codegraph/` directory, created by `codegraph init` |

The skill never indexes anything. Indexing is the user's decision and can take
minutes on a large repo, so no tool exposed to the agent can trigger it.

Without the extension the tools do not exist. Drive the CLI through bash in that
case — every tool maps to one subcommand.

## The three tools

### `codegraph_explore(query)`

The tool. It answers four different shapes of question in one call:

| You want | Query |
|---|---|
| How something works | `"how does the inbound event resolver work"` |
| A flow between two points | `"how does handleRequest reach executeQuery"` |
| A survey of an area | `"session storage, token refresh, cookie handling"` |
| The contents of a file | `"src/auth/session.ts"` |

That last row matters: naming a file path returns its line-numbered source, the
same shape `read` gives. Explore replaces `read` for indexed files.

`structure_only: true` returns a ~1 KB map of symbols and edges with no source
bodies. Use it to orient on a large unfamiliar area; the default full mode is
what answers questions.

### `codegraph_affected_tests(files)`

Which test files transitively depend on a list of changed files. The one
question explore cannot answer, because it takes a file list rather than a
query. Pair it with `git diff --name-only` when reviewing a change.

### `codegraph_status(action)`

`status` for index health, `files` for the indexed tree, `sync` for an
incremental update. Also available as `/codegraph [path]`.

## What one explore call returns

```
**Exploration: how does the calendar page wait for events**

Found 55 symbols across 3 files.

**Blast radius — what depends on these (update/verify before editing)**

- `CalendarPage` (src/pages/scheduler/calendar.page.ts:39) — 17 callers in ...
- `selectCalendarView` (src/pages/scheduler/calendar.page.ts:116) — 4 callers;
  tests: `src/tests/step-definitions/...`

**Relationships**
extends:    CalendarPage → BasePage
references: PagesFixtures → CalendarPage
calls:      isDisplayedInCalendar → waitFor
            ... and 66 more

[verbatim source for the relevant symbols, grouped by file]
```

Four things arrive that you did not separately ask for:

- **verbatim source** for the ranked symbols, grouped by file
- **call paths**, including callback and interface→impl hops grep cannot follow
- **blast radius** — what depends on each symbol
- **covering tests** — `tests:` per symbol

So there is no separate callers, callees, impact, or symbol-search step. Those
tools existed in an earlier version of this extension and made things measurably
worse; asking for that information separately buys nothing and costs a round
trip.

## The two rules

**1. Treat returned source as already read.** Do not re-open those files with
`read`. Do not re-verify with `grep`. Explore *is* the pre-built index — a
grep/read loop only repeats work the indexer already did. Adding this single
instruction produced the largest drop in the benchmark table.

**2. Obey the budget line.** Every response ends with something like:

> *Explore budget: 2 calls for this project (975 files indexed). Each call
> covers ~6 files; if your question spans more, spend your remaining calls on
> the uncovered area BEFORE falling back to Read. Synthesize once you've used 2.*

That budget is tuned to the repo's size:

| Indexed files | Calls | Chars per call |
|---|---|---|
| < 500 | 1 | ~18K |
| 500 – 5,000 | 2 | ~28K |
| 5,000 – 15,000 | 3 | ~35K |
| 15,000 – 25,000 | 4 | ~38K |
| ≥ 25,000 | 5 | ~38K |

Spend remaining calls on the **uncovered** area, then synthesize and answer. If
a question genuinely spans more files than `calls × files-per-call`, it is too
broad — split it, or name which part is uncovered. Do not start a read sweep to
buy completeness the budget did not cover.

An earlier version of this skill said "never fall back to read", which
contradicts both the tool's own instruction and the arithmetic. The agent
resolved the conflict by reading 25 files anyway.

## Writing a query that ranks well

Explore ranks on the names in your query. A vague question gets a vague answer,
and a vague answer is what tempts an agent back to grep.

- Name concrete symbols and files:
  `"SessionStore.refresh src/auth/session.ts token rotation"`
- Use qualified `Class.method` names when you know them — the ranker is
  overload-aware and a PascalCase type token biases toward that type's own
  definition.
- For a flow, name both ends.
- Files named in the query are pinned and sort first.

## Measurements

One question — *"How is the Playwright test fixture / world set up, and what
does the setup wire together?"* — against a 975-file TypeScript repo.

| Version | Calls | Tokens | Cost |
|---|---|---|---|
| baseline, no codegraph | 46 | 581,721 | $1.0195 |
| five-tool surface | 42 | 480,543 | $0.8176 |
| one-tool surface | 30 | 236,517 | $0.6015 |
| **+ budget-aware rules** | **7** | **112,749** | **$0.3854** |

Variance across runs was 59k–210k tokens. It tracks question breadth: narrow
questions sit at the low end, and a question spanning far more files than the
budget covers drifts toward the fallback behaviour.

## Tuning a noisy repo

If explore keeps surfacing scripts, fixtures or vendored code above real source,
add `codegraph.json` at the repo root:

```json
{
  "deprioritize": ["scripts/", "optional-skills/"],
  "exclude": ["static/vendor/"]
}
```

`deprioritize` drops paths in ranking while keeping them findable. `exclude`
removes them from the index — use it for committed vendor trees, since
`.gitignore` cannot drop a directory that is already tracked. Re-index after
changing the file.

## Troubleshooting

**Symbol not found.** Methods are indexed as `Class.method`. Search for the bare
name with an explore query first.

**Results look stale.** Pi does not run codegraph's file watcher — that starts
with `codegraph serve --mcp`, which pi never launches. The index does not
auto-update in this harness. Run `codegraph_status(action="sync")` after a
rebase or after edits made outside the session.

**`status` reports `reindexRecommended: true`.** The index was built by an older
extraction engine and coverage is below what the current build gives. Report it;
let the user decide. Re-indexing two repos here from extraction v24 to v25 also
deduplicated them heavily — one went from 6,531 to 2,417 functions across 191
files while resolved imports rose from 794 to 839.

**Everything returns results from the wrong repo.** `~/git.work` itself carries
a 20,919-file graph, so a query from that directory searches every repo at once.
Pass `path` or `cd` into the specific repo.

**`Project path does not exist`.** The `path` you passed is not on disk. This is
distinct from a missing CLI, which reports install instructions instead.

## Known trade-off

Explore cuts tokens *processed*, but its dense payloads stay resident in the
context window longer than many small grep results, which get evicted. Upstream
measures roughly **80% more retrieval context resident** at session end. Fewer
tokens processed and a larger persistent footprint are both true at once. On a
long session in a small window, budget for it.

## Files

- `SKILL.md` — the workflow the agent follows.

Design notes — why three tools and not nine, why explore has no output cap, and
the bugs found while building it — are in `pi/extensions/README.md`.
