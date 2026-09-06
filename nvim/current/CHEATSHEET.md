# Neovim command cheatsheet

Commands for this repository and the matching live config in `~/.config/nvim`.
Neo-tree opens at startup. The start dashboard and AI plugins are disabled or removed.

## Reading the shortcuts

- **Leader is Space.** `<leader>ff` means press Space, then f, then f.
- **Local leader is comma.** `<localleader>r` means press comma, then r.
- Use **Normal mode** unless a row says otherwise. Press `Esc` to leave Insert mode.
- `<C-h>` means Ctrl+h; `<S-Tab>` means Shift+Tab. Uppercase letters require Shift.
- Type commands beginning with `:` and press Enter. Run `bash` blocks in a shell.
- Press Space and pause for shortcut hints. `<leader>?` shows buffer-local shortcuts.
- Plugin windows can override global keys. Their help menus show the local bindings.

**Jump to:** [Debugging](#debugging) · [Files and search](#files-and-search) ·
[Windows](#buffers-and-windows) · [Editing](#editing-and-completion) ·
[LSP](#code-navigation-and-diagnostics) · [Replace](#search-and-replace) ·
[Git](#git-and-github) · [Tests](#tests-and-coverage) ·
[Terminals](#terminals-and-tasks) · [Sessions](#sessions) ·
[Databases](#databases) · [HTTP](#http-requests) · [Notebooks](#notebooks) ·
[Maintenance](#maintenance-and-help)

## Everyday essentials

Start Neovim from the project root. This sets the working directory used by search,
tests, tasks, and `${workspaceFolder}` in debug configurations.

```bash
cd /path/to/project
nvim
# Or open a file directly:
nvim src/main.py
```

| Key / command | Action |
| --- | --- |
| `<leader>e` | Toggle the file tree. |
| `<leader>ff` | Find a file. |
| `<leader>fg` | Search project text. |
| `<leader>fb` | Switch between open buffers. |
| `:w` / `:wa` | Save this buffer / all buffers. Formatting runs on save. |
| `:q` / `:qa` | Close a window / quit Neovim; refuses unsaved changes. |
| `:wq` | Save and close the current window. |
| `:q!` / `:qa!` | Close / quit **without saving changes**. |
| `u` / `<C-r>` | Undo / redo. |
| `<leader>bd` | Delete the current buffer without disrupting the window layout. |
| `<leader>dc` or `<F5>` | Start or continue debugging. See setup below. |

## Debugging

### One-time setup

The editor plugins are installed. At the time this sheet was written, the Mason
packages **debugpy** and **js-debug-adapter** were not installed.

Run inside Neovim:

```vim
:MasonInstall debugpy js-debug-adapter
:Mason
```

Wait for both installs to finish. The current `mason-nvim-dap` automatic-install
list uses package names, but that plugin expects adapter IDs (`python`, `js`).
Use the explicit install command above rather than relying on automatic installation.

Check the executables inside Neovim; both commands should print `1`:

```vim
:echo executable(expand('~/.local/share/nvim/mason/packages/debugpy/venv/bin/python'))
:echo executable('js-debug-adapter')
```

The Python adapter path is hard-coded to the main `nvim` installation. A different
`NVIM_APPNAME` or Mason install directory requires adjusting `lua/plugins/dap.lua`.
Node.js and npm must also be available for JavaScript debugging.

### Start a Python script

1. Set up the project's dependencies and activate its environment. For an existing
   project-local `.venv`:

   ```bash
   cd /path/to/project
   source .venv/bin/activate
   nvim main.py
   ```

2. Open the Python source buffer. Use `<leader>pv` (`:VenvSelect`) if you need to
   choose a different environment inside Neovim.
3. Move to an executable line and press `<leader>db` or `<F9>` to set a breakpoint.
4. Press `<leader>dc` or `<F5>` and choose **file**. Choose **file:args** to enter
   command-line arguments instead.
5. When execution pauses, use the controls below. Press `<leader>dq` to terminate.

The Mason Python runs the debug adapter; the project environment runs your code.
`nvim-dap-python` resolves the project interpreter from the activated environment,
the environment selector, or a local `venv`, `.venv`, `env`, or `.env` directory.
Install your application's dependencies in that project environment, not Mason's.

Python defaults also include **attach** and **file:doctest**. The latter runs
Python doctests with debugging disabled (`noDebug = true`).

### Debug a Python test

The test runner is **pytest**. Install it and the project's dependencies in the
project environment before running tests.

1. Open a Python test file and set a breakpoint with `<leader>db`.
2. Put the cursor inside the test function.
3. Press `<leader>dtm` to debug that function, or `<leader>dtc` for its test class.
4. Alternatively, press `<leader>td` to debug the nearest test through Neotest.

**Neotest's Python interpreter is fixed to `.venv/bin/python`.** If you use another
environment layout, use the `dtm` / `dtc` workflow or adjust `lua/plugins/neotest.lua`.
The environment selector does not change that hard-coded Neotest setting.

### Attach to a running Python program

In a shell with the project's environment activated, install `debugpy` in that
environment if it is absent, then launch your program:

```bash
python -m pip install debugpy
python -m debugpy --listen 127.0.0.1:5678 --wait-for-client main.py
```

Open the Python source in Neovim, set a breakpoint, press `<F5>`, and choose
**attach**. Accept host `127.0.0.1` and port `5678` at the prompts.
Keep debugger ports local; they allow control of the debugged process.

### Start a JavaScript or TypeScript script

The built-in script launcher uses **npx tsx**, including for JavaScript files.
Install the project's dependencies and add `tsx` if it is not already available:

```bash
cd /path/to/project
npm install --save-dev tsx
nvim src/main.ts
```

1. Open a JavaScript, TypeScript, JSX, or TSX source buffer.
2. Set a breakpoint with `<leader>db` or `<F9>`.
3. Press `<F5>` and choose **Launch current file (tsx)**.
4. Step through the code or press `<F5>` again to continue.

Use this for scripts that run in Node.js. Browser-only React/Vue application code
needs the browser workflow below, not the script launcher.

### Attach to Node.js

Start a Node program with the inspector bound to localhost:

```bash
node --inspect-brk=127.0.0.1:9229 src/main.js
```

Open the source in Neovim, set a breakpoint, press `<F5>`, choose
**Attach to process**, and select that Node process. Resume with `<F5>` if it first
stops at program entry.

### Debug a browser application

For the built-in Vite profile:

1. Start the project's dev server separately, for example `npm run dev`.
2. Confirm it serves **http://localhost:5173**. This URL is fixed in the current config.
3. Open a JS/TS/JSX/TSX source buffer in Neovim and set a breakpoint.
4. Press `<F5>` and choose **Chrome: Vite dev server**. Chrome must be installed.
5. Trigger the relevant action in the browser.

To attach to Chrome instead, start a separate debugging browser profile. On macOS:

```bash
open -na "Google Chrome" --args \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.cache/nvim-chrome-debug" \
  http://localhost:5173
```

Then select **Chrome: attach (9222)** with `<F5>`. Keep the dev server running.
Use a separate profile, not your normal browser profile. Source maps must map the
browser's code back to the local files for source breakpoints to work.

### Debug controls

Run these in Normal mode. With no session, `<F5>` opens the configuration picker;
with an active session, it continues that session. Terminate before choosing a
different launch profile.

| Key / command | Action |
| --- | --- |
| `<leader>db` / `<F9>` | Toggle a breakpoint; this mapping persists it between sessions. |
| `<leader>dB` | Set a conditional breakpoint; enter an expression such as `count > 5`. |
| `<leader>dl` | Set a logpoint; enter text such as `count={count}`. |
| `<leader>dc` / `<F5>` | Start / continue. |
| `<leader>dn` / `<F10>` | Step over. |
| `<leader>di` / `<F11>` | Step into. |
| `<leader>do` | Step out. No Shift+F11 mapping is configured. |
| `<leader>dC` | Run to cursor. |
| `<leader>dr` | Restart the session. |
| `<leader>dq` | Terminate the session; may stop an attached program. |
| `<leader>du` | Toggle debug panels. |
| `<leader>de` | Evaluate the expression under the cursor or the Visual selection. |
| `:DapPause` | Pause a running program. |
| `:DapDisconnect` | Request detach without terminating the debuggee. |
| `:DapToggleRepl` | Toggle the debug REPL. |
| `:DapShowLog` | Open debugger logs. |

The DAP `:` commands become available after the debug plugin loads; `<leader>du`
loads it without launching a program. macOS may require Fn with function keys.

The right panels contain **scopes, watches, stacks, and breakpoints**. The bottom
panels contain the **REPL and console**. They open on launch/attach and close when
a session ends. `<CR>` expands an item; `e` edits a supported item or watch; `d`
removes one where supported.

A launched program can focus its terminal in Insert mode. Press `<C-]>` to leave
Terminal mode, then use `<C-h/j/k/l>` to move back to a source or debug window.

### Project-specific debug profiles

Create `.vscode/launch.json` in the project root for stable entry points, arguments,
environment variables, or different browser URLs. The installed nvim-dap reads it
automatically when starting a new session; no manual import command is needed.

Example: always launch `main.py` with the project's `.venv` and an argument:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: project entry",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/main.py",
      "python": "${workspaceFolder}/.venv/bin/python",
      "cwd": "${workspaceFolder}",
      "args": ["--verbose"],
      "console": "integratedTerminal"
    }
  ]
}
```

Replace the file and arguments with your project's values, then choose
**Python: project entry** with `<F5>` from a Python buffer. For custom JS/browser
profiles, use the configured adapter types **pwa-node** and **pwa-chrome**. Do not
assume every VS Code extension, task, or launch setting works in nvim-dap.

### Debug troubleshooting

| Symptom | Check / action |
| --- | --- |
| No launch profiles | Focus a supported source buffer; check `:set filetype?`. |
| Python adapter not found | Install `debugpy` with Mason; verify the hard-coded executable path above. |
| `js-debug-adapter` not executable | Install it with Mason; check `:echo executable('js-debug-adapter')`. |
| Missing Python imports | Activate the project environment or use `<leader>pv`; install project dependencies there. |
| Neotest cannot find Python | It expects `.venv/bin/python` relative to the project. |
| Wrong paths, tests, or launch file | Check `:pwd`; use `:cd /path/to/project`. |
| No breakpoint marker in the gutter | The current config uses empty breakpoint/stopped sign text. Check the debug panel instead. |
| Breakpoint never hits | Use executable code that actually runs; for JS/TS also verify source maps and the dev-server URL. |
| `Cannot set exception breakpoints: No active session!` on first load | The config tries to set exception filters before a session exists. After attaching, use `:lua require('dap').set_exception_breakpoints({'uncaught'})` if wanted. |
| Other adapter errors | Open `:DapShowLog`; use `:DapSetLogLevel DEBUG` before reproducing. Logs can contain program data. |

## Files and search

### File tree: Neo-tree

`<leader>e` toggles the sidebar. `:Neotree reveal` locates the current file in it.
These default keys apply **inside the tree**:

| Key | Action |
| --- | --- |
| `<CR>` | Open a file or expand/collapse a directory. |
| `s` / `S` / `t` | Open in a vertical split / horizontal split / new tab. |
| `a` / `A` | Add a file / directory. |
| `r` | Rename. |
| `d` | Delete the selected file/directory; review the confirmation. |
| `y` / `x` / `p` | Copy / cut / paste a file. |
| `H` | Toggle hidden and filtered items. |
| `/` | Fuzzy-find in the tree. |
| `<BS>` / `.` | Navigate to the parent / set the selected directory as root. |
| `R` | Refresh. |
| `P` | Toggle preview. |
| `q` / `?` | Close the tree / show its keybindings. |

Changing the tree root can also change the tab's working directory; check `:pwd`
before launching tests or a debugger.

### Directory editing: Oil

Press `-` from a file to open its parent directory as an editable buffer.
Edit filenames to rename, add lines to create files, and delete lines to remove
files. Run `:w` and review the proposed filesystem operations before confirming.

| Key | Action inside Oil |
| --- | --- |
| `<CR>` / `-` | Open the entry / go to its parent. |
| `<C-s>` / `<C-h>` / `<C-t>` | Open in a vertical split / horizontal split / tab. |
| `<C-p>` / `<C-l>` | Preview / refresh. |
| `g.` | Toggle hidden files; they are shown initially. |
| `<C-c>` / `g?` | Close Oil / show help. |

### Search pickers: Snacks

| Key | Picker |
| --- | --- |
| `<leader>ff` | Files. |
| `<leader>fa` | Smart file search ranked by frequency and recency. |
| `<leader>fg` | Live project-text search. Requires `rg`. |
| `<leader>fb` | Open buffers. |
| `<leader>fr` | Recent files. |
| `<leader>fh` | Help topics. |
| `<leader>fk` | Keybindings. |
| `<leader>fc` | Commands. |
| `<leader>fd` | Diagnostics. |
| `<leader>fq` | Quickfix entries. |
| `<leader>f:` / `<leader>f/` | Command / search history. |
| `<leader>fs` / `<leader>fS` | Document / workspace symbols. |

### Pinned files: Harpoon

| Key | Action |
| --- | --- |
| `<leader>ha` | Add the current file. |
| `<leader>hh` | Open the pinned-file menu. |
| `<leader>1` / `<leader>2` / `<leader>3` / `<leader>4` | Open pinned file 1–4. |

## Buffers and windows

Buffers are open files; windows are views onto buffers. Bufferline displays the
buffers across the top. Neovim tab pages are separate window layouts.

| Key / command | Action |
| --- | --- |
| `]b` / `[b` | Next / previous buffer. |
| `<leader>bd` | Close the current buffer. |
| `<C-h>` / `<C-j>` / `<C-k>` / `<C-l>` | Focus the left / lower / upper / right window. |
| `<C-Up>` / `<C-Down>` | Increase / decrease window height. |
| `<C-Right>` / `<C-Left>` | Increase / decrease window width. |
| `:split` / `:vsplit` | Split horizontally / vertically. |
| `:close` | Close the current window without deleting its buffer. |
| `<C-w>=` | Equalize window sizes. |
| `:tabnew` / `gt` / `gT` | New tab page / next tab / previous tab. |

## Editing and completion

| Key | Action |
| --- | --- |
| `gcc` | Toggle the current line's comment. |
| `gc` + motion | Toggle comments over a motion, e.g. `gcip` for a paragraph. |
| Visual selection + `gc` | Toggle comments on the selected lines. |
| `ysiw"` | Surround the current word with double quotes. |
| `cs"'` | Change surrounding double quotes to single quotes. |
| `ds"` | Remove surrounding double quotes. |
| Visual selection + `S` + delimiter | Surround the selection. |
| Visual selection + `J` / `K` | Move selected lines down / up. |
| `/pattern` then `n` / `N` | Search, then next / previous match. |
| `Esc` in Normal mode | Clear search highlighting. |
| `za` / `zR` / `zM` | Toggle a fold / open all folds / close all folds. |

**Completion in Insert mode** uses Blink, not AI:

| Key | Action |
| --- | --- |
| `<Tab>` | Accept the selected completion; otherwise advance a snippet or insert a tab. |
| `<S-Tab>` | Go to the previous snippet field. |
| `<C-Space>` | Show completion or toggle its documentation. |
| `<C-n>` / `<C-p>` | Next / previous completion. |
| `<C-y>` / `<C-e>` | Accept / cancel completion. |
| `<C-b>` / `<C-f>` | Scroll completion documentation up / down. |
| `<C-k>` | Toggle signature help. |

Enter is not configured as Blink's acceptance key. Command-line completion has a
separate default: Tab shows/cycles suggestions; Ctrl+y accepts.

**Treesitter selections and motions** need a parser for the filetype:

| Key | Action |
| --- | --- |
| `<C-Space>` in Normal/Visual mode | Start / expand a syntax-node selection. |
| `<BS>` in that selection | Shrink it. |
| `af` / `if` | Around / inside a function. |
| `ac` / `ic` | Around / inside a class. |
| `aa` / `ia` | Around / inside a parameter. |
| `al` / `il` | Around / inside a loop. |
| `]m` / `[m` | Next / previous function start. |
| `]]` / `[[` | Next / previous class start. |
| `<leader>sn` / `<leader>sp` | Swap a parameter with the next / previous one. |

Use text objects with an operator or Visual mode: `vif` selects a function's body;
`daf` deletes a function.

## Code navigation and diagnostics

These commands need an attached language server. Rename, actions, formatting, and
related `<leader>c` mappings are installed on LSP attachment; inlay hints also need
server support.

| Key / command | Action |
| --- | --- |
| `gd` / `gD` | Go to definition / declaration. |
| `gr` / `gi` / `gy` | References / implementations / type definitions. |
| `K` | Hover documentation. |
| `<leader>cr` | Rename the symbol. |
| `<leader>ca` | Code actions; also available in Visual mode. |
| `<leader>cf` | Format the current buffer with Conform. |
| `<leader>ci` | Request an organize-imports code action. |
| `<leader>ch` | Toggle inlay hints, if supported. |
| `<leader>pv` | Select a Python environment. |
| `]d` / `[d` | Next / previous diagnostic; does not require an LSP. |
| `<leader>xx` / `<leader>xX` | Toggle all / current-buffer diagnostics in Trouble. |
| `<leader>xs` | Toggle the symbol outline. |
| `<leader>xr` | Toggle LSP references/definitions in Trouble. |
| `<leader>xq` | Toggle the quickfix list in Trouble. |
| `:ConformInfo` | Show configured formatters and their availability. |
| `:lua require('conform').format({ async = true })` | Format manually without needing the LSP-specific mapping. |

Saving runs Conform; Python also has Ruff fix/import actions, and ESLint-attached
buffers request fixes. Web formatting uses project-local Prettier. Missing tools
are not installed by Conform: inspect `:ConformInfo` and install the relevant tool.

## Search and replace

| Key | Action |
| --- | --- |
| `<leader>sr` | Open project-wide search-and-replace. |
| `<leader>sw` | Prefill the word under the cursor, or the Visual selection. |
| `<leader>sf` | Restrict replacement to the current file. |
| `<leader>sa` | Structural replacement with ast-grep; requires its executable. |

In the Grug Far buffer, fill the search, replacement, and optional file filters.
Review the matches before changing files.

| Key | Action inside Grug Far, Normal mode |
| --- | --- |
| `,r` | Apply the replacement. |
| `,q` | Send matches to quickfix. |
| `<CR>` | Jump to the match. |
| `,f` | Refresh results. |
| `,c` / `g?` | Close / show help. |

## Git and GitHub

| Key / command | Action |
| --- | --- |
| `<leader>gg` | Open Lazygit; requires the `lazygit` executable. |
| `<leader>gf` | Pick Git-modified files. |
| `]h` / `[h` | Next / previous changed hunk. |
| `<leader>ghs` / `<leader>ghS` | Stage a hunk or Visual range / entire buffer. |
| `<leader>ghr` | **Discard** changes in the hunk or Visual range. |
| `<leader>ghu` | Undo the last hunk-staging operation. |
| `<leader>ghp` | Preview a hunk inline. |
| `<leader>ghb` / `<leader>gtb` | Show full line blame / toggle inline blame. |
| `<leader>gtw` | Toggle word-level diffs. |
| `<leader>ghd` / `<leader>ghD` | Diff this file against the index / `~` revision. |
| `<leader>ghq` | Send this buffer's hunks to quickfix. |
| `ih` | Git-hunk text object, e.g. `vih` selects the hunk. |
| `<leader>gd` | Open Diffview for the working tree. |
| `<leader>gD` / `<leader>gH` | Diffview history for this file / the repository. |
| `:DiffviewClose` | Close Diffview after opening it. |
| `<leader>gy` | Copy a repository permalink for the cursor/Visual range. |
| `:Git` | Open Fugitive's Git status view. |
| `:Git blame` / `:Git log` | Run Git blame / log. |
| `:Octo issue list` / `:Octo pr list` | Browse GitHub issues / pull requests. Requires `gh` authentication. |

Gitsigns' hunk/blame bindings appear in buffers where Gitsigns attaches.

## Tests and coverage

Adapters are configured for **pytest**, **Jest**, and **Vitest**. Install the
project's test dependencies first. Python Neotest expects `.venv/bin/python`;
Jest runs `npm test --` from Neovim's working directory.

| Key | Action |
| --- | --- |
| `<leader>tr` / `<leader>tt` | Run the nearest test / current file. |
| `<leader>tl` | Re-run the last test selection. |
| `<leader>td` | Debug the nearest test using DAP, if the adapter supports it. |
| `<leader>ts` | Toggle the test summary. |
| `<leader>to` / `<leader>tO` | Open test output / toggle the output panel. |
| `<leader>ta` | Attach to a running test's output; not a debugger attach command. |
| `<leader>tx` | Stop tests. |
| `]t` / `[t` | Jump to the next / previous failed test. |
| `<leader>tcv` / `<leader>tcc` | Load and show coverage / display its summary. |

Inside the summary: `<CR>` expands, `r` runs, `d` debugs, `o` opens output, `u` stops,
`m` marks, `R` runs marked tests, `D` debugs marked tests, and `w` toggles watching.
Coverage commands read an existing report; run the test runner with coverage first.

## Terminals and tasks

| Key / command | Action |
| --- | --- |
| `<leader>tf` | Toggle a floating terminal. |
| `<leader>t1` / `<leader>t2` | Toggle numbered terminals 1 / 2. |
| `<C-]>` in Terminal mode | Return to Terminal-Normal mode; the process keeps running. |
| `<C-h>` / `<C-j>` / `<C-k>` / `<C-l>` in Terminal mode | Leave Terminal mode and switch windows. |
| `i` in Terminal-Normal mode | Resume typing into the terminal. |
| `<leader>or` / `:OverseerRun` | Choose and run a project task. |
| `<leader>ot` / `:OverseerToggle` | Toggle the task list. |
| `<leader>oa` | Open quick actions for a task. |

Use a terminal or Overseer for a dev server, then start debugging separately.
Starting a DAP profile does not automatically run `npm run dev`.

## Sessions

| Key | Action |
| --- | --- |
| `<leader>qs` | Restore the session for this working directory. |
| `<leader>ql` | Restore the last session. |
| `<leader>qp` | Pick a saved session. |
| `<leader>qd` | Stop saving the current session; does not quit Neovim. |

Save your files before restoring another layout. Sessions restore editor state;
they do not keep application/debugger processes running.

## Databases

| Key / command | Action |
| --- | --- |
| `<leader>Du` / `:DBUIToggle` | Toggle the database browser. |
| `<leader>Df` / `:DBUIFindBuffer` | Locate the current query buffer in the browser. |
| `:DBUIAddConnection` | Add a connection; its URL is saved locally. |
| `<leader>S` in a DBUI SQL buffer | Execute the whole query or Visual selection. |
| `<leader>W` in a DBUI SQL buffer | Save the query in DBUI's query collection. |

**DBUI executes SQL on save by default.** Check the connection and query before
`:w` or `<leader>S`; use a development database for experiments. SQL completion
uses the selected connection. Database command-line clients must be installed.

Do not commit credentials. For session-only configuration, set `vim.g.dbs` from an
environment variable before opening DBUI, for example:

```vim
:lua vim.g.dbs = { dev = vim.env.DATABASE_URL }
```

Set `DATABASE_URL` in the shell before launching Neovim. Project-local `.nvim.lua`
files are **not** automatically loaded by this config: `exrc` is not enabled.

## HTTP requests

Open a `.http` file; use `###` to separate requests. These are Kulala bindings:

| Key | Action |
| --- | --- |
| `<leader>Rs` / `<leader>Ra` | Send the current request / all requests. |
| `<leader>Rb` | Open an HTTP scratchpad. |
| `<leader>Re` | Select a request environment. |
| `<leader>Rc` | Copy the request as a cURL command. |

All except the scratchpad shortcut are restricted to `http` / `rest` buffers.
Review the destination and payload before sending requests that change data.

## Notebooks

Molten runs code through Jupyter kernels. It needs Neovim's Python provider
(`pynvim`) and a registered kernel with the project's dependencies. This host
currently has no Python provider (`:checkhealth provider.python`). Jupytext also
needs the `jupytext` executable. Image output uses the Kitty terminal protocol.

| Key / command | Action |
| --- | --- |
| `<leader>ji` / `:MoltenInit` | Choose and initialize a Jupyter kernel. |
| `<leader>jl` | Run the current line. |
| `<leader>jv` in Visual mode | Run the selected code. |
| `<leader>jm` + motion | Run a region; `<leader>jmip` runs a paragraph. |
| `<leader>jc` | Re-run the current Molten cell. |
| `<leader>jo` / `<leader>jh` | Show / hide the output window. |
| `<leader>jI` | Open an image-output popup. |
| `<leader>jD` | Deinitialize the kernel connection. |
| `:UpdateRemotePlugins` | Refresh remote-plugin registration; restart afterward. |

Opening `.ipynb` files uses Jupytext's configured Markdown representation.

## Maintenance and help

| Command / key | Action |
| --- | --- |
| `:Lazy` | Inspect installed plugins and their load states. |
| `:Lazy sync` | Install, update, and clean plugins; review lockfile changes afterward. |
| `:Lazy restore` | Restore plugin versions from `lazy-lock.json`. |
| `:Lazy profile` | Inspect plugin startup cost. |
| `:Mason` | Inspect/install language servers and external tools. |
| `:MasonInstall debugpy js-debug-adapter` | Install the two configured debug adapters. |
| `:ConformInfo` | Inspect formatting setup and missing executables. |
| `:checkhealth` / `:checkhealth vim.lsp` | General / language-server diagnostics. |
| `:TSInstall lua` / `:TSUpdate` | Install a parser / update installed parsers; load Treesitter by opening a source file first. |
| `:messages` | Review messages and errors. |
| `:pwd` / `:cd /path/to/project` | Inspect / change the working directory. |
| `:echo stdpath('config')` | Show the config directory Neovim actually loads. |
| `:verbose nmap <Space>dc` | Inspect the effective debug-start mapping and where it was defined. |
| `<leader>fk` / `<leader>fh` | Search keybindings / plugin help. |

This repository and `~/.config/nvim` are separate copies, not a symlink. Editing
one does not update the other. Apply intended config changes to both and restart
Neovim when testing startup or plugin removal.

### Where these commands are configured

- [`lua/config/keymaps.lua`](lua/config/keymaps.lua): global and terminal keys.
- [`lua/config/autocmds.lua`](lua/config/autocmds.lua): LSP keys and save actions.
- [`lua/plugins/dap.lua`](lua/plugins/dap.lua): debugger adapters, profiles, and keys.
- [`lua/plugins/neotest.lua`](lua/plugins/neotest.lua): test commands and Python path.
- [`lua/plugins/`](lua/plugins/): other plugin shortcuts and options.
- Installed plugin help supplies the default Neo-tree, Oil, Blink, editing, DBUI,
  and Grug Far bindings listed above. Shared dependency libraries have no everyday
  user commands and are omitted.
