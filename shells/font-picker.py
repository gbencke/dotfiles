#!/usr/bin/env python3
"""Pick a monospaced Nerd Font with live preview in the current Alacritty window.

Keys: Up/Down choose font, Left/Right change size, Enter print "Family size"
and keep it, q/Esc restore the original font and quit.
"""
import curses
import os
import subprocess
import sys
import tomllib
from pathlib import Path

ALACRITTY_CONFIG = Path.home() / ".config/alacritty/alacritty.toml"
DEFAULT_SIZE = 11.25  # Alacritty's built-in default
FONT_STYLES = ("normal", "bold", "italic", "bold_italic")
SAMPLE = [
    "The quick brown fox jumps over the lazy dog 0123456789",
    "il1| O0o {}[]() => != == <= >= -> :: ;; ``",
    "Nerd glyphs: \ue0b0 \uf015 \uf113 \ue7c5 \uf303 \uf07c \ue606 \uf418",
]


def list_fonts():
    # Monospaced, has Latin "A" (drops symbols-only fonts) and Nerd glyphs:
    # e0b0 = powerline arrow, f015 = Font Awesome home.
    out = subprocess.run(
        ["fc-list", ":spacing=mono:charset=41 e0b0 f015", "-f", "%{family[0]}\n"],
        capture_output=True, text=True, check=True,
    ).stdout
    return sorted({line.strip() for line in out.splitlines() if line.strip()})


def initial_size():
    try:
        return float(tomllib.loads(ALACRITTY_CONFIG.read_text())["font"]["size"])
    except (OSError, KeyError, ValueError, tomllib.TOMLDecodeError):
        return DEFAULT_SIZE


def alacritty_msg(*args):
    """Run `alacritty msg config ...`; return an error string or None."""
    res = subprocess.run(["alacritty", "msg", "config", *args], capture_output=True, text=True)
    if res.returncode == 0:
        return None
    return res.stderr.strip() or f"alacritty msg failed ({res.returncode})"


def apply_font(family, size):
    opts = [f'font.{style}.family="{family}"' for style in FONT_STYLES]
    return alacritty_msg(*opts, f"font.size={size}")


def run(stdscr, fonts, size):
    curses.curs_set(0)
    live = "ALACRITTY_WINDOW_ID" in os.environ
    idx, top = 0, 0
    status = "" if live else "Not running in Alacritty: no live preview"
    dirty = True
    while True:
        if dirty and live:
            status = apply_font(fonts[idx], size) or ""
        dirty = False

        h, w = stdscr.getmaxyx()
        stdscr.erase()
        header = f"Font size: {size:g}   ↑/↓ font  ←/→ size  Enter select  q quit"
        stdscr.addnstr(0, 0, header, w - 1, curses.A_BOLD)
        for i, line in enumerate(SAMPLE):
            stdscr.addnstr(2 + i, 2, line, w - 3)
        list_y = 3 + len(SAMPLE)
        rows = max(1, h - list_y - 1)
        top = min(max(top, idx - rows + 1), idx)
        for row, font in enumerate(fonts[top:top + rows]):
            attr = curses.A_REVERSE if top + row == idx else curses.A_NORMAL
            stdscr.addnstr(list_y + row, 2, font, w - 3, attr)
        if status:
            stdscr.addnstr(h - 1, 0, status, w - 1, curses.A_DIM)
        stdscr.refresh()

        key = stdscr.getch()
        if key in (curses.KEY_UP, ord("k")) and idx > 0:
            idx, dirty = idx - 1, True
        elif key in (curses.KEY_DOWN, ord("j")) and idx < len(fonts) - 1:
            idx, dirty = idx + 1, True
        elif key == curses.KEY_RIGHT:
            size, dirty = size + 1, True
        elif key == curses.KEY_LEFT and size > 4:
            size, dirty = size - 1, True
        elif key in (curses.KEY_ENTER, 10, 13):
            return fonts[idx], size
        elif key in (27, ord("q")):
            if live:
                alacritty_msg("--reset")
            return None


def ensure_socket_access():
    """Re-run under sudo when Alacritty belongs to another user (e.g. a root VNC desktop)."""
    sock = os.environ.get("ALACRITTY_SOCKET")
    if not sock or os.geteuid() == 0 or os.access(sock, os.W_OK):
        return
    keep = "ALACRITTY_SOCKET,ALACRITTY_WINDOW_ID,TERM"
    os.execvp("sudo", ["sudo", f"--preserve-env={keep}", sys.executable, os.path.abspath(__file__), *sys.argv[1:]])


def main():
    ensure_socket_access()
    fonts = list_fonts()
    if not fonts:
        raise SystemExit("No monospaced Nerd Fonts found (fc-list). Install one, e.g. ttf-jetbrains-mono-nerd.")
    os.environ.setdefault("ESCDELAY", "25")  # make Esc respond instantly
    # Draw the UI on the terminal so stdout carries only the result (works in $(...)).
    saved_stdout = os.dup(1)
    with open("/dev/tty", "w") as tty:
        os.dup2(tty.fileno(), 1)
    try:
        choice = curses.wrapper(run, fonts, initial_size())
    finally:
        os.dup2(saved_stdout, 1)
    if choice:
        print(f"{choice[0]} {choice[1]:g}")


if __name__ == "__main__":
    main()
