---
name: daily-workstream-update
description: >
  Run the daily workstream update workflow for the Obsidian vault. Generates
  today's workstream summary from meeting summaries, syncs individual workstream
  files, copies daily-note entries into workstream files, and publishes to git.
  Use when asked to "run daily workstream update", "generate daily summary",
  "sync workstreams", "update workstream files", or invokes /daily-workstream-update.
argument-hint: "[YYYY-MM-DD]"
---

# Daily Workstream Update Skill

Runs the `/daily-workstream-update` workflow for the Obsidian vault at
`/home/gbencke/git.work/331.obsidian-scripts`.

Today's date (or the argument provided) is the target date `D`.
If no argument is given, use today.

Helper script for all mechanical operations:

```bash
python3 05.Scripts/daily_workstream_update.py <subcommand> [--date D]
```

Available subcommands: `today`, `meetings`, `workstreams`, `hierarchies-path`,
`daily-summary-path`, `daily-note-path`, `workstream-file <name>`,
`list-workstream-files`, `verify`, `move-daily-summary`,
`git-publish "<msg>"`.

Run `python3 05.Scripts/daily_workstream_update.py -h` to recheck at any time.

Use the script for every date / path / file-listing / verification / git
operation. Do not hand-roll those.

---

## Step A — Generate today's workstream summary

1. Resolve the date:
   ```bash
   python3 05.Scripts/daily_workstream_update.py today [--date D]
   ```
2. List today's meeting summaries:
   ```bash
   python3 05.Scripts/daily_workstream_update.py meetings --date D
   ```
   If the list is empty, stop and tell the user there are no meetings for `D`.
3. Read the workstream reference:
   ```bash
   python3 05.Scripts/daily_workstream_update.py workstreams
   ```
   This is `00.Tasks/Workstreams.SubTasks.Hierarchies.md`.
4. Read the most recent existing file in `00.Tasks/Daily.Summary/` (sorted by
   date) — this is the **formatting model**. Match its frontmatter, heading
   hierarchy, source-meeting wikilinks, "What was discussed" / "Action Items"
   sections, and `---` separators exactly.
5. Read each meeting summary file from step 2 in full.
6. Write `<repo-root>/<D>.WorkstreamUpdates.Summary.md` (at the repo root, not
   yet in `00.Tasks/Daily.Summary/`). Include a `## <Workstream Name>` section
   **only** for workstreams from the hierarchies reference that were actually
   discussed in today's meetings. Use the exact workstream names from the
   hierarchies file as the `## ` headings.
7. Move the file into place:
   ```bash
   python3 05.Scripts/daily_workstream_update.py move-daily-summary --date D
   ```

---

## Step B — Verify workstream files contain today's entry, then publish

1. Run:
   ```bash
   python3 05.Scripts/daily_workstream_update.py verify --date D
   ```
2. For every `MISSING` line: open the workstream file shown and add a new
   `### <D-dashed>` section directly under the `#workstream/...` tag line (as
   the newest entry). Use the same per-day structure already in that file:
   `##### Meetings` block with summary + source links, body bullets grouped by
   topic, `##### Action Items`. Pull content from the corresponding
   `## <Workstream>` section in the daily summary produced in Step A. End the
   new section with a `---` separator before the previously-newest section.
3. For every `UNKNOWN` line: no workstream file matches that heading. Print a
   short note for the user — do not invent a file. The user decides whether to
   create one.
4. Re-run `verify` until it exits clean (only `OK` lines and any genuinely
   unresolvable `UNKNOWN` cases).
5. Publish:
   ```bash
   python3 05.Scripts/daily_workstream_update.py git-publish "Daily workstream summary <D-dashed>"
   ```

---

## Step C — Copy daily-note workstream entries into workstream files

1. Get today's daily note path:
   ```bash
   python3 05.Scripts/daily_workstream_update.py daily-note-path --date D
   ```
2. **Re-read** that file from disk now — the user may have updated it since
   this run started. Do not rely on cached content.
3. The daily note is organised as `### <Section Name>` blocks. For each section:
   - Map the section name to a workstream from the hierarchies reference (names
     are usually close but not identical — e.g. `### NewGen Performance` →
     `NewGen - Performance.Improvements`). Skip and note any section with no
     clear workstream mapping.
   - Resolve the workstream file:
     ```bash
     python3 05.Scripts/daily_workstream_update.py workstream-file "<workstream name>"
     ```
   - In that workstream file, locate today's `### <D-dashed>` section (created
     in Step B). Append a new block at the end of that day's section, **before**
     the closing `---` separator:
     ```markdown
     ##### Daily Notes
     <verbatim contents of the daily-note section, preserving checkboxes, links, and formatting>
     ```
   - If a `##### Daily Notes` block already exists for today, append the new
     bullets inside it rather than creating a duplicate heading.
4. Re-read the daily note after all edits to confirm nothing was missed.
5. Publish:
   ```bash
   python3 05.Scripts/daily_workstream_update.py git-publish "Copy daily-note workstream entries <D-dashed>"
   ```

---

## Final Report

After all three steps, print a concise summary:

- Daily summary written to: `00.Tasks/Daily.Summary/<D>.WorkstreamUpdates.Summary.md`
- Workstream files updated in Step B: list each
- Daily-note sections copied in Step C: `<section> → <workstream>`
- Anything skipped or unresolved (`UNKNOWN` workstreams, daily-note sections
  with no obvious workstream mapping)
- Two commits pushed

If any `git-publish` reports "nothing to commit", say so explicitly — that
means there was nothing new to write for `D`.
