# Pi Agent Configuration

This directory is the source of truth for the Pi AI agent configuration. Changes here should be synced to `~/.pi/agent/`.

## Directory Structure

```
pi/
├── SYSTEM.md           # Core system prompt and developer guidelines
├── settings.json       # Default provider/model, enabled and scoped models, packages, theme
├── models.json         # Custom providers (llama-local, Bedrock); keys resolve from commands
├── auth.json           # OAuth credentials — gitignored, never committed
├── extensions/         # TypeScript extensions (see extensions/README.md)
│   ├── adversarial-review/  # /review-repo and /review-change multi-agent review
│   ├── codegraph/      # codegraph_explore, codegraph_affected_tests, codegraph_status
│   ├── goal-loop/      # /goal: retry with a fresh context until a check passes
│   ├── context7.ts
│   ├── lsp.ts
│   ├── obscura.ts
│   ├── openrouter-fusion.ts  # Adds the OpenRouter fusion plugin to openrouter/fusion requests
│   ├── tavily.ts
│   └── tools-command.ts
├── skills/             # Skills tied to pi tools or general agent behavior
│   ├── caveman/        # Ultra-compressed replies
│   ├── codegraph/      # Read code through the CodeGraph index
│   ├── codegraph-adhoc/  # codegraph CLI lookups across all repos
│   ├── context7/       # Context7 documentation retrieval
│   ├── grill-with-docs/  # Stress-test a plan against domain docs and ADRs
│   ├── lsp/            # Structural code analysis via ast-grep
│   ├── obscura/        # Web scraping via Obscura headless browser
│   ├── spotify/        # Spotify Web API (catalog search + user playlists)
│   ├── tavily/         # AI-powered web search
│   ├── token-diagnostics/  # Agent token usage analysis and fleet reporting
│   └── zinsser/        # Zinsser-method rewrites
├── bin/                # fd, pi (managed version launcher), pi-review-loop, pi-usage
└── sessions/           # Session history — gitignored, never committed
```

Domain skills (Obsidian, review, utils, writing, languages) live in [`../skills/`](../skills/README.md) and deploy to the same `~/.pi/agent/skills/` folder.

## Syncing to Live

Copy config files to `~/.pi/agent/` to apply changes:

```bash
# Example: deploy a skill update
cp -a pi/skills/tavily/. ~/.pi/agent/skills/tavily/
cp -a skills/review/pinned-eslint/. ~/.pi/agent/skills/pinned-eslint/

# Example: deploy an extension update
cp pi/extensions/tavily.ts ~/.pi/agent/extensions/tavily.ts
```

`auth.json` and `sessions/` are excluded via `.gitignore` and must never be committed.
