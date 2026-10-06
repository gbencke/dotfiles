#!/usr/bin/env python3
"""
reprocess_meetings.py -- mechanical helpers for the /reprocess-meetings skill.

Compares a day's meeting exports (a folder the user supplies at run time) with
the vault's transcripts, appends segments the vault transcript missed or
garbled, converts meetings the vault lacks, and mirrors daily-summary sections
into workstream files.

Export format: markdown files named `YYYY-MM-DD.<Name>.md` holding blocks of
    **Speaker Name** `MM:SS`
    line one
    line two

Subcommands
  scan    --source DIR [--date D]
          Pair each export with a vault transcript; report offset, speaker map,
          and how many segments would be added. Unmatched exports need `convert`.
  merge   --source DIR [--date D] [--skip FILE@MM:SS ...] [--write]
          Append a "## Reprocessed Segments" section to each paired transcript.
          Dry run unless --write. --skip uses the export file and export time.
  convert --source DIR --file NAME --title TITLE [--date D] [--type SLUG]
          [--when "11:00 AM"] [--speaker "Speaker 1=Katie Portnoy" ...]
          [--skip MM:SS ...] [--force]
          Write 02.Meetings/transcripts/<date>.<TITLE>.Transcript.md.
  sync-entry --date D "<Workstream>" ...
          Rebuild the "### D" entry of each workstream file from the matching
          "## <Workstream>" section of the daily summary (keeps Daily Notes).
  selftest
          Run the built-in checks.

Default date: the previous weekday.
"""

import argparse
import collections
import datetime as dt
import re
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
TRANSCRIPTS = ROOT / "02.Meetings" / "transcripts"
DAILY_SUMMARY = ROOT / "00.Tasks" / "Daily.Summary"
SECTION = "## Reprocessed Segments"
NOISE = re.compile(r"^(recording in progress|recording recordings|this meeting is being recorded)\.?$", re.I)
MATCH_MIN = 0.15      # share of an export's trigrams found in a vault transcript
UNCLEAR_MAX = 0.5     # segments below this trigram coverage count as garbled
UNCLEAR_MIN_WORDS = 8


# ---------- parsing ----------

def secs(ts):
    total = 0
    for part in ts.split(":"):
        total = total * 60 + int(part)
    return total


def mmss(x):
    x = int(x)
    return f"{x // 60:02d}:{x % 60:02d}"


def words(s):
    return re.findall(r"[a-z0-9']+", s.lower())


def grams(ws, n=3):
    return {tuple(ws[i:i + n]) for i in range(len(ws) - n + 1)}


def export_blocks(path):
    """[(MM:SS, speaker, text)] from an export file."""
    text = path.read_text()
    text = text.split("## Transcript", 1)[-1]
    out = []
    for m in re.finditer(r"^\*\*(.+?)\*\* `([0-9:]+)`\n(.*?)(?=^\*\*[^*\n]+\*\* `|\Z)", text, re.S | re.M):
        body = " ".join(l.strip() for l in m.group(3).splitlines() if l.strip())
        if body and not NOISE.match(body):
            out.append((m.group(2), m.group(1).strip(), body))
    return out


def export_duration(path):
    m = re.search(r"\*\*Duration:\*\*\s*(\d+)\s*min", path.read_text())
    return int(m.group(1)) if m else None


def vault_blocks(path):
    """[(MM:SS, speaker, text)] from a vault transcript, ignoring any reprocessed section."""
    text = path.read_text().split("\n" + SECTION, 1)[0]
    return [(m.group(2), m.group(1), m.group(3))
            for m in re.finditer(r"^\*\*(.+?)\*\* \*\[([0-9:]+)\]\*: (.*)$", text, re.M)]


# ---------- analysis ----------

def overlap(eb, vb):
    eg = grams(words(" ".join(b for _, _, b in eb)))
    vg = grams(words(" ".join(b for _, _, b in vb)))
    return len(eg & vg) / max(1, len(eg))


