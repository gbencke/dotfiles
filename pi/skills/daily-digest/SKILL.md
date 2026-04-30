---
name: daily-digest
description: Generate The Architect's Digest — a daily curated briefing of the most relevant stories in architecture, distributed systems, cloud, languages, tooling, and CS research, sourced live from Hacker News, Lobsters, GitHub Trending, InfoQ, and top engineering blogs.
---

# The Architect's Digest Skill

This skill produces a daily curated digest for software architects. The output follows the format of `architect-digest-example.md`: a lead story, structured sections with annotated entries, and tags per item.

## Tools to Use

- `tavily_search`: Primary research tool. Use `search_depth: 'advanced'` and `topic: 'news'` when freshness matters.
- `obscura_web_scrape`: Read full articles when snippets are too thin to write a meaningful annotation.

## Output

Save the digest to a file in the current working directory:

```
.daily-digests/YYYY-MM-DD-architects-digest.md
```

Create the `.daily-digests/` directory if it does not exist.

---

## Workflow

### Step 1 — Gather raw signals

Run parallel searches across all source categories below. Collect at minimum **3 candidates per section** before writing anything.

#### Architecture & Distributed Systems
```
tavily_search("site:news.ycombinator.com distributed systems architecture 2026", topic: 'news', search_depth: 'advanced')
tavily_search("site:lobste.rs distributed systems database architecture", topic: 'news')
tavily_search("infoq.com architecture microservices 2026", search_depth: 'advanced')
```

#### GitHub Trending
```
obscura_web_scrape("https://github.com/trending?since=daily")
obscura_web_scrape("https://github.com/trending?since=weekly")
```
Extract repo name, star count, description, and language for the top 10 entries. Pick 3 most relevant to architects.

#### Languages & Tooling
```
tavily_search("typescript golang rust zig release announcement 2026", topic: 'news')
tavily_search("site:lobste.rs programming language tooling compiler 2026", topic: 'news')
```

#### Cloud & Infrastructure
```
tavily_search("AWS GCP Azure infrastructure announcement kubernetes ebpf 2026", topic: 'news', search_depth: 'advanced')
tavily_search("site:aws.amazon.com/blogs new service announcement", topic: 'news')
```

#### CS Research
```
tavily_search("site:queue.acm.org distributed systems database paper 2026")
tavily_search("site:arxiv.org cs.DC cs.DB distributed systems 2026", topic: 'news')
tavily_search("site:lobste.rs papers research computer science 2026", topic: 'news')
```

---

### Step 2 — Score and select

For each candidate, score on three axes (1–3 each):

| Axis | Question |
|---|---|
| **Relevance** | Is this directly useful to a working architect? |
| **Novelty** | Is this new information, not a rehash? |
| **Depth** | Is there enough substance to annotate meaningfully? |

Keep only items scoring **7 or higher**. If a section has fewer than 2 qualifying items, run one additional search for that section.

---

### Step 3 — Write annotations

For each selected item, write a **3–5 sentence annotation**:

1. **What it is** — state the thing plainly.
2. **The architectural implication** — why does this matter to someone designing systems?
3. **Context or comparison** — connect it to something the reader already knows (a paper, a pattern, a prior art).
4. **Actionability** — what should the reader do or watch next?

Use the example below as the tone and length target:

> The new `conflict_action` parameter allows per-table policies — `ignore`, `apply_remote`, or `apply_local` — evaluated inside the replication worker. The architectural implication is significant: teams running active-active Aurora or RDS setups via pglogical can now express conflict semantics declaratively rather than via trigger hacks. Pairs well with row-level security for multi-tenant schemas.

Keep annotations factual and grounded in what was actually found. Do not invent details.

---

### Step 4 — Select the lead story

The lead story is the single most significant item across all sections. It must:
- Represent a meaningful shift in the architectural landscape
- Be something a senior engineer would immediately want to discuss

Write a one-sentence lead blurb for the `> **Lead story:**` block.

---

### Step 5 — Assemble the digest

Use this exact template:

```markdown
# The Architect's Digest
### {Day of week}, {Month} {Day}, {Year}

> **Lead story:** {one-sentence lead blurb}

---

## Architecture & Systems

**[{Title}]({URL})**
*Source: {Source name} · {engagement metric if available}*

{annotation}

`tags: {tag1} · {tag2} · {tag3}`

---

{repeat for each item in this section}

## GitHub Trending

**[{owner/repo} — {star metric}]({URL})**
*Source: GitHub Trending*

{annotation}

`tags: {tag1} · {tag2} · {tag3}`

---

{repeat for each item in this section}

## Language & Tooling

{same item format}

## Cloud & Infrastructure

{same item format}

## CS & Research

{same item format}
```

Rules:
- Every item must have a working URL.
- Tags must be lowercase, hyphen-separated, and relevant (3–5 per item).
- Source attribution must be accurate — use the actual publication or site name.
- Engagement metrics (HN points, star counts) are optional but include them when available.
- Do not invent or estimate metrics. Omit them if not found.

---

### Step 6 — Save

Write the assembled digest to the output path. Print the path when done.

---

## Execution Rules

- **Stay current.** All items must be from the past 7 days unless the item is a resurface of a classic paper (clearly label it as such).
- **No hallucinated links.** Every URL must have been returned by a search or scrape tool call. Verify with a second tool call if uncertain.
- **No padding.** If fewer than 2 quality items exist in a section on a given day, collapse that section rather than filling it with weak entries.
- **Tone.** Direct, senior-engineer-to-senior-engineer. No hype, no filler phrases ("game-changing", "revolutionary"). Let the substance speak.
- **Length.** Each annotation: 3–5 sentences. Total digest: 800–1500 words excluding tags and headers.
