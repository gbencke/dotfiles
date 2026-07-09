# yt-dlp

Download audio and video from YouTube and 1000+ other platforms using `yt-dlp`.

## Files

- `SKILL.md` — usage guide and common options.
- `bin/yt-dlp` — the `yt-dlp` binary.
- `tests/test.sh` — smoke tests.

## Common options

- `-x` / `--extract-audio` — extract audio.
- `--audio-format <format>` — mp3, aac, wav, best.
- `-f <format>` — select format.
- `-F` — list available formats.
- `--embed-metadata` — embed video metadata.
- `--embed-thumbnail` — embed thumbnail.
- `--recode-video <format>` — re-encode video.
- `-o <template>` — custom output template.
- `-a <file>` — download URLs from file.
- `--download-archive <file>` — skip already downloaded videos.
- `--cookies <file>` — use cookies from file.
- `--cookies-from-browser <browser>` — extract cookies from browser.

## Configuration

`yt-dlp` reads configuration from `$HOME/.config/yt-dlp/config` (Linux/Mac) or `%APPDATA%\yt-dlp\config` (Windows). See `SKILL.md` for an example config.
