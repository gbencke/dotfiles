---
name: daily-digest
description: Generate The Architect's Digest — a daily curated briefing of the most relevant stories in architecture, distributed systems, cloud, languages, tooling, AI agents, and CS research, sourced live from Hacker News, Lobsters, GitHub Trending, InfoQ, and top engineering blogs.
---

# The Architect's Digest Skill

This skill produces a daily curated digest for software architects. The output is a long-form briefing: substantive, deeply annotated entries across 6 sections, written for senior engineers who want context and architectural implications — not headlines.

## Tools to Use

- `tavily_search`: Primary research tool. Use `search_depth: 'advanced'` and `topic: 'news'` when freshness matters. Always include `time_range: 'week'`.
- `obscura_web_scrape`: Fetch full article text when a search snippet is too thin to annotate meaningfully. Use for InfoQ, engineering blogs, and GitHub Trending.

## Output

Save the digest to:

```
__.DailyDigest/YYYY-MM-DD-architects-digest.md
```

Create the `__.DailyDigest/` directory if it does not exist.

---

## Workflow

### Step 1 — Gather raw signals (run all searches in parallel)

Collect at minimum **5 candidates per section** before writing anything. Run all searches simultaneously — do not wait for one batch to complete before starting the next.

#### Architecture & Distributed Systems
```
tavily_search("distributed systems architecture infoq 2026", topic: 'news', search_depth: 'advanced', time_range: 'week')
tavily_search("infoq.com architecture microservices distributed systems 2026", search_depth: 'advanced', time_range: 'week')
tavily_search("database reliability engineering zero-downtime upgrade 2026", search_depth: 'advanced', time_range: 'week')
tavily_search("site:news.ycombinator.com distributed systems architecture 2026", topic: 'news', time_range: 'week')
```

#### GitHub Trending
```
obscura_web_scrape("https://github.com/trending?since=daily")
obscura_web_scrape("https://github.com/trending?since=weekly")
```
Extract: repo name, star total, stars today, language, description. Pick 4–5 most architecturally relevant repos.

#### Languages & Tooling
```
tavily_search("programming language release rust golang typescript c++ 2026", topic: 'news', time_range: 'week')
tavily_search("developer tooling IDE compiler announcement 2026", topic: 'news', search_depth: 'advanced', time_range: 'week')
tavily_search("site:lobste.rs programming language tooling compiler 2026", topic: 'news', time_range: 'week')
tavily_search("infoq.com developer tools platform engineering 2026", search_depth: 'advanced', time_range: 'week')
```

#### Cloud & Infrastructure
```
tavily_search("AWS GCP Azure kubernetes infrastructure announcement 2026", topic: 'news', search_depth: 'advanced', time_range: 'week')
tavily_search("data center network fabric AI infrastructure 2026", search_depth: 'advanced', time_range: 'week')
tavily_search("cloud provider new service announcement infoq 2026", search_depth: 'advanced', time_range: 'week')
```

#### AI & Agents
```
tavily_search("AI agent architecture production multi-agent system 2026", topic: 'news', search_depth: 'advanced', time_range: 'week')
tavily_search("LLM agent orchestration workflow enterprise 2026", topic: 'news', search_depth: 'advanced', time_range: 'week')
tavily_search("MCP model context protocol security architecture 2026", search_depth: 'advanced', time_range: 'week')
tavily_search("infoq.com AI agents agentic systems context management 2026", search_depth: 'advanced', time_range: 'week')
```

#### CS Research
```
tavily_search("site:queue.acm.org distributed systems database paper 2026", time_range: 'week')
tavily_search("arxiv.org cs.DC cs.DB distributed systems 2026", topic: 'news', time_range: 'week')
tavily_search("post-quantum cryptography migration security 2026", search_depth: 'advanced', time_range: 'week')
tavily_search("observability tracing AI agent research 2026", search_depth: 'advanced', time_range: 'week')
```

---

### Step 2 — Fetch full articles for top candidates

For any candidate where the search snippet is insufficient to write a substantive annotation, fetch the full article:

```
obscura_web_scrape("{article URL}", dump: 'text')
```

Do this for at least 6–8 of the best candidates. Thin snippets produce thin annotations.

---

### Step 3 — Score and select

For each candidate, score on three axes (1–3 each):

| Axis | Question |
|---|---|
| **Relevance** | Is this directly useful to a working architect? |
| **Novelty** | Is this new information, not a rehash? |
| **Depth** | Is there enough substance to annotate at length? |

Keep only items scoring **7 or higher**. Target **100 total items** across all sections. If a section has fewer than 15 qualifying items, run additional targeted searches for that section before proceeding.

