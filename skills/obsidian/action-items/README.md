# Action Items

Manage the personal action-item log at `00.Tasks/ACTION_ITEMS.guilherme_bencke.md` in the Obsidian vault.

## Files

- `SKILL.md` — agent instructions and command reference.
- `action_items.py` — helper script that reads and writes the action-items file.

## What it does

- Adds new action items under the current date (or any explicit date).
- Shows recent action items.
- Searches the full history by keyword.

## Usage

```bash
python3 action_items.py add "ACTION TEXT" \
  --meeting "Meeting Name" \
  --time "HH:MM" \
  --date "YYYY-MM-DD"

python3 action_items.py show [--days N]

python3 action_items.py search KEYWORD
```

The target file is organised by date sections (`## YYYY-MM-DD`, newest first), with bullet items in this format:

```markdown
- **Guilherme Bencke**: <action text> *(<Meeting name>, <timestamp>)*
```
