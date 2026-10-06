#!/usr/bin/env python3
"""
action_items.py — Manage ACTION_ITEMS.guilherme_bencke.md

Usage:
  python3 action_items.py add "Action text" --subtopic "_Sub.Topic" [--meeting "Meeting Name"] [--time "HH:MM"] [--date "YYYY-MM-DD"] [--important]
  python3 action_items.py show [--days N]
  python3 action_items.py search "keyword"

Format: each date section contains a markdown table, rows sorted by sub-topic.
  | ★ | Sub-topic | Action |               ← header (sections before 2026-09 have no Sub-topic column)
  |   | [[_Sub.Topic]] | action text *(Meeting, time)* |   ← normal
  | ⭐ | [[_Sub.Topic]] | action text *(Meeting, time)* |   ← important
  Rows with no matching sub-topic use "—" and sort last.
"""

import argparse
import re
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # repo root
ACTION_FILE = ROOT / "00.Tasks" / "ACTION_ITEMS.guilherme_bencke.md"
SUMMARIES_DIR = ROOT / "02.Meetings" / "summaries"
SUMMARY_STEM_RE = re.compile(r"^(?P<date>\d{4}\.\d{2}\.\d{2})\.(?P<name>.+)\.[Ss]ummary$")

PERSON = "Guilherme Bencke"
DATE_HEADER_RE = re.compile(r"^## (\d{4}-\d{2}-\d{2})$")
TABLE_ROW_RE = re.compile(r"^\| [⭐ ] \|")
TABLE_SEP_RE = re.compile(r"^\|[-| ]+\|$")
TABLE_HEADER = "| ★ | Sub-topic | Action |\n|---|---|---|\n"
NO_SUBTOPIC = "—"
SUBTOPICS_INDEX = ROOT / "00.Tasks" / "Topics" / "All Sub-Topics.md"
IMPORTANT_MARKER = "⭐"
NORMAL_MARKER = " "


