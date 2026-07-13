#!/usr/bin/env python3
"""Extract the table of contents / structure from an epub or PDF.

Usage: extract_structure.py <path-to-epub-or-pdf-or-epub-dir>
Prints one TOC entry per line (indented by depth for PDFs with nested outlines).
For PDFs without an outline, falls back to printing the first ~3 pages of text so the
caller can read the printed contents page.
"""
import html
import os
import re
import sys
import zipfile
from pathlib import Path


def parse_ncx(data):
    labels = re.findall(r"<navPoint[^>]*>.*?<text>(.*?)</text>", data, re.S)
    return [html.unescape(re.sub(r"\s+", " ", l)).strip() for l in labels]


def parse_nav(data):
    m = re.search(r'<nav[^>]*epub:type="toc".*?</nav>', data, re.S)
    if not m:
        return []
    items = re.findall(r"<a[^>]*>(.*?)</a>", m.group(0), re.S)
    return [html.unescape(re.sub(r"<[^>]+>|\s+", " ", i)).strip() for i in items]


def epub_toc(path):
    if os.path.isdir(path):
        files = [str(p) for p in Path(path).rglob("*") if p.suffix in (".ncx", ".xhtml", ".html")]
        for f in files:
            if f.endswith(".ncx"):
                return parse_ncx(Path(f).read_text(errors="ignore"))
        for f in files:
            t = parse_nav(Path(f).read_text(errors="ignore"))
            if t:
                return t
        return []
    z = zipfile.ZipFile(path)
    names = z.namelist()
    ncx = [n for n in names if n.endswith(".ncx")]
    if ncx:
        return parse_ncx(z.read(ncx[0]).decode("utf8", "ignore"))
    for n in names:
        if n.endswith((".xhtml", ".html")):
            t = parse_nav(z.read(n).decode("utf8", "ignore"))
            if t:
                return t
    return []


def pdf_toc(path):
    from pypdf import PdfReader  # pip install pypdf

    r = PdfReader(path)
    out = []

    def walk(ol, depth):
        for item in ol:
            if isinstance(item, list):
                walk(item, depth + 1)
            else:
                out.append("  " * depth + (item.title or ""))

    try:
        walk(r.outline, 0)
    except Exception:
        pass
    if out:
        return out
    # fallback: dump the first pages (likely the printed contents)
    text = []
    for page in r.pages[:6]:
        text.append(page.extract_text() or "")
    return ["(no PDF outline — first pages follow)"] + "\n".join(text).splitlines()


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    low = path.lower()
    if low.endswith(".pdf"):
        entries = pdf_toc(path)
    else:
        entries = epub_toc(path)
    if not entries:
        sys.exit("no structure found — read the source files directly")
    print("\n".join(entries))


if __name__ == "__main__":
    main()
