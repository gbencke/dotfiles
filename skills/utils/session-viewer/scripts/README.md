# Session Viewer Scripts

TypeScript source and tests for the session viewer.

## Files

- `html.ts` — HTML rendering helpers.
- `session-viewer.ts` — main CLI entry point.
- `session-viewer.test.ts` — tests.
- `core/` — shared session types, JSONL parsing, and format detection.
- `importers/` — one parser per agent format: Claude Code, Codex, and Pi/OpenClaw.

Run the viewer with:

```bash
node session-viewer.ts <session.jsonl> --out session.html
```
