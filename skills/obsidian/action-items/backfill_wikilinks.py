#!/usr/bin/env python3
"""
backfill_wikilinks.py — one-off: add source-note wikilinks to existing rows
in ACTION_ITEMS.guilherme_bencke.md that predate the auto-link feature.

Usage:
  python3 backfill_wikilinks.py [--apply]

Dry-run by default: prints a diff-style summary. Pass --apply to write.
"""

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from action_items import ACTION_FILE, DATE_HEADER_RE, link_meeting  # noqa: E402

# Captures the meeting/time text plus the exact trailing tail (closing `|`,
# spaces, newline) so the tail can be reinserted unchanged — `\s` matches `\n`,
# so a naive trailing `$` anchor would silently eat the line break.
ROW_SOURCE_RE = re.compile(r"\*\(([^)]*)\)\*([ \t]*\|[ \t]*\r?\n?)$")


def backfill(content: str) -> tuple[str, list[str]]:
    lines = content.splitlines(keepends=True)
    current_date = None
    changes: list[str] = []

    for i, line in enumerate(lines):
        m = DATE_HEADER_RE.match(line.rstrip())
        if m:
            current_date = m.group(1)
            continue
        if current_date is None:
            continue

        m = ROW_SOURCE_RE.search(line)
        if not m:
            continue
        inner = m.group(1)
        if "[[" in inner:
            continue  # already linked

        # inner is "Meeting Name" or "Meeting Name, HH:MM"
        if "," in inner:
            meeting_part, _, time_part = inner.rpartition(",")
            meeting_part = meeting_part.strip()
            time_part = time_part.strip()
        else:
            meeting_part, time_part = inner.strip(), ""

        linked = link_meeting(current_date, meeting_part)
        if linked == meeting_part:
            continue  # nothing resolved, leave as-is

        new_inner = f"{linked}, {time_part}" if time_part else linked
        tail = m.group(2)
        new_line = line[: m.start()] + f"*({new_inner})*" + tail
        if new_line != line:
            lines[i] = new_line
            changes.append(f"[{current_date}] {meeting_part!r} -> linked")

    return "".join(lines), changes


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write changes (default: dry-run)")
    args = parser.parse_args()

    content = ACTION_FILE.read_text(encoding="utf-8")
    new_content, changes = backfill(content)

    print(f"{len(changes)} row(s) would be updated with wikilinks.")
    unresolved_note = "Rows whose meeting name has no matching summary file are left untouched."
    print(unresolved_note)

    if args.apply:
        if changes:
            ACTION_FILE.write_text(new_content, encoding="utf-8")
            print(f"Applied {len(changes)} update(s) to {ACTION_FILE}.")
        else:
            print("Nothing to apply.")
    else:
        print("Dry-run only — pass --apply to write changes.")


if __name__ == "__main__":
    main()
