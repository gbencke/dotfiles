# Decision SVG

Extract architectural decisions from an Obsidian note and render them as an inline SVG diagram.

## What it does

- Reads a target markdown note.
- Identifies decisions, rejections, and the meeting where each decision was locked.
- Produces a self-contained SVG embedded in the note inside an Obsidian `[!info]` callout.

## Output

- Inline `<svg>` inside `### Decision Map` section of the host note.
- Black background, white boxes and arrows, chronological top-down flow.
- No external files, no plugins required.

## Files

- `SKILL.md` — the extraction rules, SVG layout contract, and procedure.
