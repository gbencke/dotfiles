#!/usr/bin/env bash
# install.sh — make Claude Code use the same skills, tools and rules as pi.
#
# pi is the source of truth. This script only links and registers; it never
# copies pi content, so an edit in ~/.pi/agent shows up in Claude at once.
# Safe to re-run: existing links and MCP servers are left alone.
set -euo pipefail

DOTFILES_CLAUDE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_AGENT="$HOME/.pi/agent"
SKILLS="$HOME/.claude/skills"

# Link a path unless the target already exists.
link() {
  if [[ -e "$2" || -L "$2" ]]; then
    echo "keep  $2"
  else
    ln -s "$1" "$2" && echo "link  $2 -> $1"
  fi
}

mkdir -p "$SKILLS" "$HOME/.local/bin"

# Global instructions: CLAUDE.md imports pi's SYSTEM.md.
link "$DOTFILES_CLAUDE/CLAUDE.md" "$HOME/.claude/CLAUDE.md"

# pi's global skills, one link per skill.
for dir in "$PI_AGENT"/skills/*/; do
  link "${dir%/}" "$SKILLS/$(basename "$dir")"
done

# pi packages that ship a skill.
link "$PI_AGENT/packages/pi-archify/skills/archify" "$SKILLS/archify"

# Claude-only ports of pi extensions (adversarial-review, goal-loop).
for dir in "$DOTFILES_CLAUDE"/skills/*/; do
  link "${dir%/}" "$SKILLS/$(basename "$dir")"
done
link "$DOTFILES_CLAUDE/bin/claude-goal" "$HOME/.local/bin/claude-goal"

# MCP servers that replace pi's tool extensions. API keys come from the
# environment (TAVILY_API_KEY, CONTEXT7_API_KEY), never from this config.
add_mcp() {
  local name="$1"; shift
  if claude mcp get "$name" >/dev/null 2>&1; then
    echo "keep  mcp $name"
  else
    claude mcp add -s user "$name" -- "$@"
  fi
}
add_mcp codegraph codegraph serve --mcp
add_mcp context7 npx -y @upstash/context7-mcp
add_mcp tavily npx -y tavily-mcp

echo "Done. Restart Claude Code to load the skills."
