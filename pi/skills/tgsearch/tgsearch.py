#!/usr/bin/env python3
"""tgsearch — search Telegram channels from the CLI.

Requires: pip install telethon
Env: TG_API_ID and TG_API_HASH from https://my.telegram.org
First run asks for phone number + login code, then caches a session
(tgsearch.session) in the current directory.
"""
import argparse
import asyncio
import os
import sys


def parse_args():
    p = argparse.ArgumentParser(
        prog="tgsearch",
        description="Discover public Telegram channels and search channel messages.",
    )
    sub = p.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("find", help="discover public channels by keyword")
    f.add_argument("query")
    f.add_argument("-n", type=int, default=20, help="max results (default 20)")
    g = sub.add_parser("grep", help="search messages within one channel")
    g.add_argument("channel", help="@username or t.me link")
    g.add_argument("query")
    g.add_argument("-n", type=int, default=20, help="max results (default 20)")
    return p.parse_args()


async def run(a):
    try:
        from telethon import TelegramClient
        from telethon.tl.functions.contacts import SearchRequest
    except ImportError:
        sys.exit("pip install telethon")

    try:
        api_id = int(os.environ["TG_API_ID"])
        api_hash = os.environ["TG_API_HASH"]
    except (KeyError, ValueError):
        sys.exit("Set TG_API_ID and TG_API_HASH (get them at https://my.telegram.org)")

    async with TelegramClient("tgsearch", api_id, api_hash) as c:
        if a.cmd == "find":
            r = await c(SearchRequest(q=a.query, limit=a.n))
            for ch in r.chats:
                print(f"@{ch.username or '-':<25} {getattr(ch, 'participants_count', '?') or '?':>9}  {ch.title}")
        else:
            async for m in c.iter_messages(a.channel, search=a.query, limit=a.n):
                text = (m.text or "").replace("\n", " ")[:100]
                print(f"{m.date:%Y-%m-%d}  {text}")


if __name__ == "__main__":
    asyncio.run(run(parse_args()))