---

### Step 4 — Write annotations

For each selected item, write a **comprehensive annotation of 350–600 words** covering:

1. **What it is** — state the thing plainly, with concrete specifics (numbers, names, versions).
2. **The architectural mechanism** — explain *how* it works, not just *that* it works.
3. **The architectural implication** — why does this matter to someone designing systems?
4. **Context and comparison** — connect it to something the reader already knows: a pattern, a prior art, a related incident, a competing approach.
5. **Tradeoffs and caveats** — what doesn't this solve? What are the risks or limitations?
6. **Actionability** — what should the reader do, evaluate, or watch next?

Use the tone of a senior engineer explaining something to a peer — direct, specific, no hype. Phrase caveats and limitations honestly. Let complexity stand; do not oversimplify.

Example tone target:
> Yelp's DBRE team did an in-place rolling upgrade across 1,000+ Cassandra nodes without interrupting production — no parallel cluster, no maintenance window. The strategy combined controlled batch upgrades, cluster repair between each step, and automated health checks throughout. Unlike blue-green approaches that spin up a parallel cluster, this was the harder path: it relies entirely on Cassandra's backward compatibility window and requires the cluster to remain coherent throughout the upgrade sequence. The architectural takeaway generalizes: stateful systems can be continuously upgraded if you treat the cluster as a rolling contract, not a monolith. Teams on Kafka, Elasticsearch, or any AP-model database have a concrete runbook to study here. The important caveat is that this approach requires deep automation investment upfront — attempting it manually at this scale would be unsafe.

---

### Step 5 — Select the lead story

The lead story is the single most architecturally significant item across all sections. It must:
- Represent a meaningful shift in the landscape
- Be something a senior engineer would immediately want to discuss with their team
- Have concrete evidence or production data backing it (not just an announcement)

Write a one-sentence lead blurb for the `> **Lead story:**` block.

---

### Step 6 — Assemble the digest

Use this exact template:

```markdown
# The Architect's Digest
### {Day of week}, {Month} {Day}, {Year}

> **Lead story:** {one-sentence lead blurb}

---

## Architecture & Systems

**[{Title}]({URL})**
*Source: {Source name} · {date or engagement metric if available}*

{annotation — 350–600 words}

`tags: {tag1} · {tag2} · {tag3} · {tag4}`

---

{repeat for each item in this section}

## GitHub Trending

**[{owner/repo} — ★{total} (+{today} today)]({URL})**
*Source: GitHub Trending · {language}*

{annotation — 350–600 words}

`tags: {tag1} · {tag2} · {tag3}`

---

{repeat for each item in this section}

## Language & Tooling

{same item format}

---

## Cloud & Infrastructure

{same item format}

---

## AI & Agents

{same item format}

---

## CS & Research

{same item format}
```

Assembly rules:
- Every item must have a working URL obtained from a search or scrape result. Never construct URLs by inference.
- Tags: lowercase, hyphen-separated, 3–6 per item.
- Source attribution: use the actual publication name (InfoQ, The New Stack, GitHub Trending, etc.).
- Engagement metrics (HN points, GitHub star counts): include when found; omit when not — never estimate.
- Section order: Architecture & Systems → GitHub Trending → Language & Tooling → Cloud & Infrastructure → AI & Agents → CS & Research.
- If a section genuinely has no qualifying items on a given day, omit the section entirely rather than padding it.

---

### Step 7 — Save

Write the assembled digest to `__.DailyDigest/YYYY-MM-DD-architects-digest.md`. Print the full path when done.

---

## Execution Rules

- **Stay current.** All items must be from the past 7 days unless explicitly labelled as a resurface of a classic paper.
- **No hallucinated links.** Every URL must have been returned by a tool call. If uncertain, verify with a second `tavily_search` or `obscura_web_scrape` before including.
- **No padding.** Weak items with thin substance are worse than a shorter digest. Drop them.
- **Minimum word count: 10,000 words.** The digest should be substantive enough to serve as a complete weekly briefing. Annotations are the primary vehicle — invest in depth.
- **Tone.** Direct, senior-engineer-to-senior-engineer. No hype, no filler ("game-changing", "revolutionary", "exciting"). State what something does, what it costs, and what it doesn't solve.
- **Minimum items: 100.** Spread across all six sections. Architecture & Systems should have at least 20 items. GitHub Trending should have at least 10 items. AI & Agents should have at least 15 items. Language & Tooling, Cloud & Infrastructure, and CS & Research should each have at least 10 items. Keep running additional searches until the 100-item target is met.
