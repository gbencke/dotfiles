#!/usr/bin/env python3
"""Generate a Reading Room index.html for a Telestudy library folder.

Usage: build_index.py <library-root>   (a folder containing assets/ and books/)
"""
import json, re, html
from pathlib import Path

import sys
if len(sys.argv) != 2:
    sys.exit(__doc__)
ROOT = Path(sys.argv[1])
books = []
for f in sorted((ROOT / "books").glob("*.html")):
    m = re.search(r'<script id="book-data" type="application/json">(.*?)</script>', f.read_text(), re.S)
    if not m:
        continue
    try:
        d = json.loads(m.group(1))
    except Exception as e:
        print("SKIP (bad json):", f.name, e)
        continue
    books.append({
        "file": "books/" + f.name,
        "title": d.get("title", f.stem),
        "author": d.get("author", ""),
        "category": d.get("category", "Uncategorized"),
        "tagline": d.get("tagline", ""),
        "ideas": len(d.get("ideas", [])),
        "chapters": len(d.get("chapters", [])),
        "year": d.get("year", ""),
    })

CAT_ORDER = ["Philosophy", "Physics", "Science", "Economics & History", "History", "Geopolitics",
             "Tech & Society", "Business", "Psychology & Self", "Health", "Biography"]
cats = {}
for b in books:
    cats.setdefault(b["category"], []).append(b)
for L in cats.values():
    L.sort(key=lambda b: b["title"].lower().removeprefix("the "))

def esc(s): return html.escape(str(s), quote=True)

cards = []
for cat in CAT_ORDER + sorted(set(cats) - set(CAT_ORDER)):
    if cat not in cats: continue
    grid = "\n".join(
        f'''<a class="book-card" href="{esc(b['file'])}" data-search="{esc((b['title'] + ' ' + b['author'] + ' ' + b['tagline']).lower())}">
  <h3>{esc(b['title'])}</h3>
  <span class="bc-author">{esc(b['author'])}{(' · ' + esc(b['year'])) if b['year'] else ''}</span>
  <span class="bc-tag">{esc(b['tagline'])}</span>
  <span class="bc-meta">{b['ideas']} ideas · {b['chapters']} chapters</span>
</a>''' for b in cats[cat])
    cards.append(f'''<section class="lib-cat" data-cat>
  <div class="section-label">{esc(cat)} — {len(cats[cat])}</div>
  <div class="lib-grid">
{grid}
  </div>
</section>''')

page = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Reading Room — Telescopic Study Guides</title>
<link rel="stylesheet" href="assets/guide.css">
</head>
<body>
<div class="page" style="max-width:1100px">
  <header class="lib-hero">
    <div class="eyebrow">A private library of telescopic study guides</div>
    <h1>The Reading Room</h1>
    <p class="lib-sub">Every idea-driven book from the Apple Books shelf, distilled: skim the key ideas in minutes,
    telescope into the ones that matter, trace the ideas graph, then open the real chapter in Apple Books.</p>
  </header>
  <div class="lib-tools">
    <input class="lib-search" type="search" placeholder="Search title, author, or idea&hellip;" aria-label="Search guides">
    <span class="lib-count">{len(books)} guides</span>
  </div>
  {"".join(cards)}
  <footer class="guide-foot"><span>Built from your Apple Books library.</span><span>{len(books)} study guides</span></footer>
</div>
<script>
const inp = document.querySelector('.lib-search');
const cnt = document.querySelector('.lib-count');
const cards = [...document.querySelectorAll('.book-card')];
inp.addEventListener('input', () => {{
  const q = inp.value.trim().toLowerCase();
  let n = 0;
  cards.forEach(c => {{ const hit = !q || c.dataset.search.includes(q); c.style.display = hit ? '' : 'none'; if (hit) n++; }});
  document.querySelectorAll('[data-cat]').forEach(s => {{
    s.style.display = [...s.querySelectorAll('.book-card')].some(c => c.style.display !== 'none') ? '' : 'none';
  }});
  cnt.textContent = n + ' guides';
}});
</script>
</body>
</html>'''
(ROOT / "index.html").write_text(page)
print(f"index.html written — {len(books)} guides across {len(cats)} categories")
