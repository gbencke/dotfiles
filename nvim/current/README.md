# jetbrains-nvim

A from-scratch Neovim configuration replacing WebStorm and PyCharm feature-for-feature:
Python (basedpyright, ruff, debugpy, molten/Jupyter) and JS/TS (vtsls, eslint, prettier,
tailwind, vscode-js-debug) with full IDE tooling — git stack, database client, HTTP client,
testing — built on lazy.nvim with Neovim 0.12+ native LSP.

Companion to the guide: *Replacing WebStorm and PyCharm with Neovim* (22 chapters),
which explains every file here and the migration plan to adopt it safely.

See the [command cheatsheet](CHEATSHEET.md) for shortcuts and step-by-step
[debugging instructions](CHEATSHEET.md#debugging).

## Prerequisites

- Neovim **0.12+** (`nvim --version`)
- git, a C compiler (`gcc`/`clang`), **ripgrep**, **fd**, tree-sitter CLI **0.26.1+**
- A **Nerd Font** in your terminal
- node + npm (language servers, js-debug-adapter, prettier)
- python3 + `pip install pynvim` (molten remote plugin)
- Optional: `uv` (Python envs), `lazygit`, `lazydocker`, `docker`

## Install (side-by-side, zero risk)

Try it without touching any existing config via `$NVIM_APPNAME`:

```bash
git clone <this-repo> ~/.config/jetbrains-nvim
NVIM_APPNAME=jetbrains-nvim nvim
# optional alias:
# alias jn='NVIM_APPNAME=jetbrains-nvim nvim'
```

Or as your main config:

```bash
git clone <this-repo> ~/.config/nvim
nvim
```

First boot: lazy.nvim self-installs and clones all plugins; mason installs language
servers and DAP adapters (`ensure_installed`); treesitter compiles parsers.
Run `:checkhealth` once and fix any environment warnings.

Then **commit `lazy-lock.json`** after the first successful boot — it is your
rollback insurance for plugin updates.

## Layout

```text
init.lua                  entry point
lua/config/options.lua    options + diagnostics
lua/config/keymaps.lua    global keymaps
lua/config/autocmds.lua   QoL autocmds, LspAttach, ruff/eslint save pipelines
lua/config/lazy.lua       lazy.nvim bootstrap
lua/plugins/*.lua         one file per plugin (or tight group)
after/lsp/*.lua           per-server LSP overrides (merged over lspconfig defaults)
```

## Key architecture decisions

- **LSP**: Neovim 0.11 native `vim.lsp.config`/`vim.lsp.enable`; nvim-lspconfig as a
  data package; per-server overrides in `after/lsp/`; mason-lspconfig `automatic_enable`.
- **Ownership treaties** (do not break these):
  - basedpyright = types/nav; **ruff** = lint/format/imports (`disableOrganizeImports`)
  - **prettier** (via conform) = web formatting; vtsls/jsonls/yamlls formatting disabled
  - eslint server = diagnostics + `source.fixAll.eslint` on save, never formatting
  - `lsp_format = "fallback"` everywhere: dedicated formatters beat LSP formatting
- **Python interpreters**: commit `pyrightconfig.json` per project
  (`venvPath: ".", venv: ".venv"`), or activate the venv before launching,
  or `<leader>pv` (venv-selector) mid-session.
- **Database connections**: project-local `.nvim.lua` (exrc) with `vim.g.dbs`,
  credentials via function-valued URLs from your secret manager. Never commit URLs.

## Keymap groups (leader = Space)

`f` find · `g` git · `c` code/LSP · `d` debug · `t` test/terminal · `s` search/replace ·
`q` session · `b` buffer · `x` diagnostics · `h` harpoon · `D` database ·
`R` http · `j` jupyter · `o` overseer · `p` python

Press `<leader>` and wait 400ms — which-key shows the full tree.

Neo-tree opens on the left at startup. Press `<leader>e` to toggle it; `-` still opens Oil.
Bufferline shows open buffers across the top. Use `]b` / `[b` to switch buffers.

## Maintenance

- Update deliberately: `:Lazy sync` on your schedule, review `git diff lazy-lock.json`, commit.
- Breakage rollback: `git checkout -- lazy-lock.json && nvim -c "Lazy restore"`.
- Startup budget: `:Lazy profile` — keep it under ~100ms; lazy-load triggers everywhere.
- Pinned on purpose: `blink.cmp` v1 (`version = "1.*"`). nvim-treesitter uses `main`,
  the branch compatible with Neovim 0.12.

## Optional extras (commented in the specs)

- `lua/plugins/web-extras.lua`: tailwind-tools.nvim, package-info.nvim
- `lua/plugins/tasks.lua`: remote-nvim.nvim (VS Code-style remote dev)
