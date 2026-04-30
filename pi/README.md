# Pi Agent Configuration

This directory is the source of truth for the Pi AI agent configuration. Changes here should be synced to `~/.pi/agent/`.

## Directory Structure

```
pi/
├── SYSTEM.md           # Core system prompt and developer guidelines
├── settings.json       # Default provider, model, and agent settings
├── auth.json           # OAuth credentials — gitignored, never committed
├── extensions/         # TypeScript tool implementations
│   ├── context7.ts
│   ├── lsp.ts
│   ├── obscura.ts
│   ├── tavily.ts
│   └── tools-command.ts
├── skills/             # Skill definitions loaded by the agent
│   ├── context7/       # Context7 documentation retrieval
│   ├── daily-digest/   # The Architect's Digest — daily engineering briefing
│   ├── lsp/            # Structural code analysis via ast-grep
│   ├── obscura/        # Web scraping via Obscura headless browser
│   ├── raindrop/       # Raindrop.io bookmark management
│   ├── storm/          # Deep research via STORM methodology
│   ├── tavily/         # AI-powered web search
│   └── yt-dlp/         # Audio/video download via yt-dlp
├── bin/                # Helper binaries (e.g., fd)
└── sessions/           # Session history — gitignored, never committed
```

## Syncing to Live

Copy config files to `~/.pi/agent/` to apply changes:

```bash
# Example: deploy a skill update
cp pi/skills/daily-digest/SKILL.md ~/.pi/agent/skills/daily-digest/SKILL.md

# Example: deploy an extension update
cp pi/extensions/tavily.ts ~/.pi/agent/extensions/tavily.ts
```

`auth.json` and `sessions/` are excluded via `.gitignore` and must never be committed.
