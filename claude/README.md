# Claude Code

Gives Claude Code the same rules, skills and tools as pi. **pi is the source of truth**: Claude links to pi's files and never keeps its own copy.

## Install

```sh
claude/install.sh
```

Then **restart Claude Code**. It reads `~/.claude/skills/` only at startup.

The script is safe to re-run. It does four things:

1. Links `~/.claude/CLAUDE.md` to `claude/CLAUDE.md`, which imports `~/.pi/agent/SYSTEM.md` with `@~/.pi/agent/SYSTEM.md`.
2. Links every skill in `~/.pi/agent/skills/` and the archify package skill into `~/.claude/skills/`.
3. Links the Claude-only skills in `claude/skills/` and puts `claude-goal` on `PATH`.
4. Registers the MCP servers `codegraph`, `context7` and `tavily` at user scope. Keys come from the environment, never from the config.

Change shared rules in pi's `SYSTEM.md`. Put a rule in `claude/CLAUDE.md` only when it applies to Claude alone.

## How each pi extension maps to Claude Code

pi extensions are TypeScript modules that run inside pi and call its API. Claude Code cannot load them. Each feature moves to the Claude mechanism built for it: tools become MCP servers, commands become skills, and event handlers become hooks.

| pi extension           | Claude Code replacement                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `codegraph/`           | `codegraph serve --mcp` MCP server; `affected` and `status` through the CLI |
| `context7.ts`          | `@upstash/context7-mcp` MCP server                                          |
| `tavily.ts`            | `tavily-mcp` MCP server                                                     |
| `lsp.ts`               | Built-in `LSP` tool (`ENABLE_LSP=1` + language plugins) and `ast-grep`      |
| `obscura.ts`           | `obscura` skill, which calls the CLI through Bash                           |
| `pi-archify` package   | `archify` skill, which ships its own CLI                                    |
| `goal-loop/`           | `goal` skill + `claude-goal`: one fresh `claude -p` per attempt             |
| `adversarial-review/`  | `review-repo`, `review-change`, `review-consolidate` skills (below)         |
| `herdr-agent-state.ts` | herdr's own Claude integration (a SessionStart hook herdr installs)         |
| `tools-command.ts`     | Built-in `/mcp` and `/context`                                              |
| `openrouter-fusion.ts` | None. Claude Code sends requests only to Anthropic models                   |

The skills that name pi tools (`codegraph`, `codegraph-adhoc`, `context7`, `lsp`, `tavily`) each end with an "In Claude Code" section that gives the Claude tool names.

## Adversarial review skills

Adversarial review — propose → kill → judge per lens, then a report and
`findings.json` under `.gbencke/adversarial-review/reports/` **in the reviewed
repo**.

| Path                  | Purpose                                                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `review-repo/`        | Review an entire repository. Trigger: `/review-repo <path> [--lenses a,b,c]`. The path is required.                                                                                                                                                     |
| `review-change/`      | Review a PR, branch diff, or patch file. Trigger: `/review-change <pr-url\                                                                                                                                                                              |
| `review-consolidate/` | Review many repos in parallel, then merge everything into one document. Trigger: `/review-consolidate <repo> [<repo>...] --out <file.md>`. Repos and `--out` are both required.                                                                         |
| `adversarial-review/` | Shared assets every skill reads: `CONTEXT.md` (glossary), `agents/` (reviewer, challenger, judge role packs), `lenses/` (15 review lenses), `bin/` (matrix launcher + its self-check), `docs/` (architecture, ADRs). No `SKILL.md` — data, not a skill. |

Every `SKILL.md` refers to the shared directory as `BASE_DIR` and resolves it to
`~/.claude/skills/adversarial-review/`. **If you install the shared assets
anywhere else, update that path in all three files** — nothing discovers it
dynamically.

## Usage notes

- **No lens picker.** Every lens whose signals match the target runs, with no
  prompt — a prompt would deadlock the non-interactive `claude -p` processes a
  matrix run is made of. `--lenses a,b,c` narrows the set.
- **No subagents; parallelism is processes.** Each review runs the three roles
  inline in one process, normally scoped to one lens.
  `adversarial-review/bin/run-matrix.sh` fans out one `claude -p` process per
  (repo × lens), all at once, and leaves an exit code, a log, and a report path
  per pairing in `manifest.tsv` (`docs/adr/0004-no-subagents.md`).
- **Cost scales as repos × lenses.** 3 repos × 13 repo-capable lenses = 39
  concurrent processes. Shake out a new install with
  `--lenses <one>` on a single repo first.
- **Reports carry the lens** — `<timestamp>-<target>-<lens>.md` — because those
  parallel processes share one reports directory. Each review prints its
  artifact path on a final `REPORT: ` line; consolidation prints
  `CONSOLIDATED: `. Parse those instead of scanning mtimes.
- **Project lens overlay.** A `.gbencke/adversarial-review/lenses/` directory in
  the reviewed repo adds repo-local lenses; same-named lenses merge, with the
  project's `rules.md` appended after the global one.
- **Nothing in the reviewed repo is executed.** Reviews never run repo code,
  tests, builds, or cloud/API calls — static reading plus existing artifacts
  only (`docs/adr/0002-execution-boundary.md`). `gh` / `git diff` / JIRA fetch
  for input gathering are the only exceptions; launching `claude` itself is the
  one process the tooling starts.

## Standalone launcher

The matrix launcher works without Claude Code, and self-checks without starting
anything:

```sh
adversarial-review/bin/run-matrix.sh --runner claude --log-dir /tmp/logs ~/repo-a ~/repo-b
adversarial-review/bin/test-run-matrix.sh
```

It defaults to `--runner pi`; the skills pass `--runner claude` explicitly.

## Provenance

Ported from `pi/extensions/adversarial-review/` (minus `index.ts`, which only
registers the pi slash commands). The three `SKILL.md` files, `CONTEXT.md`, and
the runtime sections of `docs/` are retargeted from `pi -p` to `claude -p` and
from "extension base dir" to the explicit `BASE_DIR` above. Lens rule packs and
role packs are host-agnostic and unmodified.
