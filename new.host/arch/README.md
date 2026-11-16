# Arch Linux Host Creation Scripts

## AWS-Based

### Base Images

From:[UpLink Base Images](https://www.uplinklabs.net/projects/arch-linux-on-ec2/)

## Contents

- `arch.000.base*.sh`, `arch.000.wsl*.sh` - Base setup variants (full, minimal, no GUI, WSL)
- `arch.001.chromium.sh`, `arch.002.vim.sh` - Optional follow-up steps
- `alacritty/`, `i3/`, `pacman/`, `termite/`, `vnc/` - Configs the base scripts install

## Git Diff Tools

All five base variants install `git-delta`, `difftastic`, and `lazygit`. They configure Delta as Git's pager and Difftastic as the explicit diff tool for both root and the development user:

- `git diff` / `git show`: open Delta's interactive pager, including short diffs.
- `git difftool`: compare syntax with Difftastic, without prompts.

In Delta, use arrows or `j`/`k` to scroll, `n`/`N` to jump between files, `/` to search, and `q` to quit. Use `git --no-pager diff` for plain patch output.

The scripts also copy the [Lazygit config](../../lazygit/README.md) to `~/.config/lazygit/config.yml` for both users. Run `lazygit` for the full Git TUI, with Delta as the default renderer. Press `|` to switch to Difftastic. Delta's own pager stays off inside Lazygit.

The setup removes `diff.external` so it cannot override normal patch output. To update an existing Arch host without running the full setup:

```bash
sudo pacman -S --needed git-delta difftastic lazygit
bash ../../git/gitconfig.sh
mkdir -p ~/.config/lazygit
cp -i ../../lazygit/config.yml ~/.config/lazygit/config.yml
```

Run these commands from this directory as your normal user. The Git script also applies the shared identity and workflow defaults.

See [`../README.md`](../README.md) for details and usage.
