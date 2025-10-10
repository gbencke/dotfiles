# Gemini Workspace Context

## Directory Overview

This directory, "dotfiles," is a personal collection of configuration files and setup scripts for a development environment. It is designed to be portable across macOS and various Linux distributions (Arch, Ubuntu, WSL). The focus is on standardizing configurations for tools like Neovim, Git, Bash, and Zsh, and automating the setup of new machines.

## Key Files and Directories

*   **`README.md`**: The main entry point for understanding the repository structure and purpose. It provides a high-level overview of each directory.

*   **`new.host/`**: Contains shell scripts for bootstrapping new development environments. It has specific scripts for different operating systems and environments, such as:
    *   `arch/`: Scripts for setting up Arch Linux.
    *   `ubuntu/`: Scripts for setting up Ubuntu.
    *   `android/`: Configuration for Termux on Android.
    *   `wsl/`: Scripts for setting up Windows Subsystem for Linux.

*   **`nvim/`**: A complete Neovim configuration based on NvChad. It includes custom keymappings, LSP (Language Server Protocol) configurations, and a list of plugins managed by `lazy.nvim`.
    *   `init.lua`: The main entry point for the Neovim configuration.
    *   `lua/mappings.lua`: Custom keybindings.
    *   `lua/plugins/init.lua`: Plugin definitions.

*   **`vim/`**: Contains various `.vimrc` files tailored for different programming languages like C++, JavaScript, and Python. This suggests a modular approach to Vim configuration.

*   **`shells/`**: Holds the configuration files for `bash` and `zsh`, likely containing aliases, functions, and prompt customizations.
    *   `bashrc`: Configuration for the Bash shell.
    *   `zshrc`: Configuration for the Zsh shell.

*   **`git/`**: Contains Git-related configurations.
    *   `gitconfig`: Basic Git user settings.
    *   `gitconfig.sh`: A script to apply the Git settings.
    *   `hooks/`: Git hooks, such as a `pre-push` hook.

*   **`prompts/`**: A directory with guidelines and prompts for AI-assisted development, indicating an interest in leveraging large language models for coding tasks.

## Usage

The primary use of this repository is to quickly and consistently set up a familiar development environment on a new machine. The general workflow is:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/gbencke/dotfiles.git
    ```

2.  **Run setup scripts:** Navigate to the `new.host` directory and execute the appropriate script for the target operating system. For example, on Arch Linux:
    ```bash
    cd new.host/arch
    chmod +x arch.000.base.sh
    ./arch.000.base.sh
    ```

3.  **Symlink configuration files:** For tools like Neovim, create symbolic links from the home directory to the configuration files in this repository. For example:
    ```bash
    ln -s ~/dotfiles/nvim ~/.config/nvim
    ```
