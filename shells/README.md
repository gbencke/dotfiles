# Shell Configurations

Comprehensive Bash and Zsh configurations providing consistent development environment across macOS and Linux systems. Includes NVM integration, development utilities, AI tooling, and automated workflows.

## Files

- **bashrc** - Bash configuration with cross-platform compatibility
- **zshrc** - Zsh configuration (post Oh-My-Zsh) optimized for macOS

## Features

### Core Utilities

**Development Workflow**
- `changed_files` - List files changed from master/main branch
- `eslint_changes` - Run ESLint on changed files only
- `flake8_changes` - Run Flake8 on changed Python files
- `list_remotes` - Show git remotes for all repos in current directory
- `run_code` - Launch VSCode with clean NODE_OPTIONS
- `yt_download` - Download YouTube videos using yt-dlp

**Cleanup & Maintenance**
- `remove_husky` - Disable Husky git hooks
- `remove_cdkout` - Delete all CDK output directories
- `remove_node_modules` - Remove all node_modules directories
- `nvim-clean` - Reset Neovim configuration (XDG-compliant)

**System Utilities**
- `search_desktop` - Scan network for RDP-enabled machines
- `diff_obsidian` - Compare current daily note with template

### Environment Configuration

**Development Tools**
- NVM with auto-version switching (22.19.0 for zsh, 18.17.1 for bash)
- pyenv initialization
- Ruby, Docker, OpenJDK 17, Go, .NET, Yarn paths
- KREW kubectl plugin manager
- LM Studio CLI integration

**Platform-Specific**
- **macOS**: Homebrew paths, Android SDK, iTerm2 integration
- **Linux**: Qt theming, LibreOffice paths, OS-aware stat commands
- **Cross-platform**: Haxe, Android SDK, development tools

**Database**
- PostgreSQL configuration with port 5432
- Dump file management for pyScrapper jobs
- Credentials marked as `<<SECRET>>`

### AI & API Configuration

Environment variables for:
- OpenAI API
- OpenRouter API
- Gemini API (commented)
- Aider editor integration
- EXA, Gitea, Context7, Hugging Face tokens
- AI backup directory for PR storage

All API keys marked as `<<SECRET>>` placeholders for security.

### Automated Workflows

**Git Auto-Refresh**
Runs every 10 minutes to sync personal repositories:
- gitjournal
- Desktop
- traggo scripts
- DataGrip projects

Auto-commits, pushes, and pulls from both origin and oracle remotes.

### Aliases Reference

**Git & Development**
- `git_changed_files` - List changed files
- `git_eslint_changes` - ESLint on changed files
- `removeHusky` - Disable Husky hooks
- `removeCdkout` - Clean CDK outputs
- `removeNodeModules` - Remove node_modules

**Utilities**
- `vim` / `gvim` - Launch Neovim
- `runCode` - Launch VSCode
- `yt` - YouTube downloader
- `df` - Duf disk usage with dark theme
- `nvc` - Clean Neovim config
- `midnight_commander` - MC with iTerm profile
- `litellm_proxy` - LiteLLM proxy with config

**Search & Grep**
- `grep_js` - Search JavaScript files
- `grep_jsx` - Search JSX files
- `grep_ts` - Search TypeScript files
- `grep_html` - Search HTML files
- `grep_css` - Search CSS/SCSS files
- `grep_package_json` - Find package.json files

### Bash-Specific Adaptations

The bashrc version includes:
- `declare -A` for associative arrays (vs zsh's `local -A`)
- OS-aware stat command (Linux `-c %Y` vs macOS `-f %m`)
- Bash-compatible read prompts (`read -p` vs zsh's `read -q`)
- Proper variable quoting in git operations

## Installation

**Bash:**
```bash
cat ~/git/000.INFRA/dotfiles/shells/bashrc >> ~/.bashrc
source ~/.bashrc
```

**Zsh:**
```bash
cat ~/git/000.INFRA/dotfiles/shells/zshrc >> ~/.zshrc
source ~/.zshrc
```

## Security Notes

- All API keys and credentials are marked as `<<SECRET>>`
- Replace `<<SECRET>>` placeholders with actual values in local environment
- Never commit actual credentials to version control
- AWS credentials managed via separate config files

## Requirements

**Common:**
- Node.js (NVM managed)
- Git
- pyenv (optional, for Python version management)

**Optional Tools:**
- yt-dlp (for YouTube downloads)
- duf (for enhanced disk usage)
- Docker
- AWS CLI
- Neovim
- VSCode
