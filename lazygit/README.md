# Lazygit Configuration

Lazygit with three diff renderers: difftastic (structural), delta (line-by-line, side-by-side above 160 columns) and raw git.

## Requirements

```bash
sudo pacman -S lazygit difftastic git-delta git-absorb git-branchless
```

## Install

```bash
mkdir -p ~/.config/lazygit
ln -sf ~/dotfiles/lazygit/config.yml ~/.config/lazygit/config.yml
../git/gitconfig.sh   # git defaults: zdiff3, rerere, fetch.prune, push.autoSetupRemote, rebase.autoStash
```

## Keys

- `|` / `\` cycle diff renderers forward / backward
- `{` / `}` decrease / increase diff context
- Commits panel: `Shift+W` on a commit marks it as diff base, then select another commit to compare

One-off structural diff outside lazygit: `git -c diff.external=difft diff <a> <b>`

In Neovim, `<leader>gg` opens lazygit (Snacks).

Source: https://gist.github.com/gbencke/b29869ad54bf380d97af5b8c76cd6f93
