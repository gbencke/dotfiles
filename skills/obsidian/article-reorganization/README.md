# Article Reorganization

Reorganize a long, scattered Markdown article into a clean hierarchy of Parts and Chapters, then regenerate its PDF.

## When to use

Use this skill when an article has:

- A flat or scattered section structure.
- Related topics split across non-consecutive sections.
- A need for print/PDF output with Parts, Chapters, Table of Contents, and Index.

## Files

- `SKILL.md` — the full workflow and Pandoc command.

## Workflow

1. Read the source Markdown and list all top-level headers.
2. Propose a Part/Chapter plan.
3. Rewrite the Markdown: `#` for Parts, `##` for Chapters, shift internal headings down one level, add an unnumbered Preface and Index.
4. Generate the PDF with Pandoc using `--top-level-division=part`.

The `SKILL.md` contains the full Pandoc command and formatting rules.
