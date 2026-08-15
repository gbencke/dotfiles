#!/usr/bin/env python3
"""extract_calls.py - deterministic symbol + call-graph extraction via ast-grep.

Part of the c4-repo-doc skill. Dumb by design: finds function/method/class
definitions and call sites, wires callers to callees by name, emits graph.json.
The agent adds semantics on top.

Usage:
  python3 extract_calls.py [ROOT ...] [--out graph.json]
  python3 extract_calls.py --selfcheck
"""
import json
import os
import re
import subprocess
import sys
import tempfile

SG = next((b for b in ("ast-grep", "sg") if subprocess.run(
    ["which", b], capture_output=True).returncode == 0), None)

# sg --lang key -> rule-file language name
LANGS = {
    "python": "Python", "javascript": "JavaScript", "typescript": "TypeScript",
    "tsx": "Tsx", "go": "Go", "rust": "Rust", "java": "Java",
    "c": "C", "cpp": "Cpp", "ruby": "Ruby",
}

# definition node kinds per language (kind rules survive modifiers/decorators)
DEF_KINDS = {
    "python": [("function_definition", "function"), ("class_definition", "class")],
    "javascript": [("function_declaration", "function"), ("method_definition", "method"),
                   ("class_declaration", "class"), ("generator_function_declaration", "function")],
    "typescript": [("function_declaration", "function"), ("method_definition", "method"),
                   ("class_declaration", "class"), ("generator_function_declaration", "function")],
    "tsx": [("function_declaration", "function"), ("method_definition", "method"),
            ("class_declaration", "class"), ("generator_function_declaration", "function")],
    "go": [("function_declaration", "function"), ("method_declaration", "method"),
           ("type_declaration", "type")],
    "rust": [("function_item", "function"), ("struct_item", "type"), ("impl_item", "impl")],
    "java": [("method_declaration", "method"), ("constructor_declaration", "method"),
             ("class_declaration", "class"), ("interface_declaration", "interface")],
    "c": [("function_definition", "function"), ("struct_specifier", "type")],
    "cpp": [("function_definition", "function"), ("class_specifier", "class")],
    "ruby": [("method", "method"), ("class", "class")],
}

# extra pattern-based defs (kind rules can't express these)
DEF_PATTERNS = {
    "javascript": [("const $NAME = ($$$P) => { $$$B }", "function"),
                   ("const $NAME = ($$$P) => $X", "function")],
    "typescript": [("const $NAME = ($$$P) => { $$$B }", "function"),
                   ("const $NAME = ($$$P) => $X", "function")],
    "tsx": [("const $NAME = ($$$P) => { $$$B }", "function"),
            ("const $NAME = ($$$P) => $X", "function")],
}

NAME_RES = [
    re.compile(r"\bdef\s+(\w+)"), re.compile(r"\bclass\s+(\w+)"),
    re.compile(r"\bfunc\s+(?:\([^)]*\)\s*)?(\w+)"), re.compile(r"\bfn\s+(\w+)"),
    re.compile(r"\bfunction\s+(\w+)"), re.compile(r"\binterface\s+(\w+)"),
    re.compile(r"\bstruct\s+(\w+)"), re.compile(r"\bimpl\s+(?:<[^>]*>\s*)?(\w+)"),
]
GENERIC_NAME = re.compile(r"(\w+)\s*\(")

CALL_PATTERN = "$FN($$$ARGS)"
NEW_CALL_LANGS = {"javascript", "typescript", "tsx", "java", "cpp"}  # add 'new $FN()'


def run_sg(args):
    r = subprocess.run([SG] + args, capture_output=True, text=True)
    if r.returncode != 0 or not r.stdout.strip():
        return []
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return []


def name_from_text(text, fallback=""):
    header = text.split("{")[0].split("\n")[0][:300]
    for rx in NAME_RES:
        m = rx.search(header)
        if m:
            return m.group(1)
    m = GENERIC_NAME.search(header)
    return m.group(1) if m else fallback


def line_of(m):
    return m["range"]["start"]["line"] + 1


def end_of(m):
    return m["range"]["end"]["line"] + 1


def extract_defs(roots):
    defs = []
    for lang, kinds in DEF_KINDS.items():
        rules = [{"id": f"def-{i}", "language": LANGS[lang],
                  "rule": {"kind": k}} for i, (k, _) in enumerate(kinds)]
        kind_map = dict(rules and [(f"def-{i}", t) for i, (_, t) in enumerate(kinds)])
        with tempfile.NamedTemporaryFile("w", suffix=".yml", delete=False) as f:
            f.write("\n---\n".join(
                f"id: {r['id']}\nlanguage: {r['language']}\n"
                f"rule:\n  kind: {r['rule']['kind']}\n" for r in rules))
            rulefile = f.name
        try:
            for m in run_sg(["scan", "--rule", rulefile, "--json"] + roots):
                name = name_from_text(m.get("text", ""))
                if name:
                    defs.append({"name": name, "kind": kind_map[m["ruleId"]],
                                 "file": m["file"], "line": line_of(m),
                                 "end": end_of(m)})
        finally:
            os.unlink(rulefile)
        for pattern, kind in DEF_PATTERNS.get(lang, []):
            for m in run_sg(["run", "-p", pattern, "--lang", lang, "--json"] + roots):
                mv = m.get("metaVariables", {}).get("single", {})
                name = mv.get("NAME", {}).get("text")
                if name:
                    defs.append({"name": name, "kind": kind, "file": m["file"],
                                 "line": line_of(m), "end": end_of(m)})
    # dedupe (same node can hit pattern + kind)
    seen, out = set(), []
    for d in sorted(defs, key=lambda d: (d["file"], d["line"], d["name"])):
        key = (d["file"], d["line"], d["name"])
        if key not in seen:
            seen.add(key)
            d["id"] = f"{d['file']}::{d['name']}#{d['line']}"
            out.append(d)
    return out