def _normalize(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def find_summary_stem(target_date: str, meeting_name: str) -> str | None:
    """Find the summary filename stem (no .md) matching date + meeting name."""
    date_dotted = target_date.replace("-", ".")
    norm_target = _normalize(meeting_name)
    if not norm_target or not SUMMARIES_DIR.is_dir():
        return None
    for f in SUMMARIES_DIR.glob(f"{date_dotted}.*.md"):
        m = SUMMARY_STEM_RE.match(f.stem)
        if m and m.group("date") == date_dotted and _normalize(m.group("name")) == norm_target:
            return f.stem
    return None


def link_meeting(target_date: str, meeting_name: str) -> str:
    """
    Resolve a meeting name (or ' / '-joined list of names) to Obsidian
    wikilink(s) pointing at the matching summary note(s). Falls back to the
    plain name for any part that can't be resolved.
    """
    # Rows live inside a markdown table, so the `|` in `[[note|alias]]` must
    # be escaped as `\|` — an unescaped pipe would otherwise be read as a
    # new table column and wreck the row.
    stem = find_summary_stem(target_date, meeting_name)
    if stem:
        return f"[[{stem}\\|{meeting_name}]]"

    parts = [p.strip() for p in meeting_name.split("/")]
    if len(parts) > 1:
        resolved = []
        for part in parts:
            part_stem = find_summary_stem(target_date, part)
            resolved.append(f"[[{part_stem}\\|{part}]]" if part_stem else part)
        if any(p.startswith("[[") for p in resolved):
            return " / ".join(resolved)

    return meeting_name


def read_file() -> str:
    return ACTION_FILE.read_text(encoding="utf-8")


def write_file(content: str) -> None:
    ACTION_FILE.write_text(content, encoding="utf-8")


def parse_sections(content: str) -> list[tuple[str | None, list[str]]]:
    """
    Returns a list of (date_str | None, lines) segments.
    The first segment (date=None) is the file header.
    """
    segments: list[tuple[str | None, list[str]]] = []
    current_date: str | None = None
    current_lines: list[str] = []

    for line in content.splitlines(keepends=True):
        m = DATE_HEADER_RE.match(line.rstrip())
        if m:
            segments.append((current_date, current_lines))
            current_date = m.group(1)
            current_lines = [line]
        else:
            current_lines.append(line)

    segments.append((current_date, current_lines))
    return segments


def segments_to_content(segments: list[tuple[str | None, list[str]]]) -> str:
    return "".join("".join(lines) for _, lines in segments)


def _last_table_row_idx(lines: list[str]) -> int | None:
    """Return index of the last table data row, or None if no table exists."""
    last = None
    for i, line in enumerate(lines):
        if TABLE_ROW_RE.match(line):
            last = i
    return last


def _has_table(lines: list[str]) -> bool:
    return any(TABLE_ROW_RE.match(l) for l in lines)


def _has_subtopic_column(lines: list[str]) -> bool:
    return any(l.startswith("| ★ | Sub-topic |") for l in lines)


def _subtopic_cell(subtopic: str) -> str:
    """Return the table cell for a sub-topic; exit if it is not in the index."""
    s = subtopic.strip().removeprefix("[[").removesuffix("]]")
    if s == NO_SUBTOPIC:
        return NO_SUBTOPIC
    if f"[[{s}]]" not in SUBTOPICS_INDEX.read_text(encoding="utf-8"):
        raise SystemExit(
            f"Unknown sub-topic '{s}'. Use a name listed in {SUBTOPICS_INDEX} "
            f"(e.g. _Scheduling.Rules) or '{NO_SUBTOPIC}' when none fits."
        )
    return f"[[{s}]]"


def _subtopic_sort_key(row: str) -> tuple[bool, str]:
    cell = row.split(" | ")[1].strip("[]").lstrip("_").lower()
    return (cell == NO_SUBTOPIC, cell)


def _sort_rows(lines: list[str]) -> list[str]:
    """Stable-sort the contiguous table rows of a section by sub-topic."""
    idx = [i for i, l in enumerate(lines) if TABLE_ROW_RE.match(l)]
    rows = sorted((lines[i] for i in idx), key=_subtopic_sort_key)
    out = list(lines)
    for i, row in zip(idx, rows):
        out[i] = row
    return out


def cmd_add(args: argparse.Namespace) -> None:
    target_date = args.date or date.today().isoformat()
    meeting = args.meeting or "Manual Entry"
    time_str = args.time or ""

    linked_meeting = link_meeting(target_date, meeting) if meeting != "Manual Entry" else meeting
    source = f"*({linked_meeting}{', ' + time_str if time_str else ''})*"
    marker = IMPORTANT_MARKER if args.important else NORMAL_MARKER
    action = f"**{PERSON}**: {args.text} {source}"
    row = f"| {marker} | {_subtopic_cell(args.subtopic)} | {action} |\n"

    content = read_file()
    segments = parse_sections(content)

    for i, (seg_date, lines) in enumerate(segments):
        if seg_date == target_date:
            if _has_table(lines):
                # Append after the last table row, then keep rows sorted by sub-topic.
                idx = _last_table_row_idx(lines)
                if _has_subtopic_column(lines):
                    new_lines = _sort_rows(lines[:idx + 1] + [row] + lines[idx + 1:])
                else:  # legacy two-column section
                    row = f"| {marker} | {action} |\n"
                    new_lines = lines[:idx + 1] + [row] + lines[idx + 1:]
            else:
                # No table yet — insert header + row after the section heading.
                header_line = lines[0]
                rest = lines[1:]
                insert_at = 1
                if rest and rest[0].strip() == "":
                    insert_at = 2
                table_lines = [*TABLE_HEADER.splitlines(keepends=True), row]
                new_lines = (
                    [header_line]
                    + rest[: insert_at - 1]
                    + table_lines
                    + rest[insert_at - 1 :]
                )
            segments[i] = (seg_date, new_lines)
            write_file(segments_to_content(segments))
            flag = " [IMPORTANT]" if args.important else ""
            print(f"Added under {target_date}{flag}:\n  {row.strip()}")
            return

    # Date section does not exist — create it.
    new_section_lines = [
        f"\n## {target_date}\n",
        "\n",
        *TABLE_HEADER.splitlines(keepends=True),
        row,
    ]
    for i, (seg_date, _) in enumerate(segments):
        if seg_date is not None:
            segments.insert(i, (target_date, new_section_lines))
            break
    else:
        segments.append((target_date, new_section_lines))

    write_file(segments_to_content(segments))
    flag = " [IMPORTANT]" if args.important else ""
    print(f"Created section {target_date} and added{flag}:\n  {row.strip()}")


def cmd_show(args: argparse.Namespace) -> None:
    days = args.days
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    content = read_file()
    segments = parse_sections(content)

    printed = False
    for seg_date, lines in segments:
        if seg_date and seg_date >= cutoff:
            print("".join(lines))
            printed = True

    if not printed:
        print(f"No action items in the last {days} day(s).")


def cmd_search(args: argparse.Namespace) -> None:
    keyword = args.keyword.lower()
    content = read_file()
    segments = parse_sections(content)

    found: list[str] = []
    for seg_date, lines in segments:
        if seg_date is None:
            continue
        for line in lines:
            if TABLE_ROW_RE.match(line) and keyword in line.lower():
                found.append(f"[{seg_date}] {line.strip()}")

    if found:
        print(f"Found {len(found)} item(s) matching '{args.keyword}':\n")
        for item in found:
            print(f"  {item}")
    else:
        print(f"No items found matching '{args.keyword}'.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Manage ACTION_ITEMS.guilherme_bencke.md"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # add
    p_add = sub.add_parser("add", help="Add a new action item")
    p_add.add_argument("text", help="Action item text")
    p_add.add_argument("--meeting", default="", help="Meeting name or source")
    p_add.add_argument("--time", default="", help="Timestamp inside the meeting (e.g. 05:30)")
    p_add.add_argument("--date", default="", help="Target date YYYY-MM-DD (default: today)")
    p_add.add_argument("--subtopic", required=True,
                       help="Sub-topic note name from All Sub-Topics.md, e.g. _Scheduling.Rules, or — when none fits")
    p_add.add_argument("--important", action="store_true", help="Mark as important ([!] checkbox)")
    p_add.set_defaults(func=cmd_add)

    # show
    p_show = sub.add_parser("show", help="Show recent action items")
    p_show.add_argument("--days", type=int, default=7, help="Number of past days to show (default: 7)")
    p_show.set_defaults(func=cmd_show)

    # search
    p_search = sub.add_parser("search", help="Search action items by keyword")
    p_search.add_argument("keyword", help="Keyword to search for")
    p_search.set_defaults(func=cmd_search)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
