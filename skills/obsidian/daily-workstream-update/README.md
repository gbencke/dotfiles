# Daily Workstream Update

Run the daily workstream update workflow for the Obsidian vault.

## What it does

- Generates today's workstream summary from meeting summaries.
- Syncs individual workstream files.
- Copies daily-note entries into workstream files.
- Updates `PROJECT_DECISIONS.md`, `ACTION_ITEMS.guilherme_bencke.md`, and the Decisions tables in all Topic subtopic files.
- Publishes the result to git.

## Files

- `SKILL.md` — the full step-by-step procedure.

## Helper script

The Obsidian vault contains:

```
05.Scripts/daily_workstream_update.py
```

Run it with:

```bash
python3 05.Scripts/daily_workstream_update.py <subcommand> [--date YYYY-MM-DD]
```

Available subcommands: `today`, `meetings`, `workstreams`, `hierarchies-path`, `daily-summary-path`, `daily-note-path`, `workstream-file <name>`, `list-workstream-files`, `verify`, `move-daily-summary`, `git-publish "<msg>"`.
