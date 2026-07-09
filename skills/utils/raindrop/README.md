# Raindrop.io

Manage bookmarks, collections, tags, and highlights in Raindrop.io using the REST API.

## Requirements

- `RAINDROP_TOKEN` set in the environment.

## API basics

- Base URL: `https://api.raindrop.io/rest/v1`
- Authentication: `Authorization: Bearer $RAINDROP_TOKEN`
- Rate limit: 120 requests per minute per authenticated user.

## Supported operations

The skill covers collections, raindrops (bookmarks), tags, and highlights. See `SKILL.md` for full curl examples and request/response shapes.

## Files

- `SKILL.md` — the full API reference and usage guide.
