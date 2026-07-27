# Claude Code

Skills for Claude Code.

## Install

```sh
mkdir -p ~/.claude/skills
cp -r claude/skills/. ~/.claude/skills/        # or symlink each subdir
```

Then **restart Claude Code** — it indexes `~/.claude/skills/` at startup, so
`/review-change` and `/review-repo` are not invocable until you do.
`Skill(review-repo)` returning `Unknown skill` means the restart is still
pending.

Requirements: Claude Code's built-in `Agent` tool (no plugin needed), plus `gh`
on `PATH` for PR-based change reviews.

## skills/

Adversarial review — multi-agent code review that runs propose → kill → judge
per lens, then writes a report and `findings.json` under
`.gbencke/adversarial-review/reports/` **in the reviewed repo**.

| Path | Purpose |
|------|---------|
| `review-change/` | Review a PR, branch diff, or patch file. Trigger: `/review-change <pr-url\|pr-number\|branch\|patch-file> [base]`. |
| `review-repo/` | Review an entire repository. Trigger: `/review-repo [path]`. |
| `adversarial-review/` | Shared assets both skills read: `CONTEXT.md` (glossary), `agents/` (reviewer, challenger, judge prompt templates), `lenses/` (14 review lenses), `docs/` (architecture, ADRs). No `SKILL.md` — not a skill itself, just a payload directory. |

Both `SKILL.md` files refer to the shared directory as `BASE_DIR` and resolve it
to `~/.claude/skills/adversarial-review/`. **If you install the shared assets
anywhere else, update that path in both files** — nothing discovers it
dynamically.

## Usage notes

- **The lens picker is mandatory.** Each skill lists the lenses whose signals
  match the target and waits for confirmation before spawning any agent. Pass
  `--lenses a,b,c` in the argument to name lenses explicitly and skip the
  prompt (this is the CI path).
- **Cost scales as lenses × chunks.** A whole-repo review of ~30k lines with
  all matched lenses is on the order of 100 subagents. Start with
  `--lenses <one>` to shake out a new install, or narrow the target path.
- **Project lens overlay.** A `.gbencke/adversarial-review/lenses/` directory in
  the reviewed repo adds repo-local lenses; same-named lenses merge, with the
  project's `rules.md` appended after the global one.
- **Nothing is executed.** Reviews never run repo code, tests, builds, or
  cloud/API calls — static reading plus existing artifacts only
  (`docs/adr/0002-execution-boundary.md`). `gh` / `git diff` for input
  gathering are the only exceptions.

## Provenance

Ported from `pi/extensions/adversarial-review/` (minus `index.ts`). The two
`SKILL.md` files and `CONTEXT.md` have been retargeted from pi's
`@tintinweb/pi-subagents` `Agent` tool to Claude Code's built-in `Agent` tool
(`subagent_type: general-purpose`), and the former "extension base dir"
references are now the explicit `BASE_DIR` above.

Files under `adversarial-review/docs/` still describe the original pi packaging
(install paths, `~/.pi/agent/settings.json`, model configuration). They are
design documentation — architecture and ADRs — accurate about *how the loop
works*; only their install/runtime sections are pi-specific. The lens rule packs
and agent prompt templates are host-agnostic and were not modified.
