# Project Decisions

Manage `PROJECT_DECISIONS.md` — a structured log of decisions made during meetings.

## What it does

- Extracts decisions from meeting summaries in `02.Meetings/summaries/`.
- Maintains a structured Markdown file at `00.Tasks/PROJECT_DECISIONS.md`.
- Supports backfill, processing individual files, manual add, show by date/category, and keyword search.

## File structure

Decisions are grouped by date (`## YYYY-MM-DD`, newest first). Under each date, categories appear as `### Category` sub-sections:

- Architectural
- Technical
- Team management
- Project management
- Process
- Security & compliance
- Cost & governance

## Files

- `SKILL.md` — the full procedure and category guide.
- `extract_decisions.py` — helper script that extracts and writes decisions.
- `.decision_state.json` — state file for tracking processed summaries.
