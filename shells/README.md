# Shell Configurations

Bash and Zsh configurations with NVM, aliases, and development shortcuts.

## Files

- **bashrc** - Bash configuration with NVM loading and grep aliases
- **zshrc** - Zsh configuration (post Oh-My-Zsh) with Git functions and shortcuts

## Features

### Bash (bashrc)
- NVM auto-loading
- Grep aliases (JS, TS, HTML patterns)
- Vim aliased to nvim
- Auto-cd to home

### Zsh (zshrc)
- NVM integration
- Java options
- Git workflow functions (ESLint/Flake8 on changes)
- Shortcuts:
  - Remove Husky
  - Switch AWS profiles
  - Development aliases

## Installation

Bash:
```bash
cat ~/dotfiles/shells/bashrc >> ~/.bashrc
source ~/.bashrc
```

Zsh:
```bash
cat ~/dotfiles/shells/zshrc >> ~/.zshrc
source ~/.zshrc
```
