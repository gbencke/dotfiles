#!/usr/bin/env python3
"""One-time OAuth setup: authorizes the app as the user and stores a refresh token.

Prereq: add http://127.0.0.1:8888/callback as a Redirect URI in your app
at https://developer.spotify.com/dashboard

Run: python3 spotify_auth.py   (opens browser; token saved to .spotify_token.json)
"""
import base64
import http.server
import json
import os
import sys
import urllib.parse
import urllib.request
import webbrowser

HERE = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(HERE, ".spotify_token.json")
REDIRECT = "http://127.0.0.1:8888/callback"
SCOPES = "playlist-read-private playlist-read-collaborative"


class Handler(http.server.BaseHTTPRequestHandler):
    code = None

    def do_GET(self):
        q = urllib.parse.urlparse(self.path).query
        Handler.code = urllib.parse.parse_qs(q).get("code", [None])[0]
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Auth OK - you can close this tab.")

    def log_message(self, *a):
        pass


def main():
    cid = os.environ["SPOTIFY_CLIENT_ID"]
    secret = os.environ["SPOTIFY_CLIENT_SECRET"]
    url = "https://accounts.spotify.com/authorize?" + urllib.parse.urlencode({
        "client_id": cid,
        "response_type": "code",
        "redirect_uri": REDIRECT,
        "scope": SCOPES,
    })
    print("Opening browser for Spotify auth...\n" + url)
    webbrowser.open(url)
    srv = http.server.HTTPServer(("127.0.0.1", 8888), Handler)
    while Handler.code is None:
        srv.handle_request()
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=urllib.parse.urlencode({
            "grant_type": "authorization_code",
            "code": Handler.code,
            "redirect_uri": REDIRECT,
        }).encode(),
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + base64.b64encode(f"{cid}:{secret}".encode()).decode(),
        },
    )
    with urllib.request.urlopen(req) as r:
        tok = json.load(r)
    json.dump({"refresh_token": tok["refresh_token"]}, open(TOKEN_FILE, "w"))
    os.chmod(TOKEN_FILE, 0o600)
    print("Refresh token saved to", TOKEN_FILE)


if __name__ == "__main__":
    sys.exit(main())
