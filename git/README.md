# Git Configuration

Git settings and hooks for consistent workflows across environments.

## Files

- **gitconfig** - Basic Git configuration (user, email, push defaults)
- **gitconfig.sh** - Script to apply Git settings including editor
- **hooks/pre-push** - Enforces branch protection rules via Husky

## Usage

Apply configuration:
```bash
./gitconfig.sh
```

Hooks enforce branch naming (e.g., restricts pushes to "working/*" branches on specific remotes).
