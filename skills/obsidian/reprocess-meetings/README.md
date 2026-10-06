# Reprocess Meetings

Improve a day's meeting notes from a folder of meeting exports that you supply at run time.

## What it does

- Pairs each export with the vault transcript for the same meeting (by content, not by name).
- Appends a `## Reprocessed Segments` section with speech the vault transcript missed or garbled.
- Converts meetings the vault lacks into transcript + summary pairs.
- Adds the new facts to the summaries, then updates the daily summary, workstream files, project decisions, action items, and topic files for that day.

## Usage

```
/reprocess-meetings            # previous weekday
/reprocess-meetings 2026-09-28
```

The skill asks for the export folder each run and never writes its path or the tool's name into the vault.

## Files

- `SKILL.md`: the workflow.
- `reprocess_meetings.py`: `scan`, `merge`, `convert`, `sync-entry`, `selftest`.

## Check

```
PYTHONDONTWRITEBYTECODE=1 python3 .pi/skills/reprocess-meetings/reprocess_meetings.py selftest
```
