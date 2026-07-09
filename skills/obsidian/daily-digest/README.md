# Daily Digest

Generate *The Architect's Digest* — a daily curated briefing of architecture, distributed systems, cloud, languages, tooling, AI agents, and CS research.

## Files

- `SKILL.md` — the full research and writing procedure.

## Output

```
__.DailyDigest/YYYY-MM-DD-architects-digest.md
```

## Sources

- Hacker News
- Lobsters
- GitHub Trending
- InfoQ
- Engineering blogs and research outlets

## Workflow

1. Gather raw signals in parallel using `tavily_search` and `obscura_web_scrape`.
2. Collect at least 5 candidates per section and at least 50 distinct GitHub repositories before filtering.
3. Score and select the most architecturally relevant entries.
4. Write a long-form, annotated briefing across 7 sections.
