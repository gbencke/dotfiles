# Agent Skills

This repository holds task-specific skills for an AI agent. Each skill is a self-contained bundle of instructions, scripts, and configuration that teaches the agent how to perform a focused job — from managing an Obsidian vault to reviewing Go code to downloading media.

## Layout

| Directory | Purpose |
|-------------|---------|
| `obsidian/` | Workflows that interact with an Obsidian markdown vault: action items, meeting summaries, decisions, daily digests, and deep dives. |
| `programming.languages/` | Language-specific guidance and review checklists. Currently Go. |
| `review/` | Code review and analysis skills: diagnosis, change amplification, possibility analysis, and strict quality audits. |
| `utils/` | General utilities: skill discovery, bookmark management, transcript viewing, and media download. |
| `writing/` | Prose and technical-writing skills: the Zinsser method and ASD-STE100 Simplified Technical English. |

## How a skill works

Each skill lives in its own directory and normally contains:

- `SKILL.md` — the main prompt and procedure the agent follows.
- Optional helper scripts, binaries, tests, or config files.
- A short `name` and `description` in YAML frontmatter so the agent can match user requests to the right skill.

The agent triggers a skill when the user asks for it by name or uses an associated phrase.

## Conventions

- Skills are grouped by domain, not by tool.
- Instructions are explicit: they state when to use the skill, the expected output, and any files or environment variables involved.
- Scripts referenced by `SKILL.md` are runnable from the skill directory or from the target vault/repo.

## Adding a skill

1. Create a new directory under the relevant domain folder.
2. Add a `SKILL.md` with frontmatter `name` and `description`.
3. Add any helper scripts, binaries, or tests next to it.
4. Update the README in the parent directory.
