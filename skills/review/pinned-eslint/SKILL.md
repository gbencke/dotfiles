---
name: pinned-eslint
description: Lint any JS/TS repository with a pinned ESLint 9 + plugin set (typescript-eslint, react, unicorn, sonarjs, import-x, functional...) running inside a bubblewrap sandbox with no network. Does not touch the repo's own ESLint setup. Use when asked to "lint this repo", "run eslint", "run pinned eslint", "eslint in bubblewrap", "check code quality with eslint", or invokes /pinned-eslint.
---

# Pinned ESLint (bubblewrap)

`pinned-eslint` in this skill's directory (call it by its absolute path, written `<skill-dir>/pinned-eslint` below) installs a pinned ESLint + plugins into `~/.cache/pinned-eslint/<hash>` and runs it under `bwrap`: network off, filesystem read-only, only the repo writable.

## macOS: Linux VM with shared folders

On macOS, the runner sends analysis to a Lima VM named `pinned-skills`. The repo stays on the Mac disk: Linux reads the shared folder at the **same absolute path**. There is no clone or sync. Bubblewrap still isolates the analysis and blocks its network access. Linux runs directly as before.

Set up once (Lima 2+ on Apple Silicon):

```bash
brew install lima
mkdir -p ~/.cache/pinned-eslint
limactl start --tty=false --name=pinned-skills --timeout=15m \
  --mount-only "$(cd ~/git && pwd -P):w" \
  --mount-only "$HOME/.pi/agent/skills" \
  --mount-only "$HOME/.cache/pinned-eslint" \
  --mount-only '/private/tmp:w' \
  ~/.pi/agent/skills/pinned-eslint/lima.yaml
```

Run this long setup in the background with a timeout and tail its log. `lima.yaml` installs the Linux prerequisites. The VM uses 2 CPUs, 4 GiB RAM, and a sparse 20 GiB disk. Both pinned skills use this VM.

- `pwd -P` resolves `~/git` symlinks, including repos on external disks. Mount other repo roots explicitly if needed. Script, repo, custom config, and report paths must be shared at the same paths in Linux.
- Only the listed folders are shared; the Mac home is not mounted wholesale. The repo root and `/private/tmp` are writable. Writes, including `--fix`, change Mac files immediately.
- Use the normal commands below from macOS; the runner starts the existing VM if needed. Absolute paths, paths with spaces, `--config`, `--report`, and ESLint arguments are forwarded.
- Reports under Mac `/tmp` are normalized to `/private/tmp`, so they remain visible on the Mac. Tool caches for analysis stay in the Linux home.
- `--print-store` stays native on macOS for Neovim's local ESLint LSP. It needs native Node.js/npm and `sha256sum` (`brew install node coreutils` if absent). It installs a separate Mac cache, not a Linux cache. Share that cache read-only so Neovim's custom configs remain accessible to VM scans.
- `PINNED_ESLINT_PLUGINS` and `ESLINT_USE_FLAT_CONFIG` overrides are forwarded; credentials and other host environment variables are not.
- Stop the VM with `limactl stop pinned-skills` to release RAM. If setup or bubblewrap fails, report the error; never bypass the sandbox.

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
| `max-len` (columns per line, no exceptions) | 80 |

Report every violation as an error. Do not suggest raising a limit or adding `eslint-disable`; the fix is to split the file or function.

## Banned utility types (errors)

`@typescript-eslint/no-restricted-types` bans `Omit`, `Pick` and `Partial`. Fix by writing an explicit, purpose-specific type (e.g. `type UserUpdate = { name?: string }` instead of `Partial<User>`). The rule bans the types outright; it does not measure "too much" use.

## Write code that passes

Follow these when writing TS/JS, so the first draft is lint-clean:

- **Size:** lines ≤ 80 columns, functions ≤ 50 lines and ≤ 10 statements, ≤ 3 params (pass an object), nesting ≤ 3, cyclomatic complexity ≤ 10, cognitive ≤ 15, files ≤ 300 lines. Split early.
- **Immutability:** `const` only, no `let`. No mutation (`push`, `obj.x =`, `delete`); build new values with spread, `map`, `filter`, `reduce`. Use `readonly` (keyword, not `Readonly<T>`) on properties, arrays and params.
- **Types:** no `Omit`, `Pick`, `Partial`; write explicit types. Interfaces use property signatures (`readonly find: (id: string) => User`), not methods. Explicit return types on exported functions. `import { type X }` inline for type-only imports. No `any`, no non-null `!`.
- **Logic:** `??` not `||` for defaults, `?.` not `&&` chains. No always-true/false conditions. `async` only if it awaits; `return await` inside `try`. Handle every promise (`await`, `.catch`, or return it).
- **Modules:** named exports only (default exports allowed in `*.config.*`). No import cycles. `node:` prefix for built-ins (`node:fs`). ESM only, no `require`.
- **Style:** `for...of`, not indexed `for`. `includes`/`some`/`flatMap`/`slice` over older forms. `throw new Error('message')`. No negated `if/else`. Full names (`event`, `error`, not `e`, `err`). File names camelCase, PascalCase or kebab-case.
- **React (.tsx/.jsx):** hooks rules and exhaustive deps are errors. No components defined inside components, no index keys, `<>` fragments, self-closing empty tags, all jsx-a11y recommended rules.

Never add `eslint-disable`. Fix the code.

## Output

Unix format: `path:line:col: message [Error/rule-id]`, then a problem count. The exit code is non-zero when errors are found; that is normal, not a script failure.

Summarise by rule, worst first:

```bash
grep -oE '\[(Error|Warning)/[^]]+\]' /tmp/eslint.txt | sort | uniq -c | sort -rn | head -30
```

## Caveats

- Do not run `--fix` unless the user asks. It edits files in place.
- With a repo `node_modules`, the pinned packages are bind-mounted over the repo's copies, read-only. Without one, the script prints a warning. The bundled formatter resolves from the pinned cache either way; project imports and type checks can still require the repo's dependencies.
- Errors such as `install bubblewrap` or `config not found` are fatal. Report them as-is.
