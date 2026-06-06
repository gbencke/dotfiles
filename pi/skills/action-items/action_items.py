#!/usr/bin/env python3
"""
action_items.py — Manage ACTION_ITEMS.guilherme_bencke.md

Usage:
  python3 action_items.py add "Action text" [--meeting "Meeting Name"] [--time "HH:MM"] [--date "YYYY-MM-DD"]
  python3 action_items.py show [--days N]
  python3 action_items.py search "keyword"
"""

import argparse
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

ACTION_FILE = Path(
    "/home/gbencke/git.work/331.obsidian-scripts/00.Tasks/"
    "ACTION_ITEMS.guilherme_bencke.md"
)

PERSON = "Guilherme Bencke"
DATE_HEADER_RE = re.compile(r"^## (\d{4}-\d{2}-\d{2})$")


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


def cmd_add(args: argparse.Namespace) -> None:
    target_date = args.date or date.today().isoformat()
    meeting = args.meeting or "Manual Entry"
    time_str = args.time or ""

    source = f"*({meeting}{', ' + time_str if time_str else ''})*"
    bullet = f"- **{PERSON}**: {args.text} {source}\n"

    content = read_file()
    segments = parse_sections(content)

    # Find the segment for the target date.
    for i, (seg_date, lines) in enumerate(segments):
        if seg_date == target_date:
            # Insert bullet right after the `## YYYY-MM-DD` header line.
            header_line = lines[0]
            rest = lines[1:]
            # Skip the blank line immediately after the header, if any.
            insert_at = 1
            if rest and rest[0].strip() == "":
                insert_at = 2
            segments[i] = (seg_date, [header_line] + rest[:insert_at - 1] + [bullet] + rest[insert_at - 1:])
            write_file(segments_to_content(segments))
            print(f"Added under {target_date}:\n  {bullet.strip()}")
            return

    # Date section doesn't exist — create it directly after the file header.
    new_section_lines = [
        f"\n## {target_date}\n",
        "\n",
        bullet,
    ]

    # Find insertion point: just before the first existing date section.
    for i, (seg_date, _) in enumerate(segments):
        if seg_date is not None:
            segments.insert(i, (target_date, new_section_lines))
            break
    else:
        # No date sections yet — append.
        segments.append((target_date, new_section_lines))

    write_file(segments_to_content(segments))
    print(f"Created section {target_date} and added:\n  {bullet.strip()}")


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
            if line.startswith("- ") and keyword in line.lower():
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
