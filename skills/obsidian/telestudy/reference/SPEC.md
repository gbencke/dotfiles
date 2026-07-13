# Telestudy Guide — Authoring Spec

You are writing ONE telescopic HTML study guide for a source the user owns or reads
(book, PDF, paper, article, long essay, lecture transcript…).

## The HTML shell

Study `reference/exemplar.html` (in the Telestudy skill folder). Your output uses the IDENTICAL
shell: `<!DOCTYPE html>…<head>` with the source's title, `<link rel="stylesheet" href="…/guide.css">`,
one `<script id="book-data" type="application/json">` block holding ALL content, then
`<script src="…/guide.js"></script>`. No other markup — the shared renderer builds the whole page
(telescoping idea cards, dependency graph, chapter map) from the JSON. The asset paths are relative:
`../assets/` when the guide lives in a library's `books/` folder, `assets/` when standalone.

## Grounding

NEVER confabulate content, examples, numbers, or names. Extract and skim the actual source unless
you know it deeply. Never invent chapter/section numbering or titles — use the real structure
(`scripts/extract_structure.py` pulls TOCs from epubs and PDFs).

## The JSON

Top-level fields:

| field | notes |
|---|---|
| `slug` | kebab-case, matches the filename |
| `title`, `subtitle?`, `author`, `year?` | as published |
| `category` | short shelf label ("Physics", "Business", "Article · Tech"…) |
| `assetId?` | Apple Books asset id — renders an `ibooks://assetid/<id>` deep link |
| `sourceUrl?` | any URL/URI for the source (article URL, `file:///…` for a local PDF). Takes precedence over `assetId` |
| `sourceLabel?` | button label override (defaults: "Open in Apple Books" / "Open the source") |
| `library` | set `false` for a standalone guide (hides the "← The Reading Room" back links) |
| `tagline` | one arresting sentence (used on the library index card) |
| `thesis` | array of exactly 2 paragraphs — "the source in one breath". May use `<em>` |
| `ideas` | see below |
| `chapters` | the real reading structure — see below |

**`ideas`** — scale to the source: long book 9–15, short book 8–10, paper/long article 5–8,
short article 4–6. Each:
- `id`: short-kebab-case, stable
- `title`: crisp claim, not a topic ("Tails, you win", not "The importance of outliers")
- `oneLiner`: one italic sentence a skimmer reads (the L1 layer)
- `role`: `foundation | mechanism | implication | practice | case`
  (foundation = premise/axiom; mechanism = how the world works; implication = what follows;
  practice = what to do; case = extended worked example/story)
- `dependsOn`: ids this idea genuinely builds on ("you must grasp X to fully get Y").
  The whole set must form a **connected acyclic DAG**, 2+ roots (1 root ok below 6 ideas),
  ~1–2.5 edges per idea. Run the validator; wire any disconnected node with a *semantically
  honest* edge or drop it.
- `chapters`: chapter/section numbers (matching `chapters[].n`) where the source develops it
- `summary`: 2 paragraphs (L2) — the idea explained with the source's own examples, numbers,
  characters. Concrete, vivid, zero filler.
- `deeper`: 1–3 subsections `{heading, body:[1–2 paragraphs]}` (L3) — evidence, edge cases,
  counterarguments, cross-links to other ideas. For contested claims, include the criticism.
- `quote?`: `{text, context}` — ONE verbatim quote, MAX 25 words, only if certain; else omit.

**`chapters`** — the source's real structure. Each:
`{n (integer; 0 for intro), label ("Ch. 3", "Part II · 7", "§4", "Letters 1–12"…), title,
summary (one crisp sentence), ideas: [idea ids developed there]}`.
Cover all substantive chapters/sections; skip front/back matter. Group many tiny chapters (50+)
into clusters a studier would navigate by, labels faithful ("Ch. 12–18"). For an article, sections
(by heading) play the chapter role.

## Writing bar

Write like a brilliant teaching assistant who actually read the source: named people, real
numbers, specific stories. No "this chapter discusses…". The reader must be able to (a) skim all
one-liners in ~2 minutes, (b) expand what intrigues them, (c) go one level deeper, and (d) jump
into the actual chapter/section at the source.

Copyright: ALL prose in your own words; never reproduce passages. Quotes ≤ 25 words, max one per idea.

JSON hygiene: double quotes, no trailing commas, escape embedded double quotes. The ONLY markup
allowed inside strings is `<em>` and `<strong>` (and `&amp;` entities).

## Validate

Run `scripts/validate.py <guide.html>` and fix every failure before finishing.
