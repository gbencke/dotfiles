---
name: pinned-eslint
description: Lint any JS/TS repository with a pinned ESLint 9 + plugin set (typescript-eslint, react, unicorn, sonarjs, import-x, functional...) running inside a bubblewrap sandbox with no network. Does not touch the repo's own ESLint setup. Use when asked to "lint this repo", "run eslint", "run pinned eslint", "eslint in bubblewrap", "check code quality with eslint", or invokes /pinned-eslint.
---

# Pinned ESLint (bubblewrap)

`~/.pi/agent/skills/pinned-eslint/pinned-eslint` (bundled with this skill; always call it by that absolute path) installs a pinned ESLint + plugins into `~/.cache/pinned-eslint/<hash>` and runs it under `bwrap`: network off, filesystem read-only, only the repo writable.

## Run

```bash
~/.pi/agent/skills/pinned-eslint/pinned-eslint <repo>                                   # lint whole repo, default config, unix format
~/.pi/agent/skills/pinned-eslint/pinned-eslint <repo> -- src/                           # lint a subpath (relative to repo)
~/.pi/agent/skills/pinned-eslint/pinned-eslint <repo> --report /tmp/eslint.txt          # also save output to a file
~/.pi/agent/skills/pinned-eslint/pinned-eslint <repo> --config ./eslint.config.mjs -- . # use a different config
~/.pi/agent/skills/pinned-eslint/pinned-eslint <repo> -- --fix src/                     # autofix (WRITES to the repo)
```

- `<repo>` must be a directory. Use `.` for the cwd.
- Default config: `~/.local/share/pinned-eslint/eslint.config.ts`. Needs ESLint 9 (default version 9.24.0).
- Anything after `--` goes straight to ESLint. If you omit paths, the default is `.`.
- The first run per version/plugin set runs `npm install` (network, ~1 min). Later runs use the cache.
- Override plugins with `PINNED_ESLINT_PLUGINS='pkg@ver pkg@ver ...'`. This creates a new cache entry.

Run it in the background with a timeout. Large repos are slow:

```bash
nohup ~/.pi/agent/skills/pinned-eslint/pinned-eslint "$PWD" --report /tmp/eslint-$(basename "$PWD").txt > /tmp/eslint.log 2>&1 &
timeout 600 tail -f /tmp/eslint.log
```

## Output

Unix format: `path:line:col: message [Error/rule-id]`, then a problem count. The exit code is non-zero when errors are found; that is normal, not a script failure.

Summarise by rule, worst first:

```bash
grep -oE '\[(Error|Warning)/[^]]+\]' /tmp/eslint.txt | sort | uniq -c | sort -rn | head -30
```

## Caveats

- Do not run `--fix` unless the user asks. It edits files in place.
- With a repo `node_modules`, the pinned packages are bind-mounted over the repo's copies, read-only. Without one, the script prints a warning. The `unix` formatter may then fail to resolve; if so, retry with `-- --format stylish .`.
- Output passes through `sed s~/data~$PWD~g`, a leftover from Docker. Paths that contain `/data` can show up mangled.
- Errors such as `install bubblewrap` or `config not found` are fatal. Report them as-is.
