# STORM

Execute a deep research and writing pipeline using the STORM methodology.

## What it does

- Takes a topic and produces a deeply researched, cited long-form article.
- Uses web search, page scraping, and library docs as sources.
- Incorporates human-in-the-loop feedback.

## Artifact layout

State is kept in `.storm/<topic-slug>/`:

```
.storm/<topic-slug>/
  topic.md
  outline/
  perspectives/
  references/
  sections/
  final_article.md
```

## Files

- `SKILL.md` — the full STORM pipeline, file rules, and workflow.