def extract_calls(roots):
    calls = []
    for lang in LANGS:
        patterns = [CALL_PATTERN] + (["new $FN($$$ARGS)"]
                                     if lang in NEW_CALL_LANGS else [])
        for p in patterns:
            for m in run_sg(["run", "-p", p, "--lang", lang, "--json"] + roots):
                mv = m.get("metaVariables", {}).get("single", {})
                raw = mv.get("FN", {}).get("text", "")
                if raw:
                    calls.append({"raw": raw, "name": raw.split(".")[-1].strip("!"),
                                  "file": m["file"], "line": line_of(m)})
    return calls


def build_graph(roots):
    defs = extract_defs(roots)
    calls = extract_calls(roots)
    by_file = {}
    for d in defs:
        by_file.setdefault(d["file"], []).append(d)
    by_name = {}
    for d in defs:
        by_name.setdefault(d["name"], []).append(d["id"])
    edges = {}
    for c in calls:
        caller = None
        best = -1
        for d in by_file.get(c["file"], []):
            if d["line"] <= c["line"] <= d["end"] and d["line"] > best:
                caller, best = d["id"], d["line"]
        targets = [t for t in by_name.get(c["name"], []) if t != caller]
        if not targets:
            continue  # external / builtin
        key = (caller or f"{c['file']}::<module>", c["name"])
        if key not in edges:
            edges[key] = {"caller": key[0], "callee": c["name"],
                          "targets": sorted(set(targets))[:10],
                          "sites": [{"file": c["file"], "line": c["line"], "raw": c["raw"]}]}
        else:
            e = edges[key]
            e["targets"] = sorted(set(e["targets"]) | set(targets))[:10]
            e["sites"].append({"file": c["file"], "line": c["line"], "raw": c["raw"]})
    return {"roots": [os.path.abspath(r) for r in roots], "defs": defs,
            "edges": sorted(edges.values(), key=lambda e: (e["caller"], e["callee"]))}


def selfcheck():
    src = {
        "a.py": "def foo(x):\n    return bar(x)\n\ndef bar(y):\n    return y\n",
        "b.ts": "export function alpha(n) { return beta(n); }\n"
                "const beta = (n) => { return n; };\n"
                "class H {\n  gam(n) { return alpha(n); }\n}\n",
        "c.go": "package main\n\nfunc main() { double(1) }\n"
                "func double(n int) int { return n * 2 }\n",
        "d.rs": "fn main() { helper(1); }\npub fn helper(n: i32) -> i32 { n + 1 }\n",
    }
    with tempfile.TemporaryDirectory() as td:
        for fn, body in src.items():
            open(os.path.join(td, fn), "w").write(body)
        g = build_graph([td])
    names = {(d["name"], d["kind"]) for d in g["defs"]}
    assert ("foo", "function") in names and ("bar", "function") in names, names
    assert ("alpha", "function") in names and ("beta", "function") in names, names
    assert ("gam", "method") in names and ("H", "class") in names, names
    assert ("main", "function") in names and ("double", "function") in names, names
    assert ("helper", "function") in names, names  # pub fn with return type
    callers = {e["caller"].split("::")[1].split("#")[0]: e["callee"]
               for e in g["edges"]}
    assert callers.get("foo") == "bar", g["edges"]
    assert callers.get("alpha") == "beta", g["edges"]
    assert callers.get("gam") == "alpha", g["edges"]
    assert callers.get("main") in ("double", "helper"), g["edges"]
    print(f"selfcheck OK: {len(g['defs'])} defs, {len(g['edges'])} edges")


def main(argv):
    if "--selfcheck" in argv:
        if not SG:
            sys.exit("ast-grep (sg) not on PATH")
        selfcheck()
        return
    out = "graph.json"
    roots = []
    it = iter(argv[1:])
    for a in it:
        if a == "--out":
            out = next(it)
        else:
            roots.append(a)
    if not SG:
        sys.exit("ast-grep (sg) not on PATH")
    roots = roots or ["."]
    g = build_graph(roots)
    with open(out, "w") as f:
        json.dump(g, f, indent=1)
    print(f"{out}: {len(g['defs'])} defs, {len(g['edges'])} edges "
          f"across {len({d['file'] for d in g['defs']})} files")


if __name__ == "__main__":
    main(sys.argv)
