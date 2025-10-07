# Dotfiles

Personal configuration files for development environments across macOS and Linux. Focus on Neovim, Git, shells (Bash/Zsh), and automated setup scripts.

## Quick Start

1. Clone: `git clone https://github.com/gbencke/dotfiles.git`
2. Symlink configs: `ln -s ~/dotfiles/nvim ~/.config/nvim`
3. Run setup scripts for new hosts: `new.host/arch/arch.000.base.sh`

## Structure

Each directory contains tool-specific configurations with detailed READMEs.

### Directories

- **[git/](git/README.md)** - Git configuration and hooks
- **[mc/](mc/README.md)** - Midnight Commander configuration
- **[nvim/](nvim/README.md)** - Neovim setup with NvChad
- **[vim/](vim/README.md)** - Vim configurations for multiple languages
- **[shells/](shells/README.md)** - Bash and Zsh configurations
- **[prompts/](prompts/README.md)** - AI-assisted development guidelines and tools
- **[new.host/](new.host/README.md)** - New host setup scripts for Arch/Ubuntu/WSL
- **npm/** - NPM package installation scripts
- **icons/** - Desktop icons for Arch and Ubuntu
- **wallpaper/** - Nature and Japanese-themed wallpapers

## Platform Support

Maintains compatibility across:
- macOS
- Linux (Arch, Ubuntu)
- WSL (Windows Subsystem for Linux)

Test changes before committing. Keep sensitive data in separate, gitignored files.
