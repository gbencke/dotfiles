#!/usr/bin/env python3
"""
extract_decisions.py — Extract project decisions from meeting summaries into
PROJECT_DECISIONS.md.

Usage:
  python3 extract_decisions.py backfill [--since YYYY-MM-DD] [--limit N] [--dry-run]
  python3 extract_decisions.py process PATH/TO/Summary.md [PATH2 ...]
  python3 extract_decisions.py add "Decision text" --category CATEGORY --meeting "Name" [--date YYYY-MM-DD]
  python3 extract_decisions.py show [--category CATEGORY]
  python3 extract_decisions.py search "keyword"
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import date, datetime
from pathlib import Path

import anthropic

# ── Paths ─────────────────────────────────────────────────────────────────────

VAULT = Path("/home/gbencke/git.work/331.obsidian-scripts")
SUMMARIES_DIR = VAULT / "02.Meetings/summaries"
DECISIONS_FILE = VAULT / "00.Tasks/PROJECT_DECISIONS.md"
STATE_FILE = Path(__file__).parent / ".decision_state.json"

# ── Category config ────────────────────────────────────────────────────────────

CATEGORIES: dict[str, str] = {
    "architectural":      "🏗️ Architectural",
    "technical":          "🔧 Technical",
    "team_management":    "👥 Team Management",
    "project_management": "📋 Project Management",
    "process":            "⚙️ Process",
    "security_compliance":"🔒 Security & Compliance",
    "cost_governance":    "💰 Cost & Governance",
}

CATEGORY_ORDER = list(CATEGORIES.keys())

# ── Claude config ──────────────────────────────────────────────────────────────

MODEL = "claude-sonnet-4-5"
BATCH_SIZE = 4   # summaries per API call

EXTRACTION_SYSTEM = """\
You are an expert at reading engineering meeting summaries and extracting \
concrete decisions — choices that were explicitly agreed upon, accepted, or \
confirmed by the group. Do NOT include action items, tasks, suggestions still \
under discussion, or things framed as "proposed" without agreement.

A decision is something the group settled on: a technical approach chosen, \
a scope confirmed, a process agreed, a priority locked, an ownership assigned.

For each decision return a JSON object with these exact fields:
  "category"   — one of: architectural, technical, team_management,
                  project_management, process, security_compliance, cost_governance
  "statement"  — 3–12 word bold-worthy decision headline (no verb padding)
  "rationale"  — one sentence explaining why, from the meeting context
  "meeting"    — the meeting name (from the document title / frontmatter)
  "date"       — the meeting date as YYYY-MM-DD

Return ONLY valid JSON: {"decisions": [...]}. No markdown, no commentary.\
"""

EXTRACTION_USER_TMPL = """\
Extract all decisions from the following meeting summary.

{content}
"""


# ── State management ───────────────────────────────────────────────────────────

def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"processed": {}}


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2))


def mark_processed(state: dict, path: Path) -> None:
    state["processed"][str(path)] = datetime.now().isoformat()


def is_processed(state: dict, path: Path) -> bool:
    return str(path) in state["processed"]


# ── Decisions file parser ──────────────────────────────────────────────────────

FILE_HEADER = """\
# Project Decisions

> Decisions extracted from meeting summaries, organised by date, newest first.
> Source: `02.Meetings/summaries/`. Updated by the `project-decisions` skill.

