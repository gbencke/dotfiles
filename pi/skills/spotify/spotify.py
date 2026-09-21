#!/usr/bin/env python3
"""Minimal Spotify Web API client (client-credentials flow).

Usage:
  spotify.py get <path> [query-params...]   e.g. spotify.py get /v1/search q=radiohead type=artist limit=3
  spotify.py search <query> [type] [limit]  shortcut: type=track,artist,album default limit 5
  spotify.py post <path> <json-body>

Uses SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET from env. Prints JSON to stdout.
"""
import base64
import json
import os
import sys
import urllib.parse
import urllib.request

API = "https://api.spotify.com"
HERE = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(HERE, ".spotify_token.json")


def token():
    cid = os.environ.get("SPOTIFY_CLIENT_ID")
    secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
    if not cid or not secret:
        sys.exit("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set in env")
    basic = "Basic " + base64.b64encode(f"{cid}:{secret}".encode()).decode()
    headers = {"Content-Type": "application/x-www-form-urlencoded",
               "Authorization": basic}
    # Prefer user token if spotify_auth.py has been run (enables /v1/me/*)
    if os.path.exists(TOKEN_FILE):
        rt = json.load(open(TOKEN_FILE))["refresh_token"]
        data = urllib.parse.urlencode({"grant_type": "refresh_token",
                                       "refresh_token": rt}).encode()
    else:
        data = b"grant_type=client_credentials"
    req = urllib.request.Request("https://accounts.spotify.com/api/token",
                                 data=data, headers=headers)
    with urllib.request.urlopen(req) as r:
        return json.load(r)["access_token"]


def call(method, path, params=None, body=None):
    if not path.startswith("/"):
        path = "/" + path
    url = API + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {token()}",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    cmd = sys.argv[1]
    if cmd == "search":
        q = sys.argv[2]
        types = sys.argv[3] if len(sys.argv) > 3 else "track,artist,album"
        limit = sys.argv[4] if len(sys.argv) > 4 else "5"
        out = call("GET", "/v1/search", {"q": q, "type": types, "limit": limit})
    elif cmd == "get":
        params = dict(p.split("=", 1) for p in sys.argv[3:])
        out = call("GET", sys.argv[2], params)
    elif cmd == "post":
        out = call("POST", sys.argv[2], body=json.loads(sys.argv[3]))
    else:
        sys.exit(__doc__)
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
