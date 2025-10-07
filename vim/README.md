# Vim Configuration

Language-specific Vim configurations with automated switching.

## Configurations

- **vimrc** - Basic configuration with syntax off
- **vimrc_cpp** - C++ with ALE, NERDTree, tagbar
- **vimrc_javascript** - JavaScript with Deoplete, ESLint, Prettier
- **vimrc_javascript_windows** - Windows variant with GUI settings
- **vimrc_python** - Python with ALE and linters
- **vimrc_windows** - Windows-specific with GUI tweaks
- **vsvimrc** - Visual Studio VsVim plugin config

## Scripts

- **switch_vimrc.sh** - Switch between language profiles (JS, Python, C++)
- **build_vim.sh** - Build Vim with specific features
- **clean_vim.sh** - Clean config and reinstall plugins
- **run_fix.sh** - Run fix tools from node_modules

## Usage

Switch to JavaScript profile:
```bash
./switch_vimrc.sh js
```

Switch to Python profile:
```bash
./switch_vimrc.sh python
```

Switch to C++ profile:
```bash
./switch_vimrc.sh cpp
```
