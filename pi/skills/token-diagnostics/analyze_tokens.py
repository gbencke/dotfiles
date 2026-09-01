#!/usr/bin/env python3
"""Token usage diagnostics for Claude Code, pi, and opencode session logs.

Finds the harness log directory on its own, reads the last 7 days of sessions,
attributes tokens to their real causes (tool output, context growth, model
choice, subagents, startup overhead), and prints a standard summary with
ranked optimisation findings.

Three modes:
  analyze  this machine -> standard summary (markdown)
  export   this machine -> redacted JSON, safe to hand to a team lead
  merge    a directory of exported JSONs -> fleet summary

Stdlib only. Python 3.11+.
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sqlite3
import statistics
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

BYTES_PER_TOKEN = 4  # ponytail: crude but stable estimator; swap for tiktoken only if the error matters

# USD per 1M tokens: (input, output, cache_write, cache_read). First substring match wins.
PRICES: list[tuple[str, tuple[float, float, float, float]]] = [
    ("opus", (15.0, 75.0, 18.75, 1.50)),
    ("sonnet", (3.0, 15.0, 3.75, 0.30)),
    ("haiku", (0.80, 4.0, 1.0, 0.08)),
    ("gpt-5", (1.25, 10.0, 1.25, 0.125)),
    ("gpt-4o", (2.50, 10.0, 2.50, 1.25)),
    ("o3", (2.0, 8.0, 2.0, 0.50)),
    ("gemini-3", (2.0, 12.0, 2.0, 0.20)),
    ("gemini", (1.25, 10.0, 1.25, 0.31)),
    ("grok", (3.0, 15.0, 3.0, 0.75)),
    ("qwen", (0.40, 1.20, 0.40, 0.10)),
    ("deepseek", (0.28, 0.42, 0.28, 0.028)),
    ("glm", (0.60, 2.20, 0.60, 0.11)),
    ("kimi", (0.60, 2.50, 0.60, 0.15)),
]

# Tools whose output lands in context verbatim and is the usual source of bloat.
READ_TOOLS = {"read", "bash", "grep", "glob", "webfetch", "websearch", "task", "agent", "notebookread"}

# Images bill per tile, not per byte, so the byte estimator would be wildly wrong.
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".pdf", ".svg"}
IMAGE_TOKENS = 1_600
WRITE_TOOLS = {"edit", "write", "multiedit", "notebookedit", "apply_patch", "patch", "str_replace_editor"}


# --------------------------------------------------------------------------- models


@dataclass(eq=False)  # identity hashing: turns are dict keys in analyse()
class Turn:
    harness: str
    project: str
    session: str
    ts: float
    model: str
    inp: int = 0
    out: int = 0
    cache_read: int = 0
    cache_write: int = 0
    reasoning: int = 0
    cost: float | None = None
    sidechain: bool = False

    @property
    def context(self) -> int:
        """Input tokens billed for this turn: the whole conversation so far."""
        return self.inp + self.cache_read + self.cache_write

    def priced(self, prices: list) -> float:
        if self.cost is not None:
            return self.cost
        pi, po, pw, pr = lookup_price(self.model, prices)
        return (
            self.inp * pi + self.out * po + self.cache_write * pw + self.cache_read * pr
        ) / 1_000_000


@dataclass
class ToolUse:
    harness: str
    project: str
    session: str
    tool: str
    target: str
    out_bytes: int
    ok: bool = True


@dataclass
class SessionMeta:
    harness: str
    project: str
    session: str
    turns: int = 0
    started: float = 0.0
    ended: float = 0.0
    compactions: int = 0
    clears: int = 0
    models: set[str] = field(default_factory=set)


def lookup_price(model: str, prices: list) -> tuple[float, float, float, float]:
    m = (model or "").lower()
    for key, vals in prices:
        if key in m:
            return vals
    return (0.0, 0.0, 0.0, 0.0)


def ts_of(value) -> float:
    """Accept ISO strings, ms epochs, or s epochs."""
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return value / 1000.0 if value > 1e11 else float(value)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


def blob_bytes(value) -> int:
    if value is None:
        return 0
    if isinstance(value, str):
        return len(value)
    return len(json.dumps(value, default=str))


# --------------------------------------------------------------------------- loaders


def load_claude(root: Path):
    """~/.claude[/projects]/<project-slug>/<session-id>.jsonl"""
    base = root / "projects" if (root / "projects").is_dir() else root
    for path in sorted(base.glob("*/*.jsonl")):
        project, session = path.parent.name, path.stem
        meta = SessionMeta("claude", project, session)
        seen_requests: set[str] = set()
        pending: dict[str, tuple[str, str]] = {}  # tool_use_id -> (tool, target)
        for record in read_jsonl(path):
            kind = record.get("type")
            msg = record.get("message") or {}
            when = ts_of(record.get("timestamp"))
            if when:
                meta.started = meta.started or when
                meta.ended = max(meta.ended, when)

            if kind == "assistant":
                # Claude writes one line per streamed content block, all sharing a
                # requestId. Bill the request once, but read every line's blocks.
                rid = record.get("requestId")
                for block in msg.get("content") or []:
                    if isinstance(block, dict) and block.get("type") == "tool_use":
                        pending[block.get("id", "")] = (
                            (block.get("name") or "?").lower(),
                            claude_target(block.get("input") or {}),
                        )
                if rid and rid in seen_requests:
                    continue
                if rid:
                    seen_requests.add(rid)
                usage = msg.get("usage") or {}
                model = msg.get("model") or "unknown"
                meta.models.add(model)
                meta.turns += 1
                yield Turn(
                    "claude", project, session, when, model,
                    inp=usage.get("input_tokens", 0),
                    out=usage.get("output_tokens", 0),
                    cache_read=usage.get("cache_read_input_tokens", 0),
                    cache_write=usage.get("cache_creation_input_tokens", 0),
                    sidechain=bool(record.get("isSidechain")),
                )

            elif kind == "user":
                for block in msg.get("content") or []:
                    if not isinstance(block, dict) or block.get("type") != "tool_result":
                        continue
                    tool, target = pending.pop(block.get("tool_use_id", ""), ("?", ""))
                    yield ToolUse(
                        "claude", project, session, tool, target,
                        blob_bytes(block.get("content")),
                        ok=not block.get("is_error"),
                    )
                text = msg.get("content") if isinstance(msg.get("content"), str) else ""
                if "<command-name>/clear" in text:
                    meta.clears += 1
                if "<command-name>/compact" in text:
                    meta.compactions += 1

            elif record.get("isCompactSummary") or \
                    "compact" in str(record.get("subtype", "")).lower():
                meta.compactions += 1
        if meta.turns:
            yield meta


def claude_target(payload: dict) -> str:
    for key in ("file_path", "path", "notebook_path", "command", "pattern", "url", "prompt", "description"):
        if payload.get(key):
            return str(payload[key])
    return ""


def load_pi(root: Path):
    """~/.pi[/agent]/sessions/<slug>/<timestamp>_<id>.jsonl"""
    bases = [root / "agent" / "sessions", root / "sessions", root]
    base = next((b for b in bases if b.is_dir() and any(b.glob("*/*.jsonl"))), None)
    if base is None:
        return
    for path in sorted(base.glob("*/*.jsonl")):
        project = path.parent.name
        session = path.stem
        meta = SessionMeta("pi", project, session)
        model = "unknown"
        pending: dict[str, tuple[str, str]] = {}
        for record in read_jsonl(path):
            kind = record.get("type")
            when = ts_of(record.get("timestamp"))
            if when:
                meta.started = meta.started or when
                meta.ended = max(meta.ended, when)
            if kind == "model_change":
                model = record.get("modelId") or model
                continue
            if kind == "compaction" or "compact" in str(kind):
                meta.compactions += 1
                continue
            if kind != "message":
                continue
            msg = record.get("message") or {}
            role = msg.get("role")
            if role == "assistant":
                usage = msg.get("usage") or {}
                model = msg.get("model") or model
                meta.models.add(model)
                meta.turns += 1
                cost = (usage.get("cost") or {}).get("total")
                yield Turn(
                    "pi", project, session, when, model,
                    inp=usage.get("input", 0),
                    out=usage.get("output", 0),
                    cache_read=usage.get("cacheRead", 0),
                    cache_write=usage.get("cacheWrite", 0) + usage.get("cacheWrite1h", 0),
                    reasoning=usage.get("reasoning", 0),
                    cost=cost,
                )
                for block in msg.get("content") or []:
                    if isinstance(block, dict) and block.get("type") == "toolCall":
                        pending[block.get("id", "")] = (
                            (block.get("name") or "?").lower(),
                            claude_target(block.get("arguments") or {}),
                        )
            elif role in ("toolResult", "tool"):
                key = msg.get("toolCallId", "")
                tool, target = pending.pop(key, ((msg.get("toolName") or "?").lower(), ""))
                yield ToolUse(
                    "pi", project, session, tool, target,
                    blob_bytes(msg.get("content")),
                    ok=not msg.get("isError", False),
                )
        if meta.turns:
            yield meta


def load_opencode(root: Path):
    """Either the sqlite db (current) or storage/{message,part} JSON (legacy)."""
    db = root / "opencode.db"
    if db.is_file():
        yield from load_opencode_db(db)
    storage = root / "storage"
    if storage.is_dir():
        yield from load_opencode_storage(storage)


def load_opencode_db(db: Path):
    con = sqlite3.connect(f"file:{db}?immutable=1", uri=True)
    con.row_factory = sqlite3.Row
    try:
        projects = {}
        for row in con.execute("select id, slug, directory from session"):
            projects[row["id"]] = row["directory"] or row["slug"] or row["id"]
        metas: dict[str, SessionMeta] = {}
        for row in con.execute(
            "select session_id, time_created, data from message order by time_created"
        ):
            data = safe_json(row["data"])
            if not data:
                continue
            sid = row["session_id"]
            project = projects.get(sid, "unknown")
            meta = metas.setdefault(sid, SessionMeta("opencode", project, sid))
            when = ts_of(row["time_created"])
            meta.started = meta.started or when
            meta.ended = max(meta.ended, when)
            if data.get("role") != "assistant":
                continue
            tokens = data.get("tokens") or {}
            cache = tokens.get("cache") or {}
            model = data.get("modelID") or data.get("model") or "unknown"
            meta.models.add(model)
            meta.turns += 1
            yield Turn(
                "opencode", project, sid, when, model,
                inp=tokens.get("input", 0),
                out=tokens.get("output", 0),
                cache_read=cache.get("read", 0),
                cache_write=cache.get("write", 0),
                reasoning=tokens.get("reasoning", 0),
                cost=data.get("cost") or None,
            )
        for row in con.execute("select session_id, data from part"):
            data = safe_json(row["data"])
            if not data or data.get("type") != "tool":
                continue
            state = data.get("state") or {}
            sid = row["session_id"]
            yield ToolUse(
                "opencode", projects.get(sid, "unknown"), sid,
                (data.get("tool") or "?").lower(),
                claude_target(state.get("input") or {}),
                blob_bytes(state.get("output")),
                ok=state.get("status") != "error",
            )
        for meta in metas.values():
            if meta.turns:
                yield meta
    finally:
        con.close()


def load_opencode_storage(storage: Path):
    metas: dict[str, SessionMeta] = {}
    for path in storage.glob("message/*/msg_*.json"):
        data = safe_json(path.read_text(errors="replace"))
        if not data:
            continue
        sid = path.parent.name
        meta = metas.setdefault(sid, SessionMeta("opencode", sid, sid))
        when = ts_of((data.get("time") or {}).get("created"))
        meta.started = meta.started or when
        meta.ended = max(meta.ended, when)
        if data.get("role") != "assistant":
            continue
        tokens = data.get("tokens") or {}
        cache = tokens.get("cache") or {}
        model = data.get("modelID") or "unknown"
        meta.models.add(model)
        meta.turns += 1
        yield Turn(
            "opencode", sid, sid, when, model,
            inp=tokens.get("input", 0), out=tokens.get("output", 0),
            cache_read=cache.get("read", 0), cache_write=cache.get("write", 0),
            reasoning=tokens.get("reasoning", 0), cost=data.get("cost") or None,
        )
    for path in storage.glob("part/*/*/*.json"):
        data = safe_json(path.read_text(errors="replace"))
        if not data or data.get("type") != "tool":
            continue
        state = data.get("state") or {}
        sid = data.get("sessionID") or path.parent.parent.name
        yield ToolUse(
            "opencode", sid, sid, (data.get("tool") or "?").lower(),
            claude_target(state.get("input") or {}),
            blob_bytes(state.get("output")), ok=state.get("status") != "error",
        )
    for meta in metas.values():
        if meta.turns:
            yield meta


def read_jsonl(path: Path):
    with path.open(errors="replace") as handle:
        for line in handle:
            line = line.strip()
            if line:
                record = safe_json(line)
                if record is not None:
                    yield record


def safe_json(text):
    try:
        value = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return None
    return value if isinstance(value, dict) else None


LOADERS = {"claude": load_claude, "pi": load_pi, "opencode": load_opencode}

# Where each harness keeps session logs, and the glob that proves data is there.
SEARCH: dict[str, tuple[list[str], str]] = {
    "claude": (
        ["$CLAUDE_CONFIG_DIR", "~/.claude", "~/.config/claude", "~/Library/Application Support/claude"],
        "projects/*/*.jsonl",
    ),
    "pi": (
        ["$PI_CONFIG_DIR", "$PI_DIR", "~/.pi", "~/.config/pi"],
        "agent/sessions/*/*.jsonl",
    ),
    "opencode": (
        ["$OPENCODE_DATA_DIR", "~/.local/share/opencode", "~/.config/opencode",
         "~/Library/Application Support/opencode"],
        "opencode.db",
    ),
}

# Env markers set by each harness inside its own shell, used to break ties.
ENV_HINTS = {
    "claude": ("CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_SESSION_ID"),
    "pi": ("PI_AGENT", "PI_SESSION_ID", "PI_ENTRYPOINT"),
    "opencode": ("OPENCODE", "OPENCODE_SESSION_ID", "OPENCODE_SERVER"),
}


def expand(spec: str) -> list[Path]:
    """Resolve one search entry; env vars may hold a comma-separated list."""
    if spec.startswith("$"):
        raw = os.environ.get(spec[1:], "")
        return [Path(p).expanduser() for p in raw.split(",") if p.strip()]
    return [Path(spec).expanduser()]


def newest_mtime(root: Path, pattern: str) -> float:
    times = [p.stat().st_mtime for p in root.glob(pattern) if p.exists()]
    return max(times) if times else 0.0


def discover() -> list[tuple[str, Path, float]]:
    """Every harness log dir on this machine, newest activity first."""
    found = []
    for harness, (specs, pattern) in SEARCH.items():
        for spec in specs:
            for root in expand(spec):
                if not root.is_dir():
                    continue
                mtime = newest_mtime(root, pattern)
                if mtime:
                    found.append((harness, root, mtime))
                    break
    found.sort(key=lambda item: -item[2])
    return found


def current_harness() -> tuple[str, Path]:
    """The harness this shell is running under, else the most recently used one."""
    found = discover()
    if not found:
        raise SystemExit(
            "No Claude Code, pi, or opencode session logs found. Searched: "
            + "; ".join(s for specs, _ in SEARCH.values() for s in specs)
            + ". Pass a path explicitly."
        )
    for harness, keys in ENV_HINTS.items():
        if any(os.environ.get(k) for k in keys):
            match = next((f for f in found if f[0] == harness), None)
            if match:
                return match[0], match[1]
    return found[0][0], found[0][1]


def detect_harness(root: Path) -> str:
    if (root / "projects").is_dir() or root.name == "projects":
        return "claude"
    if (root / "opencode.db").is_file() or (root / "storage" / "message").is_dir():
        return "opencode"
    if (root / "agent" / "sessions").is_dir() or root.name == "sessions":
        return "pi"
    if any(root.glob("*/*.jsonl")):
        # Ambiguous flat layout: pi filenames carry a timestamp prefix.
        if any(re.match(r"\d{4}-\d\d-\d\dT", p.name) for p in root.glob("*/*.jsonl")):
            return "pi"
        return "claude"
    raise SystemExit(f"Cannot identify a harness under {root}. Pass --harness explicitly.")


# --------------------------------------------------------------------------- analysis


def collect(root: Path, harness: str, since: float, until: float):
    turns, tools, metas = [], [], []
    for item in LOADERS[harness](root):
        if isinstance(item, Turn):
            if item.ts and not (since <= item.ts <= until):
                continue
            turns.append(item)
        elif isinstance(item, ToolUse):
            tools.append(item)
        else:
            if item.ended and not (since <= item.ended <= until):
                continue
            metas.append(item)
    live = {(t.harness, t.session) for t in turns}
    tools = [t for t in tools if (t.harness, t.session) in live]
    for use in tools:
        if Path(use.target.split()[0] if use.target else "").suffix.lower() in IMAGE_EXT:
            use.out_bytes = min(use.out_bytes, IMAGE_TOKENS * BYTES_PER_TOKEN)
    metas = [m for m in metas if (m.harness, m.session) in live]
    return turns, tools, metas


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, int(round(pct / 100 * (len(ordered) - 1))))
    return ordered[index]


def analyse(turns: list[Turn], tools: list[ToolUse], metas: list[SessionMeta],
            prices: list, dev: str, source: str = "", days: int = 7) -> dict:
    if not turns:
        raise SystemExit(f"No assistant turns found in the last {days} days under {source}.")

    cost = {t: t.priced(prices) for t in turns}
    total_cost = sum(cost.values())
    by_session_cost = defaultdict(float)
    by_session_turns = defaultdict(list)
    for turn in turns:
        by_session_cost[turn.session] += cost[turn]
        by_session_turns[turn.session].append(turn)

    totals = {
        "turns": len(turns),
        "sessions": len(by_session_turns),
        "input": sum(t.inp for t in turns),
        "output": sum(t.out for t in turns),
        "cache_read": sum(t.cache_read for t in turns),
        "cache_write": sum(t.cache_write for t in turns),
        "reasoning": sum(t.reasoning for t in turns),
        "context_billed": sum(t.context for t in turns),
        "cost": total_cost,
    }
    fresh = totals["input"] + totals["cache_write"]
    totals["cache_hit_rate"] = totals["cache_read"] / max(1, totals["cache_read"] + fresh)

    # Model mix: the single biggest cost lever when an expensive model does cheap work.
    models = defaultdict(lambda: {"turns": 0, "cost": 0.0, "output": 0})
    for turn in turns:
        entry = models[turn.model]
        entry["turns"] += 1
        entry["cost"] += cost[turn]
        entry["output"] += turn.out

    # Tool attribution: bytes of tool output that entered context, by tool.
    tool_stats = defaultdict(lambda: {"calls": 0, "bytes": 0, "errors": 0})
    for use in tools:
        entry = tool_stats[use.tool]
        entry["calls"] += 1
        entry["bytes"] += use.out_bytes
        entry["errors"] += 0 if use.ok else 1
    tool_bytes_total = sum(v["bytes"] for v in tool_stats.values()) or 1

    # Projects.
    projects = defaultdict(lambda: {"turns": 0, "cost": 0.0, "sessions": set()})
    for turn in turns:
        entry = projects[turn.project]
        entry["turns"] += 1
        entry["cost"] += cost[turn]
        entry["sessions"].add(turn.session)

    # Session-level shape.
    meta_by_id = {m.session: m for m in metas}
    sessions = []
    for sid, group in by_session_turns.items():
        group.sort(key=lambda t: t.ts)
        contexts = [t.context for t in group]
        meta = meta_by_id.get(sid)
        sessions.append({
            "session": sid,
            "project": group[0].project,
            "turns": len(group),
            "cost": by_session_cost[sid],
            "start_context": contexts[0] if contexts else 0,
            "peak_context": max(contexts) if contexts else 0,
            "mean_context": statistics.mean(contexts) if contexts else 0,
            "output": sum(t.out for t in group),
            "sidechain_cost": sum(cost[t] for t in group if t.sidechain),
            # /clear and /compact both reset accumulated context: same hygiene signal.
            "compactions": (meta.compactions + meta.clears) if meta else 0,
            "models": sorted({t.model for t in group}),
            "duration_h": ((meta.ended - meta.started) / 3600) if meta and meta.ended else 0.0,
        })
    sessions.sort(key=lambda s: -s["cost"])

    # Startup overhead: cache_write on a session's first turn = system prompt +
    # instruction files + MCP tool schemas + skill descriptions. Paid every session.
    startups = [s["start_context"] for s in sessions if s["start_context"] > 0]
    startup_median = statistics.median(startups) if startups else 0

    # Repeated reads of the same target in one session = context paid twice.
    repeats = Counter()
    per_session_targets = defaultdict(Counter)
    for use in tools:
        if use.tool in READ_TOOLS and use.target:
            per_session_targets[use.session][(use.tool, use.target)] += 1
    for sid, counter in per_session_targets.items():
        for (tool, target), n in counter.items():
            if n >= 3:
                repeats[(tool, target)] += n - 1

    fat = sorted(tools, key=lambda u: -u.out_bytes)[:15]

    edits = sum(v["calls"] for k, v in tool_stats.items() if k in WRITE_TOOLS)

    return {
        "dev": dev,
        "harness": turns[0].harness,
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": source,
        "window": {
            "days": days,
            "from": iso(min(t.ts for t in turns if t.ts) if any(t.ts for t in turns) else 0),
            "to": iso(max(t.ts for t in turns)),
        },
        "totals": totals,
        "models": {k: v for k, v in sorted(models.items(), key=lambda kv: -kv[1]["cost"])},
        "tools": {
            k: {**v, "share": v["bytes"] / tool_bytes_total}
            for k, v in sorted(tool_stats.items(), key=lambda kv: -kv[1]["bytes"])
        },
        "projects": {
            k: {"turns": v["turns"], "cost": v["cost"], "sessions": len(v["sessions"])}
            for k, v in sorted(projects.items(), key=lambda kv: -kv[1]["cost"])
        },
        "sessions": sessions,
        "session_stats": {
            "turns_p50": percentile([s["turns"] for s in sessions], 50),
            "turns_p90": percentile([s["turns"] for s in sessions], 90),
            "peak_context_p50": percentile([s["peak_context"] for s in sessions], 50),
            "peak_context_p90": percentile([s["peak_context"] for s in sessions], 90),
            "startup_median": startup_median,
            "startup_total": startup_median * len(sessions),
            "compacted_sessions": sum(1 for s in sessions if s["compactions"]),
        },
        "sidechain_cost": sum(cost[t] for t in turns if t.sidechain),
        "repeated_reads": [
            {"tool": t, "target": g, "wasted_calls": n}
            for (t, g), n in repeats.most_common(10)
        ],
        "fat_tool_results": [
            {"tool": u.tool, "target": u.target, "bytes": u.out_bytes,
             "est_tokens": u.out_bytes // BYTES_PER_TOKEN, "session": u.session}
            for u in fat
        ],
        "edits": edits,
        "cost_per_edit": total_cost / edits if edits else 0.0,
        "tool_error_rate": (
            sum(v["errors"] for v in tool_stats.values()) / max(1, len(tools))
        ),
    }


def iso(seconds: float) -> str:
    if not seconds:
        return "unknown"
    return datetime.fromtimestamp(seconds, timezone.utc).strftime("%Y-%m-%d %H:%M")


# --------------------------------------------------------------------------- findings


def findings(report: dict) -> list[dict]:
    """Threshold rules -> ranked findings with an estimated share of spend at risk."""
    out = []
    totals, stats = report["totals"], report["session_stats"]
    cost = totals["cost"] or 1e-9
    if cost < 1.0:
        return out  # too little activity to draw conclusions from
    add = lambda **kw: out.append(kw)

    if totals["cache_hit_rate"] < 0.70:
        add(
            id="cache-misses",
            title=f"Cache hit rate {totals['cache_hit_rate']:.0%} (healthy: >85%)",
            impact=cost * (0.85 - totals["cache_hit_rate"]) * 0.6,
            why="Fresh and cache-write tokens cost 5-60x a cache read. Misses come from "
                "editing instruction files mid-session, tool output injected above the "
                "cache breakpoint, or switching models inside a session.",
            fix="Stop editing CLAUDE.md/AGENTS.md mid-session. Keep one model per session. "
                "Batch related work into a single session instead of restarting.",
        )

    startup = stats["startup_median"]
    if startup > 25_000:
        add(
            id="startup-bloat",
            title=f"{startup:,.0f} tokens loaded before the first prompt, {totals['sessions']} times",
            impact=(startup * totals["sessions"]) / 1_000_000 * 3.75,
            why="System prompt, instruction files, MCP tool schemas, and skill descriptions "
                "load at session start and stay resident. This is a fixed toll on every session.",
            fix="Cut CLAUDE.md/AGENTS.md below 200 lines. Move workflow-specific rules into "
                "skills or path-scoped rule files so they load on demand. Disable unused MCP servers.",
        )

    for tool, data in list(report["tools"].items())[:3]:
        est = data["bytes"] // BYTES_PER_TOKEN
        if data["share"] > 0.35 and est > 200_000:
            add(
                id=f"tool-bloat-{tool}",
                title=f"`{tool}` produced {data['share']:.0%} of all tool output "
                      f"(~{est:,} tokens over {data['calls']:,} calls)",
                impact=cost * data["share"] * 0.25,
                why="Tool output enters context verbatim and is re-sent on every later turn "
                    "in that session. One 5k-line dump is paid for the rest of the session.",
                fix=("Read with line ranges or grep instead of whole files."
                     if tool == "read" else
                     "Pipe through head/tail/grep and add `| wc -l` style summaries instead of raw dumps."
                     if tool == "bash" else
                     f"Narrow the output of `{tool}`; ask for counts before contents."),
            )

    p90 = stats["peak_context_p90"]
    if p90 > 120_000:
        add(
            id="context-runaway",
            title=f"p90 session peak context {p90:,.0f} tokens",
            impact=cost * 0.20,
            why="Cost per turn scales with context size, and answer quality degrades once "
                "the window fills with stale tool output.",
            fix="/clear between unrelated tasks, /compact at phase boundaries. Split long "
                "sessions instead of running one all day.",
        )

    if totals["sessions"] >= 5 and stats["compacted_sessions"] / totals["sessions"] < 0.15 \
            and stats["turns_p90"] > 40:
        add(
            id="no-hygiene",
            title=f"Only {stats['compacted_sessions']}/{totals['sessions']} sessions were "
                  f"compacted, yet p90 is {stats['turns_p90']:.0f} turns",
            impact=cost * 0.12,
            why="Uncompacted long sessions re-send every stale turn forever.",
            fix="Compact at the end of each work phase; clear when the task changes.",
        )

    # Data-driven tiering: compare each model's realised cost per turn, no name lists.
    rates = {
        m: d["cost"] / d["turns"]
        for m, d in report["models"].items() if d["turns"] >= 10 and d["cost"] > 0
    }
    if len(rates) > 1:
        cheapest = min(rates.values())
        premium = {m: r for m, r in rates.items() if r >= cheapest * 2}
        prem_cost = sum(report["models"][m]["cost"] for m in premium)
        if prem_cost / cost > 0.5:
            dearest = max(premium, key=premium.get)
            cheap_name = min(rates, key=rates.get)
            add(
                id="model-mix",
                title=f"{prem_cost / cost:.0%} of spend went to the premium tier "
                      f"(`{dearest}` at ${premium[dearest]:.3f}/turn vs "
                      f"`{cheap_name}` at ${cheapest:.3f}/turn)",
                impact=prem_cost * 0.25,
                why=f"The premium tier costs {premium[dearest] / cheapest:.0f}x per turn. "
                    "Search, file reading, formatting, and routine edits do not need it.",
                fix=f"Default to `{cheap_name}` and escalate deliberately for architecture "
                    "and hard debugging.",
            )
    elif len(report["models"]) == 1 and cost > 20:
        add(
            id="single-model",
            title=f"One model for all work: {next(iter(report['models']))}",
            impact=cost * 0.15,
            why="No tier routing means routine turns pay the premium rate.",
            fix="Use a cheap model for exploration and a premium one only for hard reasoning.",
        )

    side = report["sidechain_cost"]
    if side / cost > 0.35:
        add(
            id="subagent-cost",
            title=f"Subagents account for {side / cost:.0%} of spend",
            impact=side * 0.3,
            why="Each subagent gets its own full context. Fan-out multiplies startup overhead.",
            fix="Use subagents for genuinely parallel, self-contained work. Give them narrow "
                "briefs so they don't re-explore the repo.",
        )

    errors = sum(d["errors"] for d in report["tools"].values())
    calls = sum(d["calls"] for d in report["tools"].values()) or 1
    if errors / calls > 0.10:
        add(
            id="tool-errors",
            title=f"{errors / calls:.0%} of tool calls failed ({errors:,} of {calls:,})",
            impact=cost * (errors / calls) * 0.5,
            why="Every failure costs the call, the error text, and the retry turn.",
            fix="Document the working commands, paths, and env setup in the instruction file "
                "so the agent stops guessing.",
        )

    wasted = sum(r["wasted_calls"] for r in report["repeated_reads"])
    if wasted > 20:
        add(
            id="repeat-reads",
            title=f"{wasted:,} redundant re-reads of files already in context",
            impact=cost * 0.05,
            why="The content was already in the window; the second read pays for it twice.",
            fix="Re-read only after an external change. Prefer targeted edits over read-modify-write loops.",
        )

    if report["edits"] and report["cost_per_edit"] > 2.0:
        add(
            id="cost-per-edit",
            title=f"${report['cost_per_edit']:.2f} per file change ({report['edits']:,} changes)",
            impact=cost * 0.10,
            why="A high ratio means most spend went to exploration, not change.",
            fix="Name the files and symbols in the prompt. Use a code index/grep instead of "
                "open-ended discovery.",
        )

    out.sort(key=lambda f: -f["impact"])
    return out


# --------------------------------------------------------------------------- redaction


def redact_target(tool: str, target: str) -> str:
    """Keep the shape, drop the content: extensions and command verbs only."""
    if not target:
        return ""
    if tool in ("bash", "shell"):
        return " ".join(re.findall(r"[a-zA-Z0-9_.\-/]+", target)[:1]) or "cmd"
    if "/" in target or "." in target:
        suffix = Path(target).suffix
        return f"*{suffix}" if suffix else "path"
    return "arg"


def redact(report: dict) -> dict:
    clean = json.loads(json.dumps(report))
    clean["projects"] = {
        f"project-{i:02d}": v for i, v in enumerate(clean["projects"].values())
    }
    for item in clean["fat_tool_results"]:
        item["target"] = redact_target(item["tool"], item["target"])
        item.pop("session", None)
    for item in clean["repeated_reads"]:
        item["target"] = redact_target(item["tool"], item["target"])
    for i, item in enumerate(clean["sessions"]):
        item["session"] = f"s{i:04d}"
        item["project"] = ""
    clean["sessions"] = clean["sessions"][:20]
    clean["findings"] = findings(report)
    return clean


# --------------------------------------------------------------------------- rendering


def fmt(n) -> str:
    return f"{n:,.0f}" if isinstance(n, (int, float)) else str(n)


def cell(value) -> str:
    """Escape pipes and newlines so a cell cannot break the table."""
    return str(value).replace("|", "\\|").replace("\n", " ")


def table(headers: list[str], rows: list[list[str]]) -> str:
    lines = ["| " + " | ".join(headers) + " |",
             "|" + "|".join("---" for _ in headers) + "|"]
    lines += ["| " + " | ".join(cell(c) for c in r) + " |" for r in rows]
    return "\n".join(lines)


GRADES = [(0.85, "A"), (0.70, "B"), (0.55, "C"), (0.40, "D")]


def grade(report: dict) -> tuple[str, float]:
    """One comparable score per developer: share of spend not flagged as waste."""
    cost = report["totals"]["cost"] or 1e-9
    at_risk = min(cost, sum(f["impact"] for f in report.get("findings") or findings(report)))
    efficiency = 1.0 - at_risk / cost
    letter = next((g for threshold, g in GRADES if efficiency >= threshold), "E")
    return letter, efficiency


def render(report: dict, top: int) -> str:
    """Fixed-shape standard summary. Same sections, same order, every run."""
    t, s = report["totals"], report["session_stats"]
    found = report.get("findings") or findings(report)
    letter, efficiency = grade(report)
    at_risk = sum(f["impact"] for f in found)
    days = report["window"]["days"]
    top_tool = next(iter(report["tools"].items()), ("—", {"share": 0}))

    out = [
        f"# Token Diagnostics Summary — {report['dev']}",
        "",
        table(["Field", "Value"], [
            ["Developer", report["dev"]],
            ["Harness", report["harness"]],
            ["Log source", f"`{report['source']}`"],
            ["Window", f"last {days} days ({report['window']['from']} → {report['window']['to']})"],
            ["Generated", report["generated"]],
        ]),
        "",
        "## 1. Scorecard",
        "",
        table(["Metric", "Value", "Healthy target"], [
            ["Efficiency grade", f"**{letter}** ({efficiency:.0%} of spend not flagged)", "A / B"],
            ["Estimated spend", f"**${t['cost']:,.2f}**", "—"],
            ["Spend flagged as recoverable", f"${at_risk:,.2f} ({at_risk / (t['cost'] or 1):.0%})", "<15%"],
            ["Cache hit rate", f"{t['cache_hit_rate']:.1%}", ">85%"],
            ["Median startup context per session", fmt(s["startup_median"]), "<25,000"],
            ["Session peak context p90", fmt(s["peak_context_p90"]), "<120,000"],
            ["Cost per file change", f"${report['cost_per_edit']:.2f}", "<$2.00"],
            ["Tool-call failure rate", f"{report['tool_error_rate']:.0%}", "<10%"],
            ["Sessions compacted or cleared",
             f"{fmt(s['compacted_sessions'])} / {fmt(t['sessions'])}", "most long sessions"],
            ["Largest tool-output source",
             f"`{top_tool[0]}` at {top_tool[1]['share']:.0%}", "<35%"],
        ]),
        "",
        "## 2. Volume",
        "",
        table(["Metric", "Value"], [
            ["Sessions", fmt(t["sessions"])],
            ["Assistant turns", fmt(t["turns"])],
            ["Billed input tokens (context re-sent each turn)", fmt(t["context_billed"])],
            ["Fresh input tokens", fmt(t["input"])],
            ["Cache write tokens", fmt(t["cache_write"])],
            ["Cache read tokens", fmt(t["cache_read"])],
            ["Output tokens", fmt(t["output"])],
            ["Reasoning tokens", fmt(t["reasoning"])],
            ["File changes made", fmt(report["edits"])],
            ["Startup context paid across all sessions", fmt(s["startup_total"])],
            ["Subagent share of spend", f"{report['sidechain_cost'] / (t['cost'] or 1):.0%}"],
        ]),
        "",
        "## 3. Spend by model",
        "",
        table(["Model", "Turns", "Output tokens", "Cost", "Share"], [
            [m, fmt(d["turns"]), fmt(d["output"]), f"${d['cost']:,.2f}",
             f"{d['cost'] / (t['cost'] or 1):.0%}"]
            for m, d in report["models"].items()
        ] or [["—", "—", "—", "—", "—"]]),
        "",
        "## 4. Context filled by tool",
        "",
        table(["Tool", "Calls", "Est. tokens", "Share of tool output", "Failures"], [
            [k, fmt(d["calls"]), fmt(d["bytes"] // BYTES_PER_TOKEN),
             f"{d['share']:.0%}", fmt(d["errors"])]
            for k, d in list(report["tools"].items())[:12]
        ] or [["—", "—", "—", "—", "—"]]),
        "",
        "## 5. Spend by project",
        "",
        table(["Project", "Sessions", "Turns", "Cost", "Share"], [
            [k, fmt(d["sessions"]), fmt(d["turns"]), f"${d['cost']:,.2f}",
             f"{d['cost'] / (t['cost'] or 1):.0%}"]
            for k, d in list(report["projects"].items())[:top]
        ] or [["—", "—", "—", "—", "—"]]),
        "",
        "## 6. Most expensive sessions",
        "",
        table(["Session", "Project", "Turns", "Peak context", "Compactions", "Cost"], [
            [x["session"][:14], str(x["project"])[:38], fmt(x["turns"]),
             fmt(x["peak_context"]), fmt(x["compactions"]), f"${x['cost']:,.2f}"]
            for x in report["sessions"][:top]
        ] or [["—", "—", "—", "—", "—", "—"]]),
        "",
        "## 7. Biggest single tool results",
        "",
        table(["Tool", "Target", "Est. tokens"], [
            [x["tool"], str(x["target"])[:70], fmt(x["est_tokens"])]
            for x in report["fat_tool_results"][:top]
        ] or [["—", "—", "—"]]),
        "",
        "## 8. Redundant re-reads (same target 3+ times in one session)",
        "",
        table(["Tool", "Target", "Redundant calls"], [
            [x["tool"], str(x["target"])[:70], fmt(x["wasted_calls"])]
            for x in report["repeated_reads"]
        ] or [["—", "none detected", "0"]]),
        "",
        "## 9. Findings, ranked by recoverable spend",
        "",
    ]
    if not found:
        out += ["No threshold breached. Usage is healthy.", ""]
    else:
        out += [
            table(["#", "ID", "Finding", "Est. recoverable", "Fix"], [
                [str(i), f["id"], f["title"], f"${f['impact']:,.2f}", f["fix"]]
                for i, f in enumerate(found, 1)
            ]),
            "",
            "### Detail",
            "",
        ]
        for i, f in enumerate(found, 1):
            out += [
                f"**{i}. {f['title']}** — ~${f['impact']:,.2f} recoverable",
                "",
                f"- Why: {f['why']}",
                f"- Fix: {f['fix']}",
                "",
            ]

    monthly = at_risk / max(1, days) * 30
    out += [
        "## 10. Bottom line",
        "",
        f"- Grade **{letter}**: ${at_risk:,.2f} of ${t['cost']:,.2f} "
        f"({at_risk / (t['cost'] or 1):.0%}) is recoverable over {days} days.",
        f"- At this rate that is **~${monthly:,.2f}/month** per developer.",
        f"- Highest-leverage action: {found[0]['fix'] if found else 'none, keep current habits.'}",
        "",
        "---",
        "",
        f"Tool-output tokens estimated at {BYTES_PER_TOKEN} bytes/token. Costs come from the "
        "harness when it records them, otherwise a built-in price table (`--prices` to override). "
        "Cross-check totals with `npx ccusage@latest`.",
    ]
    return "\n".join(out)


def render_team(reports: list[dict], top: int) -> str:
    rows = []
    for r in reports:
        t, s = r["totals"], r["session_stats"]
        letter, efficiency = grade(r)
        rows.append({
            "dev": r["dev"],
            "harness": r["harness"],
            "grade": letter,
            "efficiency": efficiency,
            "cost": t["cost"],
            "turns": t["turns"],
            "sessions": t["sessions"],
            "cache": t["cache_hit_rate"],
            "startup": s["startup_median"],
            "peak90": s["peak_context_p90"],
            "cpe": r["cost_per_edit"],
            "edits": r["edits"],
            "findings": r.get("findings") or findings(r),
        })
    rows.sort(key=lambda r: -r["cost"])
    costs = [r["cost"] for r in rows]
    total = sum(costs)

    issue_cost = defaultdict(float)
    issue_devs = defaultdict(int)
    issue_text = {}
    for r in rows:
        for f in r["findings"]:
            key = f["id"].split("-")[0] if f["id"].startswith("tool") else f["id"]
            issue_cost[key] += f["impact"]
            issue_devs[key] += 1
            issue_text[key] = f

    tool_bytes = defaultdict(int)
    model_cost = defaultdict(float)
    for r in reports:
        for k, d in r["tools"].items():
            tool_bytes[k] += d["bytes"]
        for m, d in r["models"].items():
            model_cost[m] += d["cost"]
    tool_total = sum(tool_bytes.values()) or 1

    days = reports[0].get("window", {}).get("days", 7)
    recoverable = sum(min(r["cost"], sum(f["impact"] for f in r["findings"])) for r in rows)
    out = [
        f"# Fleet Token Diagnostics Summary — {len(rows)} developers",
        "",
        f"Window: last {days} days · generated "
        f"{datetime.now(timezone.utc).isoformat(timespec='seconds')}",
        "",
        "## Fleet headline",
        "",
        table(["Metric", "Value"], [
            ["Total estimated cost", f"**${total:,.2f}**"],
            ["Recoverable spend",
             f"**${recoverable:,.2f}** ({recoverable / (total or 1):.0%}) → "
             f"~${recoverable / max(1, days) * 30:,.2f}/month"],
            ["Grade mix", " ".join(
                f"{g}:{sum(1 for r in rows if r['grade'] == g)}" for g in "ABCDE"
            )],
            ["Cost per developer: mean / p50 / p90 / max",
             f"${statistics.mean(costs):,.2f} / ${percentile(costs, 50):,.2f} / "
             f"${percentile(costs, 90):,.2f} / ${max(costs):,.2f}"],
            ["Spread (max / p50)",
             f"{max(costs) / (percentile(costs, 50) or 1):.1f}x"],
            ["Top 10% share of spend",
             f"{sum(sorted(costs)[-max(1, len(costs) // 10):]) / (total or 1):.0%}"],
            ["Total turns / sessions",
             f"{fmt(sum(r['turns'] for r in rows))} / {fmt(sum(r['sessions'] for r in rows))}"],
            ["Fleet cache hit rate: p50 / worst",
             f"{percentile([r['cache'] for r in rows], 50):.0%} / "
             f"{min(r['cache'] for r in rows):.0%}"],
            ["Median startup context per session",
             fmt(percentile([r["startup"] for r in rows], 50))],
        ]),
        "",
        "## Fleet-wide issues, ranked by recoverable spend",
        "",
        table(["Issue", "Devs affected", "Est. recoverable", "Fix"], [
            [issue_text[k]["id"], fmt(issue_devs[k]), f"${v:,.2f}",
             issue_text[k]["fix"]]
            for k, v in sorted(issue_cost.items(), key=lambda kv: -kv[1])
        ]),
        "",
        "## Per developer",
        "",
        table(["Dev", "Harness", "Grade", "Cost", "Share", "Sessions", "Turns",
               "Cache hit", "Startup ctx", "p90 peak ctx", "$/change", "Top issue"], [
            [r["dev"], r["harness"], r["grade"], f"${r['cost']:,.2f}",
             f"{r['cost'] / (total or 1):.0%}", fmt(r["sessions"]), fmt(r["turns"]),
             f"{r['cache']:.0%}", fmt(r["startup"]), fmt(r["peak90"]),
             f"${r['cpe']:.2f}", r["findings"][0]["id"] if r["findings"] else "—"]
            for r in rows
        ]),
        "",
        "## Fleet tool output volume",
        "",
        table(["Tool", "Est. tokens", "Share"], [
            [k, fmt(v // BYTES_PER_TOKEN), f"{v / tool_total:.0%}"]
            for k, v in sorted(tool_bytes.items(), key=lambda kv: -kv[1])[:12]
        ]),
        "",
        "## Fleet model mix",
        "",
        table(["Model", "Cost", "Share"], [
            [k, f"${v:,.2f}", f"{v / (total or 1):.0%}"]
            for k, v in sorted(model_cost.items(), key=lambda kv: -kv[1])
        ]),
        "",
        "## Coaching shortlist",
        "",
    ]
    for r in rows[:top]:
        if not r["findings"]:
            continue
        out.append(f"**{r['dev']}** — ${r['cost']:,.2f}")
        for f in r["findings"][:3]:
            out.append(f"- {f['title']} → {f['fix']}")
        out.append("")
    return "\n".join(out)


# --------------------------------------------------------------------------- cli


def load_prices(path: str | None) -> list:
    if not path:
        return PRICES
    data = json.loads(Path(path).read_text())
    return [(k, tuple(v)) for k, v in data.items()] + PRICES


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("mode", nargs="?", default="analyze",
                   choices=["analyze", "export", "merge", "where"],
                   help="analyze (default), export, merge, or where (show discovered log dirs)")
    p.add_argument("path", nargs="?",
                   help="optional override: harness log dir, or the dir of exported "
                        "JSONs for merge. Auto-discovered when omitted.")
    p.add_argument("--harness", choices=list(LOADERS), help="force the harness")
    p.add_argument("--dev", default=os.environ.get("USER", "unknown"), help="developer label")
    p.add_argument("--days", type=int, default=7, help="lookback window in days (default 7)")
    p.add_argument("--top", type=int, default=10, help="rows in top-N tables")
    p.add_argument("--prices", help="JSON: {\"model-substring\": [in, out, cache_write, cache_read]} per 1M")
    p.add_argument("--json", action="store_true", help="emit JSON instead of markdown")
    p.add_argument("-o", "--out", help="write to file instead of stdout")
    args = p.parse_args(argv)

    if args.mode == "where":
        rows = discover()
        if not rows:
            raise SystemExit("No harness logs found.")
        print(table(["Harness", "Log dir", "Last activity"],
                    [[h, str(r), iso(m)] for h, r, m in rows]))
        return 0

    if args.mode == "merge":
        root = Path(args.path or ".").expanduser()
        files = sorted(glob.glob(str(root / "*.json")))
        if not files:
            raise SystemExit(f"No *.json exports found in {root}")
        reports = [json.loads(Path(f).read_text()) for f in files]
        text = json.dumps(reports, indent=2) if args.json else render_team(reports, args.top)
    else:
        if args.path:
            root = Path(args.path).expanduser()
            if not root.exists():
                raise SystemExit(f"{root} does not exist")
            harness = args.harness or detect_harness(root)
        elif args.harness:
            match = next((f for f in discover() if f[0] == args.harness), None)
            if not match:
                raise SystemExit(f"No {args.harness} logs found on this machine.")
            harness, root = match[0], match[1]
        else:
            harness, root = current_harness()

        until = datetime.now(timezone.utc).timestamp()
        since = until - args.days * 86_400
        turns, tools, metas = collect(root, harness, since, until)
        report = analyse(turns, tools, metas, load_prices(args.prices), args.dev,
                         source=str(root), days=args.days)
        report["findings"] = findings(report)
        if args.mode == "export":
            text = json.dumps(redact(report), indent=2)
        else:
            text = json.dumps(report, indent=2, default=str) if args.json \
                else render(report, args.top)

    if args.out:
        Path(args.out).expanduser().write_text(text)
        print(f"wrote {args.out}", file=sys.stderr)
    else:
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
