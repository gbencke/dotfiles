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

Includes:
- Package installation (pacman)
- User configuration
- Git/NVM/Pipenv/Pyenv setup
- i3 window manager config
- VNC server setup
- Alacritty terminal config with themes

### ubuntu/
Ubuntu setup scripts:
- **old/bootstrap.sh** - Legacy bootstrap
- **vm_minimal_script_no_gui.sh** - Minimal VM without GUI
- VNC/Xfce4 configurations
- Startup scripts for applications

### android/
- **termux/bashrc** - Termux Bash config with Git operations for Obsidian journal

### Other

- **grub/** - GRUB boot entry switcher (Windows/Arch)
- **swap/** - Dynamic swap file management
- **tmux/** - Tmux configurations
- **wallpaper/** - Nature and Japanese-themed wallpapers
- **xterm/** - Xterm configurations
- **utils/** - Utility scripts

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
