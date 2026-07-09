# Meeting Action Items

Generate a per-person action-items report from meeting summaries in the Obsidian vault.

## What it does

- Reads meeting summaries from `02.Meetings/summaries/`.
- Extracts every action item.
- Groups them by owner across all summaries (or a date range).
- Writes the result as a markdown file at the repo root.

## Output

```
<repo-root>/Meeting.Action.Items.<YYYY-MM-DD>.md
```

## Usage

If a date or date range is provided, only summaries in that window are processed. Otherwise all summaries are processed.

## Files

- `SKILL.md` — the full extraction and report procedure.