def analyse(eb, vb, skip=()):
    """Offset (export - vault seconds), speaker map, and the segments to add."""
    vgr = [(secs(t), s, grams(words(b))) for t, s, b in vb]
    everything = set().union(*(g for _, _, g in vgr)) if vgr else set()
    offs, votes = [], collections.defaultdict(collections.Counter)
    for t, s, b in eb:
        g = grams(words(b))
        if len(g) < 4:
            continue
        best = max(vgr, key=lambda x: len(g & x[2]))
        if len(g & best[2]) >= 3:
            votes[s][best[1]] += len(g & best[2])
            offs.append(secs(t) - best[0])
    off = statistics.median(offs) if offs else 0
    names = {s: c.most_common(1)[0][0] for s, c in votes.items()}
    start, end = secs(vb[0][0]), secs(vb[-1][0])
    picks = []
    for t, s, b in eb:
        if t in skip:
            continue
        ws = words(b)
        x = secs(t) - off
        outside = x < start - 5 or x > end + 5
        cov = sum(g in everything for g in grams(ws)) / max(1, len(grams(ws)))
        if outside or (len(ws) >= UNCLEAR_MIN_WORDS and cov < UNCLEAR_MAX):
            picks.append({"src": t, "at": x, "speaker": names.get(s, s), "text": b, "outside": outside})
    return off, names, picks


def render_section(picks, day):
    lines = ["", "---", "", SECTION, "",
             f"> Reprocessed {day}: segments missing from or unclear in the transcript above. "
             "`pre-start` marks speech before the recording began.", ""]
    for p in picks:
        ts = "pre-start" if p["at"] < 0 else mmss(p["at"])
        lines += [f"**{p['speaker']}** *[{ts}]*: {p['text']} ", ""]
    return "\n".join(lines)


def pair_up(src_dir, day):
    exports = sorted(src_dir.glob(f"{day:%Y-%m-%d}.*.md"))
    vaults = sorted(TRANSCRIPTS.glob(f"{day:%Y.%m.%d}.*.Transcript.md"))
    vcache = {v: vault_blocks(v) for v in vaults}
    result = []
    for e in exports:
        eb = export_blocks(e)
        scored = sorted(((overlap(eb, vb), v) for v, vb in vcache.items() if vb), reverse=True)
        best = scored[0] if scored else (0.0, None)
        result.append((e, eb, best if best[0] >= MATCH_MIN else (best[0], None)))
    return result, vaults


# ---------- subcommands ----------

def source_dir(arg):
    p = Path(arg).expanduser()
    if (p / "transcripts").is_dir():
        p = p / "transcripts"
    if not p.is_dir():
        raise SystemExit(f"Source folder not found: {p}")
    return p


def parse_skips(values):
    out = collections.defaultdict(set)
    for v in values or []:
        name, _, ts = v.rpartition("@")
        if not name or not ts:
            raise SystemExit(f"--skip must look like FILE@MM:SS, got {v!r}")
        out[name].add(ts)
    return out


def cmd_scan(args):
    day = args.date
    pairs, vaults = pair_up(source_dir(args.source), day)
    print(f"Date {day}: {len(pairs)} export(s), {len(vaults)} vault transcript(s)\n")
    matched = set()
    for e, eb, (score, v) in pairs:
        n_words = sum(len(words(b)) for _, _, b in eb)
        print(f"== {e.name}  ({export_duration(e)} min, {len(eb)} blocks, {n_words} words)")
        if n_words < 20:
            print("   SHORT: almost no speech; skip unless it holds work content")
        if v is None:
            speakers = list(dict.fromkeys(s for _, s, _ in eb))
            print(f"   NO MATCH (best overlap {score:.2f}) -> convert; speakers: {', '.join(speakers)}")
            continue
        matched.add(v)
        vb = vault_blocks(v)
        off, names, picks = analyse(eb, vb)
        done = SECTION in v.read_text()
        print(f"   MATCH {v.name}  overlap {score:.2f}  offset {off:+.0f}s{'  (already reprocessed)' if done else ''}")
        print("   speakers: " + ", ".join(f"{k}={n}" for k, n in sorted(names.items())))
        before = sum(p["at"] < secs(vb[0][0]) - 5 for p in picks)
        after = sum(p["outside"] for p in picks) - before
        print(f"   segments to add: {len(picks)} ({sum(len(words(p['text'])) for p in picks)} words; "
              f"{before} before start, {after} after end)")
    for v in vaults:
        if v not in matched:
            print(f"-- vault only (no export): {v.name}")


def cmd_merge(args):
    day = args.date
    skips = parse_skips(args.skip)
    pairs, _ = pair_up(source_dir(args.source), day)
    for e, eb, (_, v) in pairs:
        if v is None:
            continue
        text = v.read_text()
        if SECTION in text:
            print(f"== {v.name}: already reprocessed, skipped")
            continue
        _, _, picks = analyse(eb, vault_blocks(v), skips.get(e.name, set()))
        print(f"== {v.name}: {len(picks)} segment(s) from {e.name}")
        for p in picks:
            ts = "pre-start" if p["at"] < 0 else mmss(p["at"])
            print(f"   [{ts}] ({e.name}@{p['src']}) {p['speaker']}: {p['text'][:140]}")
        if args.write and picks:
            v.write_text(text.rstrip("\n") + "\n" + render_section(picks, dt.date.today().isoformat()))
            print("   written")
    if not args.write:
        print("\nDry run. Re-run with --write (add --skip FILE@MM:SS for segments to leave out).")


