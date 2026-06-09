#!/usr/bin/env python3
"""
action_items.py — Manage ACTION_ITEMS.guilherme_bencke.md

Usage:
  python3 action_items.py add "Action text" [--meeting "Meeting Name"] [--time "HH:MM"] [--date "YYYY-MM-DD"] [--important]
  python3 action_items.py show [--days N]
  python3 action_items.py search "keyword"

Format: each date section contains a two-column markdown table.
  | [ ] | action text *(Meeting, time)* |   ← normal
  | [!] | action text *(Meeting, time)* |   ← important (clickable in Obsidian, ignored by Tasks plugin)
"""

import argparse
import re
from datetime import date, timedelta
from pathlib import Path

ACTION_FILE = Path(
    "/home/gbencke/git.work/331.obsidian-scripts/00.Tasks/"
    "ACTION_ITEMS.guilherme_bencke.md"
)

PERSON = "Guilherme Bencke"
DATE_HEADER_RE = re.compile(r"^## (\d{4}-\d{2}-\d{2})$")
TABLE_ROW_RE = re.compile(r"^\| [⭐ ] \|")
TABLE_SEP_RE = re.compile(r"^\|[-| ]+\|$")
TABLE_HEADER = "| ★ | Action |\n|---|---|\n"
IMPORTANT_MARKER = "⭐"
NORMAL_MARKER = " "


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


def cmd_add(args: argparse.Namespace) -> None:
    target_date = args.date or date.today().isoformat()
    meeting = args.meeting or "Manual Entry"
    time_str = args.time or ""

    source = f"*({meeting}{', ' + time_str if time_str else ''})*"
    marker = IMPORTANT_MARKER if args.important else NORMAL_MARKER
    row = f"| {marker} | **{PERSON}**: {args.text} {source} |\n"

    content = read_file()
    segments = parse_sections(content)

    for i, (seg_date, lines) in enumerate(segments):
        if seg_date == target_date:
            if _has_table(lines):
                # Append after the last table row.
                idx = _last_table_row_idx(lines)
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
