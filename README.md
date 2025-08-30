# Dotfiles

Dotfiles are specialized configuration files used to personalize and automate the setup of development environments across various operating systems and hosts. This repository contains a comprehensive collection of dotfiles, scripts, and configurations tailored for efficient software development, focusing on tools like Vim/Neovim, Git, shells (Bash/Zsh), and setup automation for platforms such as Arch Linux, Ubuntu, and WSL.

## Repository Structure

The repository is organized into directories based on functionality, tools, and target environments. Below is an overview of the main components, with descriptions and key files.

### Core Components

#### `git/`
Git-related configurations and hooks for consistent development workflows across environments.

- **`gitconfig`**: Basic Git configuration file setting user name, email, and push default.
- **`gitconfig.sh`**: Script to apply Git configuration, including editor and other settings.
- **`hooks/pre-push`**: Pre-push hook (via Husky) to enforce branch protection rules, such as restricting pushes to branches starting with "working/" except on specific remotes.

#### `icons/`
Icon files for desktop environments or applications.

- **`Martz90-Circle-Ubuntu.ico`**: Ubuntu-themed icon.
- **`arch.ico`**: Arch Linux icon.

#### `new.host/`
Scripts and configurations for initializing new hosts, with breakdowns by operating system and platform.

- **`android/termux/bashrc`**: Bash configuration for Android's Termux, including Git operations and aliases for pushing/pulling changes to an Obsidian journal.
- **`arch/`**: Configurations specific to Arch Linux.
  - **`README.md`**: Brief guide to Arch Linux host creation scripts.
  - **`alacritty/alacritty.yml`**: Configuration for Alacritty terminal emulator, including themes (e.g., One Dark, Cyberpunk, Tokyo Night, Dracula), font settings, and hide-mouse-on-typing.
  - **`arch.000.base.minimal.sh`** through **`arch.000.wsl.sh`**: Bootstrapping scripts for installing packages, setting up users, configuring Git/NVM/Pipenv/Pyenv, and initializing i3/VNC/wallpapers. Variants include minimal, no-GUI, base, WSL minimal, and WSL full setups.
  - **`i3/`**: i3 window manager configurations.
    - **`config`**: Main i3 config with bindings, floating mods, and personal shortcuts.
    - **`compton.conf`**: Compositor settings for shadows, opacity, and performance.
    - **`i3blocks.conf`**: Status bar configurations.
    - **`i3status.conf`**: Status command settings for CPU, disk, memory, and time.
    - **`scripts/`**: Utility scripts for moving workspaces, starting applications (e.g., Chromium, PyCharm), and VM tools.
  - **`pacman/pacman.conf`**: Custom Pacman package manager configuration, including mirrors and SigLevel settings.
  - **`termite/config`**: Termite terminal emulator colors and settings.
  - **`vnc/`**: VNC server configurations, including xstartup, service unit, and users.
- **`grub/grub.exec.sh`**: Script to switch GRUB default boot entry between Windows and Arch.
- **`swap/drop_swap.sh`**: Script to safely remove dynamic swap files.
- **`ubuntu/`**: Ubuntu-specific setups.
  - **`README.md`**: Notes on Ubuntu scripts.
  - **`old/bootstrap.sh`** through **`vm_minimal_script_no_gui.sh`**: Older and minimal setup scripts for Ubuntu VMs, including package installation, Node/NPM/Python tools, and VNC/Xfce4 setups.
  - **`start/`**: Startup scripts for applications like Chromium, Firefox, GitExtensions, and NetBeans.
  - **`vnc/`**: VNC xstartup and config for Ubuntu.

#### `npm/`
NPM and Node.js configurations.

- **`frontend.sh`**: Script to install global NPM packages for frontend development (e.g., bower, gulp, webpack, TypeScript, Prettier, ESLint).

#### `nvim/`
Neovim configurations, set up with NvChad and lazy loading.