def ordinal(n):
    return f"{n}{'th' if 11 <= n % 100 <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def cmd_convert(args):
    day = args.date
    src = source_dir(args.source) / args.file
    if not src.exists():
        raise SystemExit(f"Export not found: {args.file}")
    smap = {}
    for pair in args.speaker or []:
        label, sep, name = pair.partition("=")
        if not sep:
            raise SystemExit(f"--speaker must look like LABEL=Name, got {pair!r}")
        smap[label.strip()] = name.strip()
    skip = set(args.skip or [])
    blocks = [(mmss(secs(t)), smap.get(s, s), b) for t, s, b in export_blocks(src) if t not in skip]
    if not blocks:
        raise SystemExit(f"No speech in {args.file}")
    people = list(dict.fromkeys(s for _, s, _ in blocks))
    dest = TRANSCRIPTS / f"{day:%Y.%m.%d}.{args.title}.Transcript.md"
    if dest.exists() and not args.force:
        raise SystemExit(f"Exists (use --force to overwrite): {dest.name}")
    when = f"{ordinal(day.day)} {day:%b, %Y}" + (f" - {args.when}" if args.when else "")
    out = ["---", "category: meeting-transcript", f'description: "Transcript of {args.title}."', "participants:"]
    out += [f"  - {p}" for p in people]
    out += [f"creation: {day}", f"last_updated: {day}", "tags:", "  - meeting/transcript",
            f"  - meeting/type/{args.type}/transcript", "---", "",
            f"#meeting #meeting/transcript #meeting/type/{args.type}/transcript", "",
            f"# {args.title}", "", f"**Meeting Date:** {when}", "", "---", ""]
    for t, s, b in blocks:
        out += [f"**{s}** *[{t}]*: {b} ", ""]
    dest.write_text("\n".join(out))
    print(f"wrote {dest.relative_to(ROOT)}  participants: {', '.join(people)}")


