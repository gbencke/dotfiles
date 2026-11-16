# Lazygit Configuration

Lazygit opens with Delta for line-by-line diffs, or side-by-side diffs above 160 columns. Switch to Difftastic for structural diffs or raw Git as a fallback.

Lazygit handles scrolling and navigation. Delta uses `--paging=never` here so it does not open a second pager, even when global Git settings enable always-on paging.

## Requirements

```bash
sudo pacman -S lazygit difftastic git-delta git-absorb git-branchless
```

## Install

```bash
config_dir="$(lazygit --print-config-dir)"
mkdir -p "$config_dir"
cp -i ~/git/000.INFRA/dotfiles/lazygit/config.yml "$config_dir/config.yml"
../git/gitconfig.sh   # git defaults: zdiff3, rerere, fetch.prune, push.autoSetupRemote, rebase.autoStash
```

Restart Lazygit after updating its config. The config directory command works on both Arch and macOS. All five Arch base setup scripts install Lazygit and copy this config for root and the development user.

## Keys

- `|` / `\` cycle diff renderers forward / backward: Delta, Difftastic, raw Git
- `{` / `}` decrease / increase diff context
- Commits panel: `Shift+W` on a commit marks it as diff base, then select another commit to compare

Structural diff outside Lazygit: `git difftool <a> <b>` after applying the shared Git settings.

In Neovim, `<leader>gg` opens lazygit (Snacks).

Source: https://gist.github.com/gbencke/b29869ad54bf380d97af5b8c76cd6f93
