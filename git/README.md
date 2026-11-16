# Git Configuration

Git settings and hooks for consistent workflows across environments.

## Files

- **gitconfig** - Git defaults, including Delta and Difftastic
- **gitconfig.sh** - Apply Git settings and remove the external diff override
- **hooks/pre-push** - Enforces branch protection rules via Husky

## Usage

Install `git-delta` and `difftastic` on Arch (`sudo pacman -S --needed git-delta difftastic`), or `git-delta` and `difftastic` with Homebrew on macOS.

Apply configuration:
```bash
./gitconfig.sh
```

`git diff` and `git show` open Delta's interactive pager, even for short diffs. Use arrows or `j`/`k` to scroll, `n`/`N` to jump between files, `/` to search, and `q` to quit. Run `git --no-pager diff` for plain patch output.

Run `git difftool` for a structural comparison with Difftastic, without prompts. The script removes `diff.external` so normal diffs remain patches that Delta can display.

Hooks enforce branch naming (e.g., restricts pushes to "working/*" branches on specific remotes).
