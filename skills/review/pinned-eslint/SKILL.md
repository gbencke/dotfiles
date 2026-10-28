---
name: pinned-eslint
description: Lint any JS/TS repository with a pinned ESLint 9 + plugin set (typescript-eslint, react, unicorn, sonarjs, import-x, functional...) running inside a bubblewrap sandbox with no network. Does not touch the repo's own ESLint setup. Use when asked to "lint this repo", "run eslint", "run pinned eslint", "eslint in bubblewrap", "check code quality with eslint", or invokes /pinned-eslint.
---

# Pinned ESLint (bubblewrap)

`pinned-eslint` in this skill's directory (call it by its absolute path, written `<skill-dir>/pinned-eslint` below) installs a pinned ESLint + plugins into `~/.cache/pinned-eslint/<hash>` and runs it under `bwrap`: network off, filesystem read-only, only the repo writable.

## Run

```bash
<skill-dir>/pinned-eslint <repo>                                   # lint whole repo, default config, unix format
<skill-dir>/pinned-eslint <repo> -- src/                           # lint a subpath (relative to repo)
<skill-dir>/pinned-eslint <repo> --report /tmp/eslint.txt          # also save output to a file
<skill-dir>/pinned-eslint <repo> --config ./eslint.config.mjs -- . # use a different config
<skill-dir>/pinned-eslint <repo> -- --fix src/                     # autofix (WRITES to the repo)
<skill-dir>/pinned-eslint <repo> --print-store                     # install if needed, print the pinned install dir, exit
```

- `<repo>` must be a directory. Use `.` for the cwd.
- Default config: `eslint.config.ts` in this skill's directory. Nothing outside the skill is read. Needs ESLint 9 (default version 9.24.0).
- Anything after `--` goes straight to ESLint. If you omit paths, the default is `.`.
- The first run per version/plugin set runs `npm install` (network, ~1 min). Later runs use the cache.
- Override plugins with `PINNED_ESLINT_PLUGINS='pkg@ver pkg@ver ...'`. This creates a new cache entry.

Run it in the background with a timeout. Large repos are slow:

```bash
nohup <skill-dir>/pinned-eslint "$PWD" --report /tmp/eslint-$(basename "$PWD").txt > /tmp/eslint.log 2>&1 &
timeout 600 tail -f /tmp/eslint.log
```

## Strict size limits (errors)

The default config enforces these on all TS/JS files, with no exceptions for components or tests. Line counts skip blank and comment lines.

| Rule | Max |
|---|---|
| `max-lines` (per file) | 300 |
| `max-lines-per-function` | 50 |
| `max-statements` (per function) | 10 |
| `max-depth` | 3 |
| `max-params` | 3 |
| `max-nested-callbacks` | 3 |
| `complexity` (cyclomatic) | 10 |
| `sonarjs/cognitive-complexity` | 15 |

Report every violation as an error. Do not suggest raising a limit or adding `eslint-disable`; the fix is to split the file or function.

## Output

Unix format: `path:line:col: message [Error/rule-id]`, then a problem count. The exit code is non-zero when errors are found; that is normal, not a script failure.

Summarise by rule, worst first:

```bash
grep -oE '\[(Error|Warning)/[^]]+\]' /tmp/eslint.txt | sort | uniq -c | sort -rn | head -30
```

## Caveats

- Do not run `--fix` unless the user asks. It edits files in place.
- With a repo `node_modules`, the pinned packages are bind-mounted over the repo's copies, read-only. Without one, the script prints a warning. The `unix` formatter may then fail to resolve; if so, retry with `-- --format stylish .`.
- Errors such as `install bubblewrap` or `config not found` are fatal. Report them as-is.
