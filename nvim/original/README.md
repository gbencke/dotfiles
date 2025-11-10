# Neovim Configuration

Neovim setup with NvChad, LSP, and tree-sitter.

## Features

- NvChad base configuration with One Dark theme
- LSP for code intelligence
- Tree-sitter for syntax highlighting
- Neo-tree file explorer (F9)
- Telescope fuzzy finder
- Lazy.nvim plugin management

## Structure

- **init.lua** - Main configuration entry point
- **lazy-lock.json** - Locked plugin versions
- **lua/** - Lua configuration modules
  - **chadrc.lua** - NvChad theme settings
  - **configs/** - Plugin configurations (Conform, LSP)
  - **mappings.lua** - Custom keybindings (leader: ";")
  - **plugins/init.lua** - Plugin definitions

## Installation

1. Backup existing config: `mv ~/.config/nvim ~/.config/nvim.backup`
2. Symlink: `ln -s ~/dotfiles/nvim ~/.config/nvim`
3. Launch Neovim: plugins install automatically

## Key Mappings

- Leader: `;`
- Toggle file tree: `F9`
- Additional mappings in `lua/mappings.lua`