---
"""

DATE_RE = re.compile(r"^## (\d{4}-\d{2}-\d{2})$")
CATEGORY_RE = re.compile(r"^### (.+)$")


def _category_key(heading: str) -> str | None:
    """Reverse-lookup: heading string → category key."""
    for k, v in CATEGORIES.items():
        if v.strip() in heading:
            return k
    return None


def load_decisions() -> dict[str, dict[str, list[str]]]:
    """Returns {date_str: {category_key: [bullet_line, ...]}}"""
    data: dict[str, dict[str, list[str]]] = {}
    if not DECISIONS_FILE.exists():
        return data

    current_date: str | None = None
    current_cat: str | None = None

    for line in DECISIONS_FILE.read_text().splitlines():
        dm = DATE_RE.match(line)
        if dm:
            current_date = dm.group(1)
            current_cat = None
            if current_date not in data:
                data[current_date] = {}
            continue
        cm = CATEGORY_RE.match(line)
        if cm and current_date:
            current_cat = _category_key(cm.group(1))
            if current_cat and current_cat not in data[current_date]:
                data[current_date][current_cat] = []
            continue
        if line.startswith("- ") and current_date and current_cat:
            data[current_date][current_cat].append(line)

    return data


def save_decisions(data: dict[str, dict[str, list[str]]]) -> None:
    parts = [FILE_HEADER]

    for date_str in sorted(data.keys(), reverse=True):
        cats = data[date_str]
        if not any(cats.values()):
            continue
        parts.append(f"\n## {date_str}\n")
        for cat_key in CATEGORY_ORDER:
            bullets = cats.get(cat_key, [])
            if not bullets:
                continue
            parts.append(f"\n### {CATEGORIES[cat_key]}\n")
            for b in bullets:
                parts.append(b + "\n")
        parts.append("\n---\n")

    DECISIONS_FILE.write_text("".join(parts), encoding="utf-8")


def add_decision(
    data: dict[str, dict[str, list[str]]],
    category: str,
    statement: str,
    rationale: str,
    meeting: str,
    date_str: str,
) -> None:
    source = f"*({meeting})*"
    bullet = f"- **{statement}** — {rationale} {source}"
    date_entry = data.setdefault(date_str, {})
    date_entry.setdefault(category, [])
    # Deduplicate by statement
    existing_statements = [b.split("**")[1] for b in date_entry[category] if "**" in b]
    if statement in existing_statements:
        return
    date_entry[category].insert(0, bullet)


# ── Claude extraction ──────────────────────────────────────────────────────────

def extract_from_summary(client: anthropic.Anthropic, path: Path) -> list[dict]:
    """Send one summary to Claude and return a list of decision dicts."""
    content = path.read_text(encoding="utf-8")
    # Strip YAML frontmatter
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            content = content[end + 3:].lstrip()

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=EXTRACTION_SYSTEM,
            messages=[{"role": "user", "content": EXTRACTION_USER_TMPL.format(content=content)}],
        )
        raw = response.content[0].text.strip()
        # Strip accidental markdown fencing
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)
        parsed = json.loads(raw)
        return parsed.get("decisions", [])
    except Exception as exc:
        print(f"  ⚠️  Claude error for {path.name}: {exc}", file=sys.stderr)
        return []


def parse_date_from_filename(path: Path) -> str:
    """Extract YYYY-MM-DD from filenames like 2026.05.29.MeetingName.Summary.md"""
    m = re.match(r"(\d{4})\.(\d{2})\.(\d{2})", path.name)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return date.today().isoformat()


# ── Commands ───────────────────────────────────────────────────────────────────

def cmd_backfill(args: argparse.Namespace) -> None:
    since = args.since or "0000-01-01"
    limit = args.limit or 9999
    dry_run = args.dry_run

    state = load_state()
    data = load_decisions()
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    files = sorted(SUMMARIES_DIR.glob("*.md"))
    # Filter by date
    files = [
        f for f in files
        if parse_date_from_filename(f) >= since
    ]
    # Skip already-processed
    pending = [f for f in files if not is_processed(state, f)]
    pending = pending[:limit]

    total = len(pending)
    print(f"Found {total} unprocessed summaries to extract decisions from.")
    if dry_run:
        print("[dry-run] No changes will be written.")

    SAVE_EVERY = 10   # flush decisions + state every N files

    added = 0
    for i, path in enumerate(pending, 1):
        meeting_date = parse_date_from_filename(path)
        print(f"  [{i}/{total}] {path.name} ...", end=" ", flush=True)
        decisions = extract_from_summary(client, path)
        count = 0
        for d in decisions:
            cat = d.get("category", "").lower().replace(" ", "_")
            if cat not in CATEGORIES:
                cat = "process"  # fallback
            stmt = d.get("statement", "").strip()
            rat = d.get("rationale", "").strip()
            mtg = d.get("meeting", path.stem.replace(".Summary", "")).strip()
            dt = d.get("date", meeting_date)
            if stmt and not dry_run:
                add_decision(data, cat, stmt, rat, mtg, dt)
                count += 1
            elif stmt and dry_run:
                print(f"\n    [{cat}] {stmt}")
                count += 1
        added += count
        print(f"{count} decision(s)")
        if not dry_run:
            mark_processed(state, path)
            # Incremental save every SAVE_EVERY files so progress survives interrupts
            if i % SAVE_EVERY == 0:
                save_decisions(data)
                save_state(state)
                print(f"  [checkpoint] saved after {i} files ({added} decisions total)")
        # Rate-limit: pause briefly between files to be kind to the API
        if i < total:
            time.sleep(0.3)

    if not dry_run:
        save_decisions(data)
        save_state(state)
        print(f"\nDone. {added} decision(s) added across {total} summaries.")
        print(f"Written to: {DECISIONS_FILE}")
    else:
        print(f"\n[dry-run] Would add {added} decision(s) from {total} summaries.")


def cmd_process(args: argparse.Namespace) -> None:
    state = load_state()
    data = load_decisions()
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    for path_str in args.files:
        path = Path(path_str)
        if not path.exists():
            print(f"File not found: {path}", file=sys.stderr)
            continue
        meeting_date = parse_date_from_filename(path)
        print(f"Processing {path.name} ...")
        decisions = extract_from_summary(client, path)
        count = 0
        for d in decisions:
            cat = d.get("category", "").lower().replace(" ", "_")
            if cat not in CATEGORIES:
                cat = "process"
            stmt = d.get("statement", "").strip()
            rat = d.get("rationale", "").strip()
            mtg = d.get("meeting", path.stem).strip()
            dt = d.get("date", meeting_date)
            if stmt:
                add_decision(data, cat, stmt, rat, mtg, dt)
                count += 1
                print(f"  [{cat}] {stmt}")
        mark_processed(state, path)
        print(f"  → {count} decision(s) added.")

    save_decisions(data)
    save_state(state)


def cmd_add(args: argparse.Namespace) -> None:
    cat = args.category.lower().replace(" ", "_")
    if cat not in CATEGORIES:
        print(f"Unknown category '{args.category}'. Valid: {', '.join(CATEGORIES)}", file=sys.stderr)
        sys.exit(1)
    date_str = args.date or date.today().isoformat()
    data = load_decisions()
    add_decision(data, cat, args.text, args.rationale or "", args.meeting or "Manual Entry", date_str)
    save_decisions(data)
    print(f"Added to [{cat}] on {date_str}:\n  {args.text}")


def cmd_show(args: argparse.Namespace) -> None:
    data = load_decisions()
    cat_filter = args.category.lower().replace(" ", "_") if args.category else None

    for date_str in sorted(data.keys(), reverse=True):
        cats = data[date_str]
        date_printed = False
        for cat_key in CATEGORY_ORDER:
            if cat_filter and cat_key != cat_filter:
                continue
            bullets = cats.get(cat_key, [])
            if not bullets:
                continue
            if not date_printed:
                print(f"\n## {date_str}")
                date_printed = True
            print(f"\n### {CATEGORIES[cat_key]}")
            for b in bullets:
                print(b)


def cmd_search(args: argparse.Namespace) -> None:
    keyword = args.keyword.lower()
    data = load_decisions()
    found: list[str] = []

    for date_str in sorted(data.keys(), reverse=True):
        for cat_key in CATEGORY_ORDER:
            for b in data[date_str].get(cat_key, []):
                if keyword in b.lower():
                    found.append(f"[{date_str}] [{cat_key}] {b.strip()}")

    if found:
        print(f"Found {len(found)} item(s) matching '{args.keyword}':\n")
        for item in found:
            print(f"  {item}")
    else:
        print(f"No decisions found matching '{args.keyword}'.")


# ── CLI ────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Manage PROJECT_DECISIONS.md")
    sub = parser.add_subparsers(dest="command", required=True)

    # backfill
    p_bf = sub.add_parser("backfill", help="Extract decisions from all unprocessed summaries")
    p_bf.add_argument("--since", default="", help="Only process summaries on or after YYYY-MM-DD")
    p_bf.add_argument("--limit", type=int, default=0, help="Max number of files to process (0 = all)")
    p_bf.add_argument("--dry-run", action="store_true", help="Print decisions without writing")
    p_bf.set_defaults(func=cmd_backfill)

    # process
    p_proc = sub.add_parser("process", help="Process specific summary file(s)")
    p_proc.add_argument("files", nargs="+", help="Path(s) to summary .md file(s)")
    p_proc.set_defaults(func=cmd_process)

    # add
    p_add = sub.add_parser("add", help="Manually add a decision")
    p_add.add_argument("text", help="Decision statement (bold headline)")
    p_add.add_argument("--rationale", default="", help="One-sentence reason/context")
    p_add.add_argument("--category", required=True,
                       help=f"Category key: {', '.join(CATEGORIES)}")
    p_add.add_argument("--meeting", default="", help="Meeting or source name")
    p_add.add_argument("--date", default="", help="Date YYYY-MM-DD (default: today)")
    p_add.set_defaults(func=cmd_add)

    # show
    p_show = sub.add_parser("show", help="Print decisions to stdout")
    p_show.add_argument("--category", default="", help="Filter by category key")
    p_show.set_defaults(func=cmd_show)

    # search
    p_search = sub.add_parser("search", help="Search decisions by keyword")
    p_search.add_argument("keyword", help="Keyword to search for")
    p_search.set_defaults(func=cmd_search)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
