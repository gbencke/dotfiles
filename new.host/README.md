# New Host Setup Scripts

Automated bootstrapping scripts for initializing new development environments.

## Platforms

### arch/
Arch Linux setup scripts with multiple variants:
- **arch.000.base.minimal.sh** - Minimal package installation
- **arch.000.base.no.gui.sh** - Base without GUI
- **arch.000.base.sh** - Full base setup
- **arch.000.wsl.minimal.sh** - WSL minimal setup
- **arch.000.wsl.sh** - Full WSL setup
- **arch.001.chromium.sh** - Install Chromium
- **arch.002.vim.sh** - Apply the Python Vim profile (`vim/switch_vimrc.sh python`)

Includes:
- Package installation (pacman)
- User configuration
- Git/NVM/Pipenv/Pyenv setup
- i3 window manager config
- VNC server setup
- Alacritty terminal config with themes (`alacritty/`), i3 (`i3/`), pacman (`pacman/`), Termite (`termite/`), and VNC (`vnc/`) configs

### ubuntu/
Ubuntu setup scripts:
- **vm_minimal_script.sh** / **vm_minimal_script_no_gui.sh** - Terminal-only Ubuntu 18.04 VM setup for AWS
- **old/** - Legacy bootstraps (`bootstrap.sh`, `bootstrap.vm.lubuntu.sh`, `debian.init.sh`)
- **vnc/** - VNC/Xfce4 configuration (`config`, `xstartup`)
- **start/** - Startup scripts for Chromium, Firefox, Git Extensions, and NetBeans

### android/
- **termux/bashrc** - Termux Bash config with Git operations for Obsidian journal

### Other

- **grub/** - GRUB boot entry switcher (Windows/Arch): `grub.exec.sh`
- **swap/** - Swap file management: `create_swap.sh`, `drop_swap.sh`
- **tmux/** - Tmux configuration: `.tmux.conf`
- **wallpaper/** - Nature and Japanese-themed wallpapers
- **xterm/** - Xterm configuration: `Xresources`
- **utils/** - Utility scripts: `create_summaries.sh`

## Usage

Run setup script with appropriate permissions:
```bash
chmod +x arch/arch.000.base.sh
sudo ./arch/arch.000.base.sh
```

For WSL:
```bash
chmod +x arch/arch.000.wsl.sh
./arch/arch.000.wsl.sh
```

Review script contents before execution to understand changes.
