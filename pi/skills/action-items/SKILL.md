---
name: action-items
description: >
  Manage Guilherme Bencke's personal action-item log at
  00.Tasks/ACTION_ITEMS.guilherme_bencke.md. Supports adding new items under
  today's date (or any explicit date), showing recent items, and searching by
  keyword across the full history.
  Use when asked to "add action item", "log an action item", "update my action
  items", "add to my TODO", "show my recent action items", "search action
  items", or invokes /action-items.
---

# Action Items Skill

Reads and writes
`/home/gbencke/git.work/331.obsidian-scripts/00.Tasks/ACTION_ITEMS.guilherme_bencke.md`.

The file is organised as date sections (`## YYYY-MM-DD`, newest first) with
bullet items in this format:

```
- **Guilherme Bencke**: <action text> *(<Meeting name>, <timestamp>)*
```

All operations go through the helper script at `action_items.py` (relative to
this skill file).

---

## Operations

### 1 — Add an action item

```bash
python3 /home/gbencke/.pi/agent/skills/action-items/action_items.py add \
  "ACTION TEXT" \
  [--meeting "Meeting Name"] \
  [--time "HH:MM"] \
  [--date "YYYY-MM-DD"]
```

- `action text` — the full action description (required)
- `--meeting` — meeting or source name (default: `Manual Entry`)
- `--time` — timestamp inside the meeting, e.g. `14:32` (optional)
- `--date` — target date in `YYYY-MM-DD` format (default: today)

**Behaviour:**
- If the target date section already exists, the new bullet is prepended
  immediately after the section header.
- If the date section does not exist, a new `## YYYY-MM-DD` section is created
  at the top of the date list (above all existing date sections).

### 2 — Show recent items

```bash
python3 /home/gbencke/.pi/agent/skills/action-items/action_items.py show \
  [--days N]
```

- `--days` — how many past days to include (default: 7)

Prints all sections whose date is within the window, preserving the original
formatting.

### 3 — Search by keyword

```bash
python3 /home/gbencke/.pi/agent/skills/action-items/action_items.py search \
  "KEYWORD"
```

Case-insensitive full-text search across all bullet lines. Prints each match
prefixed with its date section.

---

## Workflow Guidance

### Adding items from a meeting summary

When the user provides a list of action items from a meeting (e.g. extracted
from a transcript or summary), add each one individually with the same
`--meeting` and `--date` values:

```bash
python3 /home/gbencke/.pi/agent/skills/action-items/action_items.py add \
  "Follow up with Rebecca on the API contract" \
  --meeting "PlatformSync" --time "14:15" --date "2026-05-31"

python3 /home/gbencke/.pi/agent/skills/action-items/action_items.py add \
  "Review Hasitha's PR before Thursday" \
  --meeting "PlatformSync" --time "22:30" --date "2026-05-31"
```

### Adding a manual (no-meeting) item

```bash
python3 /home/gbencke/.pi/agent/skills/action-items/action_items.py add \
  "Draft the Aurora consolidation proposal" \
  --meeting "Daily Note"
```

### Showing today's items

```bash
python3 /home/gbencke/.pi/agent/skills/action-items/action_items.py show --days 1
```

---

## File Location

```
/home/gbencke/git.work/331.obsidian-scripts/00.Tasks/ACTION_ITEMS.guilherme_bencke.md
```

The file is an Obsidian markdown note. Do not reformat or reorder existing
content — the script inserts only at the top of the relevant date section and
never modifies existing lines.

---

## Output Format After Adding

After each `add` call, confirm to the user with a brief summary:

> Added to **2026-05-31**:
> - **Guilherme Bencke**: Follow up with Rebecca on the API contract *(PlatformSync, 14:15)*

If multiple items were added in one request, list them all together grouped by
date.
