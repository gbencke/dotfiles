"""Self-check: synthetic logs for each harness must round-trip into findings."""
import json, sqlite3, subprocess, sys, tempfile
from pathlib import Path

S = str(Path(__file__).parent / "analyze_tokens.py")
NOW = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
ISO = NOW.isoformat()
MS = int(NOW.timestamp() * 1000)


def run(*args):
    r = subprocess.run([sys.executable, S, *args], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return r.stdout


def make_claude(root: Path):
    d = root / "projects" / "-repo"
    d.mkdir(parents=True)
    lines = []
    for i in range(30):
        rid = f"req{i}"
        # Two lines share a requestId: usage billed once, tool_use still collected.
        lines.append({"type": "assistant", "requestId": rid, "timestamp": ISO,
                      "message": {"model": "claude-opus-4-6", "usage": {
                          "input_tokens": 40, "output_tokens": 900,
                          "cache_read_input_tokens": 150_000,
                          "cache_creation_input_tokens": 60_000},
                          "content": [{"type": "text", "text": "hi"}]}})
        lines.append({"type": "assistant", "requestId": rid, "timestamp": ISO,
                      "message": {"model": "claude-opus-4-6", "usage": {},
                                  "content": [{"type": "tool_use", "id": f"t{i}",
                                               "name": "Bash",
                                               "input": {"command": "cat huge.log"}}]}})
        lines.append({"type": "user", "timestamp": ISO, "message": {"role": "user",
                      "content": [{"type": "tool_result", "tool_use_id": f"t{i}",
                                   "content": "x" * 90_000}]}})
    lines.append({"type": "user", "timestamp": ISO,
                  "message": {"role": "user", "content": "<command-name>/clear</command-name>"}})
    (d / "sess.jsonl").write_text("\n".join(json.dumps(x) for x in lines))


def make_pi(root: Path):
    d = root / "agent" / "sessions" / "--repo--"
    d.mkdir(parents=True)
    lines = [{"type": "session", "id": "s", "timestamp": ISO},
             {"type": "model_change", "modelId": "claude-opus-4-8", "timestamp": ISO}]
    for i in range(30):
        lines.append({"type": "message", "timestamp": ISO, "message": {
            "role": "assistant", "model": "claude-opus-4-8",
            "usage": {"input": 10, "output": 800, "cacheRead": 140_000,
                      "cacheWrite": 9_000, "reasoning": 300,
                      "cost": {"total": 0.9}},
            "content": [{"type": "toolCall", "id": f"t{i}", "name": "read",
                         "arguments": {"file_path": "same.py"}}]}})
        lines.append({"type": "message", "timestamp": ISO, "message": {
            "role": "toolResult", "toolCallId": f"t{i}", "toolName": "read",
            "content": [{"type": "text", "text": "y" * 80_000}]}})
    (d / "2026-01-01T00-00-00-000Z_abc.jsonl").write_text(
        "\n".join(json.dumps(x) for x in lines))


def make_opencode(root: Path):
    root.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(root / "opencode.db")
    con.executescript("""
      create table session (id text primary key, slug text, directory text);
      create table message (id text primary key, session_id text,
                            time_created integer, time_updated integer, data text);
      create table part (id text primary key, message_id text, session_id text,
                         time_created integer, time_updated integer, data text);
    """)
    con.execute("insert into session values ('s1','repo','/repo')")
    for i in range(25):
        con.execute("insert into message values (?,?,?,?,?)", (
            f"m{i}", "s1", MS, MS, json.dumps({
                "role": "assistant", "modelID": "gpt-5",
                "cost": 1.2,
                "tokens": {"input": 90_000, "output": 700, "reasoning": 0,
                           "cache": {"read": 0, "write": 0}}})))
        con.execute("insert into part values (?,?,?,?,?,?)", (
            f"p{i}", f"m{i}", "s1", MS, MS, json.dumps({
                "type": "tool", "tool": "bash",
                "state": {"status": "error", "input": {"command": "npm test"},
                          "output": "z" * 70_000}})))
    con.commit()
    con.close()


def test_all():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        make_claude(tmp / "claude")
        make_pi(tmp / "pi")
        make_opencode(tmp / "oc")

        out = run("analyze", str(tmp / "claude"))
        assert "Token Diagnostics Summary" in out
        assert "startup-bloat" in out or "60,000" in out, "startup overhead missed"
        assert "`bash`" in out, "claude tool attribution broken (requestId dedupe)"
        assert "| 1 |" in out, "no findings produced for a deliberately wasteful log"

        out = run("analyze", str(tmp / "pi"), "--harness", "pi")
        assert "Harness | pi" in out
        assert "redundant re-reads" in out.lower(), "repeat-read detection broken"

        out = run("analyze", str(tmp / "oc"), "--harness", "opencode")
        assert "Harness | opencode" in out
        assert "cache-misses" in out, "0% cache hit rate not flagged"
        assert "tool-errors" in out, "100% tool failure rate not flagged"

        # export must be redacted, and merge must consume exports.
        ex = tmp / "ex"
        ex.mkdir()
        for name, src, harness in (("a", "claude", "claude"), ("b", "pi", "pi")):
            run("export", str(tmp / src), "--harness", harness, "--dev", name,
                "-o", str(ex / f"{name}.json"))
        blob = (ex / "a.json").read_text()
        assert "huge.log" not in blob and "-repo" not in blob, "export leaked content"
        assert "project-00" in blob

        team = run("merge", str(ex))
        assert "Fleet Token Diagnostics Summary — 2 developers" in team
        assert "| a |" in team and "| b |" in team

        assert "Harness | Log dir" in run("where")


if __name__ == "__main__":
    test_all()
    print("all checks passed")
