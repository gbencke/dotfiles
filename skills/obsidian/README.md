# Obsidian Skills

Skills that operate on the Obsidian markdown vault at `/home/gbencke/git.work/331.obsidian-scripts`. They read meeting summaries, transcripts, and task files, then produce structured notes, reports, and diagrams.

## Skills

| Skill | What it does |
|-------|--------------|
| `action-items` | Add, show, and search personal action items in `00.Tasks/ACTION_ITEMS.guilherme_bencke.md`. |
| `article.reorganization` | Reorganize a flat article into Parts and Chapters, then regenerate a PDF. |
| `daily-digest` | Curate a daily architecture/tech briefing from Hacker News, Lobsters, GitHub Trending, InfoQ, and engineering blogs. |
| `daily-workstream-update` | Run the daily workstream sync: summarize meetings, update workstream files, decisions, and action items, then publish to git. |
| `decision-svg` | Extract decisions from a note and render them as an inline SVG diagram. |
| `deep-dive` | Generate a 16-section deep-dive technical document from meeting transcripts and summaries. |
| `meeting-action-items` | Generate a per-person action-items report across all meeting summaries. |
| `process-root-transcripts` | Convert `*.txt` transcripts at the repo root into Obsidian transcript + summary pairs. |
| `project-decisions` | Extract and maintain `PROJECT_DECISIONS.md` from meeting summaries. |
| `storm` | Run the STORM deep research and writing pipeline. |

## Common files

Most skills rely on:

- `02.Meetings/summaries/` — meeting summary notes.
- `02.Meetings/transcripts/` — full meeting transcripts.
- `00.Tasks/` — action items, workstreams, project decisions.
- `01.Technical/product/deep dives/` — deep-dive output.
- `__.DailyDigest/` — daily digest output.

Many skills include a `SKILL.md` prompt and a small helper script, such as `action_items.py` or `extract_decisions.py`.
