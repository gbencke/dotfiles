# tgsearch

Search Telegram from the command line, built on Telethon (MTProto user API).

## What it does

- Discovers public Telegram channels by keyword (`find`).
- Searches message text within a single channel (`grep`).
- Supports Telegram OSINT from the terminal.

## Prerequisites

- `pip install telethon`.
- `TG_API_ID` and `TG_API_HASH` in the environment (from https://my.telegram.org).
- First run prompts for phone + login code; the session caches to `tgsearch.session`.

## Files

- `SKILL.md` — setup, usage, and notes.
- `tgsearch.py` — the CLI script.
