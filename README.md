# Dotfiles

Personal configuration files for development environments across macOS and Linux. Focus on Neovim, Git, shells (Bash/Zsh), AI coding agents (Pi, Claude Code), and automated setup scripts.

## Quick Start

1. Clone: `git clone https://github.com/gbencke/dotfiles.git`
2. Link configs: `ln -s ~/dotfiles/nvim/current ~/.config/nvim`
3. Run setup scripts for new hosts: `new.host/arch/arch.000.base.sh`

## Structure

Each directory contains tool-specific configurations with detailed READMEs.

### Directories

- **[git/](git/README.md)** - Git configuration and hooks
- **[lazygit/](lazygit/README.md)** - Lazygit with difftastic and delta diff renderers
- **[mc/](mc/README.md)** - Midnight Commander configuration
- **[nvim/](nvim/current/README.md)** - Neovim IDE setup on lazy.nvim (replaces WebStorm and PyCharm); config in `nvim/current/`
- **[vim/](vim/README.md)** - Vim configurations for multiple languages
- **[shells/](shells/README.md)** - Bash and Zsh configurations
- **[prompts/](prompts/README.md)** - AI-assisted development guidelines, review prompts, and tools
- **[new.host/](new.host/README.md)** - New host setup scripts for Arch/Ubuntu/WSL, plus tmux, xterm, GRUB, swap, and wallpapers
- **[pi/](pi/README.md)** - Configuration, skills, and extensions for the Pi AI Coding Agent
- **[skills/](skills/README.md)** - Agent skills grouped by domain: Obsidian, review, utils, writing, programming languages
- **[claude/](claude/README.md)** - Claude Code setup that mirrors pi: CLAUDE.md, skill links, MCP servers
- **eslint/** - Early standalone pinned-ESLint runner (superseded by `skills/review/pinned-eslint`)
- **npm/** - NPM package installation scripts
- **icons/** - Desktop icons for Arch and Ubuntu

Other files: `GEMINI.md` (workspace context for Gemini CLI) and `LICENSE` (MIT).

## Platform Support

Maintains compatibility across:
- macOS
- Linux (Arch, Ubuntu)
- WSL (Windows Subsystem for Linux)

Test changes before committing. Keep sensitive data in separate, gitignored files.
