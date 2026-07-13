#!/usr/bin/env python3
"""Validate a Telestudy guide: JSON parses, refs resolve, DAG acyclic & connected, quotes short.

Usage: validate.py <guide.html> [<guide2.html> ...]
"""
import json
import re
import sys
from pathlib import Path


def check(f):
    html = f.read_text()
    m = re.search(r'<script id="book-data" type="application/json">(.*?)</script>', html, re.S)
    assert m, "no book-data block"
    assert "guide.css" in html and "guide.js" in html, "missing shared asset refs"
    d = json.loads(m.group(1))
    for k in ("slug", "title", "author", "category", "tagline", "thesis", "ideas", "chapters"):
        assert k in d, f"missing field {k}"
    assert d["slug"] == f.stem, f"slug {d['slug']} != filename {f.stem}"
    assert d.get("assetId") or d.get("sourceUrl") or d.get("library") is False, \
        "no assetId/sourceUrl — add one, or set library:false intentionally"
    ids = [i["id"] for i in d["ideas"]]
    assert len(ids) == len(set(ids)), "duplicate idea ids"
    idset = set(ids)
    ns = {c["n"] for c in d["chapters"]}
    deps = {}
    for i in d["ideas"]:
        for k in ("title", "oneLiner", "role", "summary"):
            assert i.get(k), f"idea {i['id']} missing {k}"
        assert set(i.get("dependsOn", [])) <= idset, f"idea {i['id']} bad dependsOn"
        assert set(i.get("chapters", [])) <= ns, f"idea {i['id']} refs unknown chapter"
        q = i.get("quote")
        if q:
            assert len(q.get("text", "").split()) <= 30, f"quote too long in {i['id']}"
        deps[i["id"]] = set(i.get("dependsOn", []))
    seen = set()

    def walk(x, stack):
        assert x not in stack, "cycle at " + x
        if x in seen:
            return
        seen.add(x)
        for y in deps[x]:
            walk(y, stack | {x})

    for k in deps:
        walk(k, set())
    assert [k for k, v in deps.items() if not v], "no root ideas"
    adj = {k: set() for k in deps}
    for k, v in deps.items():
        for x in v:
            adj[k].add(x)
            adj[x].add(k)
    comp, todo = set(), [ids[0]]
    while todo:
        x = todo.pop()
        if x in comp:
            continue
        comp.add(x)
        todo += list(adj[x])
    stray = idset - comp
    assert not stray, f"disconnected ideas: {sorted(stray)} — wire them with honest edges"
    raw = m.group(1)
    badtags = set(re.findall(r"<(?!/?(?:em|strong)\b)([a-zA-Z]+)", raw))
    assert not badtags, f"forbidden tags {badtags}"
    edges = sum(len(v) for v in deps.values())
    print(f"OK {d['slug']} ideas={len(ids)} chapters={len(d['chapters'])} edges={edges}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    fails = 0
    for arg in sys.argv[1:]:
        try:
            check(Path(arg))
        except Exception as e:
            fails += 1
            print(f"FAIL {arg}: {e}")
    sys.exit(1 if fails else 0)
