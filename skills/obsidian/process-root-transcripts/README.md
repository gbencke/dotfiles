# Process Root Transcripts

Convert `*.txt` transcripts at the Obsidian vault root into meeting transcript + summary pairs.

## What it does

- Discovers `*.txt` files at the repo root.
- Validates that each file contains parseable transcript entries (`HH:MM:SS` timestamp lines preceded by speaker names).
- Generates Obsidian meeting transcript and summary files in `02.Meetings/`.
- Commits and pushes the result.

## Notes

- No API key is used; the summary is authored in-session by the agent.
- Source `.txt` files are not deleted or moved.
- A single filename can be passed to process only that file.

## Files

- `SKILL.md` — the full discovery, validation, and generation workflow.