def workstream_file(name):
    r = subprocess.run([sys.executable, str(ROOT / "05.Scripts" / "daily_workstream_update.py"),
                        "workstream-file", name], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(r.stderr.strip() or r.stdout.strip())
    return Path(r.stdout.strip())


def build_entry(summary_text, name, day, old_entry=""):
    m = re.search(rf"^## {re.escape(name)}\n(.*?)(?=^---\n|\Z)", summary_text, re.S | re.M)
    if not m:
        raise SystemExit(f"No '## {name}' section in the daily summary")
    sec = m.group(1)
    src = re.search(r"^> Source meetings:.*$", sec, re.M)
    if not src or "### What was discussed\n" not in sec or "### Action Items\n" not in sec:
        raise SystemExit(f"'## {name}' needs a Source meetings line, What was discussed, and Action Items")
    discussed, actions = sec.split("### What was discussed\n", 1)[1].split("### Action Items\n", 1)
    link = f"> [[{day:%Y.%m.%d}.WorkstreamUpdates.Summary#{name}|Daily Summary — {day}]]"
    entry = (f"### {day}\n\n##### Meetings\n{link}\n{src.group(0)}\n\n{discussed.strip()}\n\n"
             f"##### Action Items\n\n{actions.strip()}\n\n")
    if "##### Daily Notes" in old_entry:
        entry = entry + old_entry[old_entry.index("##### Daily Notes"):].rstrip("\n") + "\n\n"
    return entry + "---\n\n"


def cmd_sync_entry(args):
    day = args.date
    summary = (DAILY_SUMMARY / f"{day:%Y.%m.%d}.WorkstreamUpdates.Summary.md").read_text()
    for name in args.workstreams:
        path = workstream_file(name)
        text = path.read_text()
        old = re.search(rf"^### {day}\n.*?(?:^---\n\n?|\Z)", text, re.S | re.M)
        if old:
            text = text.replace(old.group(0), build_entry(summary, name, day, old.group(0)), 1)
        else:
            first = re.search(r"^### \d{4}-\d{2}-\d{2}", text, re.M)
            at = first.start() if first else len(text)
            text = text[:at] + build_entry(summary, name, day) + text[at:]
        text = re.sub(r"^last updated: .*$", f"last updated: {day}", text, count=1, flags=re.M)
        path.write_text(text)
        print(f"{'updated' if old else 'added'} {day} in {path.relative_to(ROOT)}")


# ---------- self-check ----------

def selftest(_args=None):
    global TRANSCRIPTS
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        src, TRANSCRIPTS = tmp / "src", tmp / "vault"
        src.mkdir(); TRANSCRIPTS.mkdir()
        (src / "2026-01-05.Sync.md").write_text(
            "# Sync\n**Duration:** 3 min\n## Transcript\n\n"
            "**Speaker 1** `00:10`\nRecording in progress.\n\n"
            "**Speaker 1** `00:20`\nWe agreed to ship the location time zone fix before the chatbot work starts.\n\n"
            "**Speaker 2** `00:40`\nClassic has one concept called pending edits and it only warns the other user.\n\n"
            "**Speaker 1** `03:30`\nOne more thing after the call ended about the lease table design.\n")
        (src / "2026-01-05.Other.md").write_text(
            "# Other\n## Transcript\n\n**Katie** `00:05`\nCompletely different words about copay prompts today.\n")
        vault = TRANSCRIPTS / "2026.01.05.TeamSync.Transcript.md"
        vault.write_text(
            "**Ana Lima** *[00:00]*: We agreed to ship the location time zone fix before the chatbot work starts. \n\n"
            "**Bo Tamm** *[00:20]*: Ee classic hass one kontsept pending. \n\n"
            "**Ana Lima** *[02:00]*: Fine. \n")
        pairs, _ = pair_up(src, dt.date(2026, 1, 5))
        found = {e.name: v for e, _, (_, v) in pairs}
        assert found["2026-01-05.Sync.md"] == vault, found
        assert found["2026-01-05.Other.md"] is None, found
        eb = export_blocks(src / "2026-01-05.Sync.md")
        assert len(eb) == 3, eb  # noise line dropped
        off, names, picks = analyse(eb, vault_blocks(vault))
        assert off == 20 and names["Speaker 1"] == "Ana Lima", (off, names)
        assert [p["src"] for p in picks] == ["00:40", "03:30"], picks  # garbled + after end
        assert picks[1]["outside"] and not picks[0]["outside"]
        assert analyse(eb, vault_blocks(vault), {"00:40"})[2][0]["src"] == "03:30"
        vault.write_text(vault.read_text() + render_section(picks, "2026-01-06"))
        assert len(vault_blocks(vault)) == 3  # reprocessed section is ignored on re-read
        summary = ("## X - Y\n\n> Source meetings: [[a|A]]\n\n### What was discussed\n\n**T**\n- b\n\n"
                   "### Action Items\n\n- **P**: do *(A, 01:00)*\n\n---\n")
        entry = build_entry(summary, "X - Y", dt.date(2026, 1, 5), "### 2026-01-05\n\n##### Daily Notes\n- n\n\n---\n")
        assert "> Source meetings: [[a|A]]" in entry and "##### Daily Notes\n- n" in entry and entry.endswith("---\n\n")
        assert ordinal(1) == "1st" and ordinal(12) == "12th" and ordinal(23) == "23rd"
    print("selftest OK")


# ---------- entrypoint ----------

def previous_weekday(today=None):
    d = (today or dt.date.today()) - dt.timedelta(days=1)
    while d.weekday() >= 5:
        d -= dt.timedelta(days=1)
    return d


def parse_date(s):
    return dt.date.fromisoformat(s.replace(".", "-")) if s else previous_weekday()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("scan"); p.add_argument("--source", required=True); p.add_argument("--date")
    p.set_defaults(func=cmd_scan)
    p = sub.add_parser("merge"); p.add_argument("--source", required=True); p.add_argument("--date")
    p.add_argument("--skip", action="append"); p.add_argument("--write", action="store_true")
    p.set_defaults(func=cmd_merge)
    p = sub.add_parser("convert"); p.add_argument("--source", required=True); p.add_argument("--date")
    p.add_argument("--file", required=True); p.add_argument("--title", required=True)
    p.add_argument("--type", default="technical-refinement"); p.add_argument("--when")
    p.add_argument("--speaker", action="append"); p.add_argument("--skip", action="append")
    p.add_argument("--force", action="store_true"); p.set_defaults(func=cmd_convert)
    p = sub.add_parser("sync-entry"); p.add_argument("--date"); p.add_argument("workstreams", nargs="+")
    p.set_defaults(func=cmd_sync_entry)
    sub.add_parser("selftest").set_defaults(func=selftest)

    args = ap.parse_args()
    if hasattr(args, "date"):
        args.date = parse_date(args.date)
    args.func(args)


if __name__ == "__main__":
    main()
