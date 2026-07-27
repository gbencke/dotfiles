# Claude Code

Skills for Claude Code. Copy or symlink `skills/*` into `~/.claude/skills/`.

## skills/

Adversarial review — multi-agent code review that runs propose → kill → judge
per lens, then writes a report and `findings.json` under
`.gbencke/adversarial-review/reports/`.

| Path | Purpose |
|------|---------|
| `review-change/` | Review a PR, branch diff, or patch file. Trigger: `/review-change <pr-url\|pr-number\|branch\|patch-file> [base]`. |
| `review-repo/` | Review an entire repository. Trigger: `/review-repo [path]`. |
| `adversarial-review/` | Shared assets both skills read: `CONTEXT.md` (glossary), `agents/` (reviewer, challenger, judge), `lenses/` (14 review lenses), `docs/` (architecture, ADRs). No `SKILL.md` — not a skill itself. |

Ported verbatim from `pi/extensions/adversarial-review/` (minus `index.ts`).
The `SKILL.md` files still name pi's `Agent` tool and `@tintinweb/pi-subagents`;
retarget them to Claude Code's subagent tool before running there.
