# Pi Extensions

This directory contains the TypeScript implementations for the custom tools and capabilities provided to the Pi AI Coding Agent. 

These extensions are loaded dynamically and register various functions that the agent can invoke during its reasoning process.

## Available Extensions

- **`codegraph/`**: Wraps the `codegraph` CLI as three tools (`codegraph_explore`, `codegraph_affected_tests`, `codegraph_status`) plus a `/codegraph` command, so the agent queries a pre-indexed `.codegraph/` knowledge graph instead of grepping and reading files. Measured at **−80.6% tokens and −62.2% cost** against a grep+read baseline. Requires `codegraph` on PATH. Design notes below; tests in `codegraph/codegraph.test.ts`.
- **`context7.ts`**: Implements tools to search the Context7 library index and fetch high-quality documentation snippets.
- **`lsp.ts`**: Implements Language Server Protocol features (diagnostics, definitions, hover) using `ast-grep` and `typescript-language-server`.
- **`obscura.ts`**: Provides web scraping and headless browser capabilities via the Obscura engine.
- **`tavily.ts`**: Integrates Tavily AI search to allow the agent to search the web for recent documentation or solutions.
- **`tools-command.ts`**: Implements a `/tools` slash command to list all available tools to the user in the agent's UI.
- **`adversarial-review/`**: Adversarial multi-agent code review (`/review-repo`, `/review-change`). Per-lens reviewers propose findings, adversarial challengers kill weak ones, a judge rules. Ships 12 markdown lenses (aws, design, docs, tests, chaos, security, performance, error-handling, typescript, golang, test-surface, blast-radius). Requires `@tintinweb/pi-subagents`. Docs in `adversarial-review/docs/`.

---

## codegraph — design notes and measurements

The obvious design for this extension is wrong in four ways that only show up
when you measure. Each finding below cost a benchmark run to establish, so
re-read this before "improving" the tool surface.

### Measured results

One question — *"How is the Playwright test fixture / world set up, and what
does the setup wire together?"* — against a 975-file TypeScript repo, run
through `pi --mode json --print` and summed across assistant turns.

| Version | Tool calls | Tokens | Cost | Tool mix |
|---|---|---|---|---|
| baseline (no codegraph) | 46 | 581,721 | $1.0195 | `read`=36 `bash`=10 |
| v1 five-tool menu | 42 | 480,543 | $0.8176 | `node`=31 `explore`=3 |
| v2 + node budget rule | 47 | 409,929 | $0.7944 | `node`=28 `query`=6 |
| v3 + per-call cost table | 34 | 430,441 | $0.7708 | `node`=3 `read`=18 |
| v4 one-tool surface | 30 | 236,517 | $0.6015 | `explore`=2 `read`=25 |
| **v5 + budget-aware skill** | **7** | **112,749** | **$0.3854** | `explore`=2-5, 0 file reads |

v5 is the median of 5 runs (range 59k–210k tokens). **−80.6% tokens, −62.2%
cost.** Four of five runs did zero file reads.

### Finding 1 — one tool beats a menu

The five-tool surface (`explore`/`query`/`node`/`relations`/`status`) was the
worst performing version. The agent picked `codegraph_node` 31 times and used it
to page through the codebase one symbol at a time.

Upstream measured the same thing and ships **only `codegraph_explore`** in its
MCP server, leaving the rest unlisted: *"one strong tool steers agents better
than a menu of narrower ones — fewer mis-picks, and it saves context every
session."*

Everything the removed tools returned already arrives inline on one `explore`
call — the blast-radius section covers `impact`, the relationship map covers
`callers`/`callees`, and a pinned name covers `query`. Asking separately buys
nothing and costs a round trip. A test asserts the three-tool surface so this
does not regress.

### Finding 2 — `explore` is also the read tool

`codegraph explore "src/auth/session.ts"` returns line-numbered source with
`1 file pinned from the query` — the same shape `read` gives. This is why
`codegraph_node` is gone, and why the tool description says **"treat the
returned source as already read."**

That one instruction produced the single largest drop in the table (v3 → v4).

### Finding 3 — `max_files` was a knob that did nothing

Explore scales its own output budget to the repo's indexed file count
(`<500`→1 call, `<5000`→2, `<15000`→3, `<25000`→4, `≥25000`→5). Capping it
barely moves the output and starves the answer:

| flag | output |
|---|---|
| default | 25,046 chars |
| `--max-files 5` | 24,998 chars |
| `--max-files 10` | 22,375 chars |

The parameter was removed. A test asserts it stays removed — exposing a knob
that does nothing just invites the agent to fiddle with it.

### Finding 4 — obey the budget line, don't forbid fallback

Every explore response ends with its own budget, e.g. *"Explore budget: 2 calls
for this project (975 files indexed). Each call covers ~6 files... spend your
remaining calls on the uncovered area BEFORE falling back to Read. Synthesize
once you've used 2."*

The skill originally said "never fall back to read", which contradicts the
tool's own instruction and the arithmetic — a question spanning 26 files cannot
be covered by 2 calls × ~6 files. The agent resolved the conflict by reading 25
files anyway. Rewriting the skill to mirror the budget semantics (spend
remaining calls on the uncovered area, then **synthesize and answer**; split a
question that is too broad) took it from 30 calls to a median of 7.

Remaining variance (59k–210k tokens) tracks question breadth. Narrow questions
sit at the low end.

### Bugs this surface actually hit

Both are covered by regression tests:

- **`/codegraph <path>` reported `Project: /`.** Pi hands a slash command's tail
  to the handler as a **raw string, not an argv array**, so `args[0]` was the
  leading `/` of the path. The handler now normalises both shapes. *(Note:
  `tavily.ts` has the same latent bug — it calls `args.join(" ")` on a string.)*
- **A bad `path` blamed the install.** A non-existent `cwd` makes `execFile`
  throw the same `ENOENT` a missing binary does, so the handler told users to
  `npm install -g @colbymchenry/codegraph` when they had simply typo'd a path.
  The path is now checked before spawning.

### Trade-off worth knowing

Upstream measures that codegraph's dense payloads leave roughly **80% more
retrieval context resident** at the end of a session than a grep-and-read
agent's many small, evictable results. Fewer tokens *processed* and a larger
persistent *footprint* are both true at once. On long sessions in a small
window, budget for it.

### Running the tests

```bash
cd ~/.pi/agent/extensions/codegraph
NODE_PATH=~/.pi/agent/npm/node_modules npx tsx codegraph.test.ts
```

`typebox` resolves from pi's own npm root, hence `NODE_PATH`. The tests drive
the real `execFile` path against a fake `codegraph` binary on `PATH` that echoes
its argv — arg building is where this extension actually broke, so mocking the
exec layer would have missed both bugs above.

### Operational notes

- Indexing is the user's decision. No tool can trigger `init`, `index`,
  `uninit`, `install`, or `daemon`.
- Pi does not run codegraph's file watcher (that starts with `codegraph serve
  --mcp`), so the index does **not** auto-update here. Use
  `codegraph_status(action="sync")` after a rebase or out-of-session edits.
- If `status` reports `reindexRecommended: true`, the index was built by an
  older extraction engine and coverage suffers. Re-indexing two `~/git.work`
  repos from extraction v24 → v25 also deduplicated them heavily: one went from
  6,531 to 2,417 functions across 191 files while resolved imports rose from
  794 to 839.
- `~/git.work` itself carries a 20,919-file graph, so a query from that
  directory searches every repo at once. Pass `path` or `cd` into the repo.
