# Session Viewer

Render Codex, Claude Code, OpenClaw, or Pi session JSONL transcripts as a searchable, shareable single-file HTML viewer.

## Usage

From a repo that has this skill:

```bash
node skills/session-viewer/scripts/session-viewer.ts <session.jsonl> --out /tmp/session.html --open
```

Useful modes:

```bash
node scripts/session-viewer.ts <session.jsonl> --out session.html
node scripts/session-viewer.ts <session.jsonl> --raw --out session.html
node scripts/session-viewer.ts --blank --out viewer.html --open
```

## Features

- Detects `codex`, `claude`, or `pi-openclaw` formats.
- Embeds normalized session data into one HTML file.
- Keeps tool input/output text in the DOM so browser search works.
- `--raw` embeds the original JSONL and lets the browser parse it.
- `--blank` creates a reusable file-picker viewer.

## Files

- `SKILL.md` — the full usage guide and session location examples.
- `tsconfig.json` — TypeScript configuration.
- `scripts/` — TypeScript source and tests.
- `agents/openai.yaml` — OpenAI agent configuration.