- **`LICENSE`**: Software license (Unlicense).
- **`init.lua`**: Main Neovim configuration file, loading NvChad plugins, mappings, and theme.
- **`lazy-lock.json`**: Snapshot of plugin versions for reproducibility.
- **`lua/`**: Lua scripts for Neovim.
  - **`chadrc.lua`**: NvChad theme override (One Dark).
  - **`configs/`**: Configurations for plugins (e.g., Conform for formatting, LSP config).
  - **`mappings.lua`**: Custom key mappings (e.g., leader "; ", Neovim tree toggle on F9).
  - **`options.lua`**: Neovim options.
  - **`plugins/init.lua`**: Plugin definitions (e.g., Neo-tree, Telescope, Indent Blankline, LSP).
- This setup includes tree-sitter for syntax highlighting, LSP for code intelligence, and web devicon setup.

#### `prompts/`
Prompts and guidelines for AI-assisted development and code reviews.

- **`guidelines/`**: Development principles.
  - **`bootstrap.prompt.md`**: General development guidelines (incremental progress, learning from code, testing first, etc.).
  - **`good_general_guideline.md`**: Writing guidelines (brevity, clarity, active voice, Zinsser method).
- **`litellm/litellm.config.yaml`**: Configuration for LiteLLM to proxy AI model requests via OpenRouter (e.g., Qwen, Claude, DeepSeek models).
- **`pr.guides/`**: Pull request review templates.
  - **`pr_guidelines_architecture.md`**: Checklist for code reviews focusing on SOLID principles, naming, clarity, anti-patterns, and architectural concerns.
  - **`pyramid_refactoring.md`**: Refactoring checklist organized by pyramid levels (micro-refactorings, design/structure, architecture).
- **`prompts.sh`**: Shell functions for creating PR descriptions and reviewing code using AI models.
- **`summarize.sh`**: Shell functions for summarizing YouTube videos (via yt-dlp + transcripts) and PDFs (via gemini/OpenRouter).

#### `shells/`
Shell RC files for Bash and Zsh.

- **`bashrc`**: Extended Bash configuration with NVM loading, aliases for grepping (e.g., JS/TS/HTML), Vim as nvim, and cd to home.
- **`zshrc`**: Extended Zsh configuration (post-Oh-My-Zsh), including NVM, Java options, aliases, Git functions (e.g., ESLint/Flake8 on changes), and shortcuts (e.g., remove Husky, switch AWS profiles).

#### `vim/`
Vim configurations for different setups.

- **`build_vim.sh`**: Script to build Vim with specific features (e.g., multibyte, Ruby, Python3, GUI).
- **`clean_vim.sh`**: Script to clean Vim config and reinstall plugins.
- **`run_fix.sh`**: Script to run fix tools (e.g., from node_modules).
- **`switch_vimrc.sh`**: Script to switch Vim RC based on language/profile (e.g., JS, Python, C++).
- **`vimrc`**: Basic Vim config with syntax off, plugins, and status line.
- **`vimrc_cpp`**: C++-focused config with ALE for linting, NERDTree, and tagbar.
- **`vimrc_javascript`**: JS-focused config with Deoplete, ESLint, Prettier, and keyboard shortcuts.
- **`vimrc_javascript_windows`**: Windows variant of JS config with GUI settings.
- **`vimrc_python`**: Python config with ALE, NERDTree, and language-specific linters.
- **`vimrc_windows`**: Windows-specific config with GUI tweaks and syntax off.
- **`vsvimrc`**: Configuration for VsVim plugin in Visual Studio.

#### `wallpaper/`
A collection of nature-inspired and Japanese-themed wallpapers (e.g., Zen, Mount Fuji, Cherry Blossoms).

### Usage

1. **Clone the Repository**: `git clone https://github.com/gbencke/dotfiles.git`
2. **Navigate to Desired Config**: Browse directories and symlink/copy files to your home (e.g., `ln -s ~/dotfiles/npm/frontend.sh ~/.local/bin/`).
3. **Run Setup Scripts**: For new hosts, execute scripts like `arch.000.base.sh` with appropriate permissions.
4. **Customize**: Modify configurations (e.g., Neovim themes in `chadrc.lua`) to fit your needs.
5. **Review with AI**: Use functions in `prompts.sh` to generate code reviews (e.g., `review_code_pr stash pr_guidelines_architecture.md`).
