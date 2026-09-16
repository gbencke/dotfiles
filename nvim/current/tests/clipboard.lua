-- Run from nvim/current: nvim --headless -u NONE -i NONE -l tests/clipboard.lua
-- Uses real Tree-sitter parsers and an in-memory clipboard (no desktop changes).
local temp = vim.fn.tempname()
local config = vim.fn.getcwd()
local ok, err = pcall(function()
  local copied, notice, level
  vim.g.mapleader = " "
  vim.g.clipboard = {
    name = "clipboard-test",
    copy = { ["+"] = function(lines) copied = table.concat(lines, "\n") end },
    paste = { ["+"] = function() return { { copied or "" }, "v" } end },
  }
  vim.notify = function(message, severity) notice, level = message, severity end
  dofile("lua/config/keymaps.lua")

  local function copy(key, expected)
    local mapping = vim.fn.maparg(" y" .. key, "n", false, true)
    assert(type(mapping.callback) == "function", "Missing <leader>y" .. key)
    notice, level = nil, nil
    mapping.callback()
    assert(copied == expected, key .. ": expected " .. tostring(expected) .. ", got " .. tostring(copied))
    assert(level ~= vim.log.levels.WARN and level ~= vim.log.levels.ERROR, notice)
  end

  local function unchanged(key)
    local before = copied
    notice, level = nil, nil
    vim.fn.maparg(" y" .. key, "n", false, true).callback()
    assert(copied == before, key .. " changed the clipboard without a value")
    assert(notice and level == vim.log.levels.WARN, key .. " did not explain the missing value")
  end

  vim.fn.mkdir(temp .. "/repo/.git", "p")
  vim.fn.mkdir(temp .. "/repo/src", "p")
  vim.api.nvim_buf_set_name(0, temp .. "/repo/src/example file.ts")
  copy("F", "example file.ts")
  copy("P", temp .. "/repo/src/example file.ts")
  copy("R", temp .. "/repo") -- Uses the file's repo, not Neovim's cwd.
  vim.fn.delete(temp .. "/repo/.git", "d")
  vim.fn.writefile({ "gitdir: /unused/worktree" }, temp .. "/repo/.git")
  copy("R", temp .. "/repo") -- Worktree/submodule .git files also mark roots.
  vim.fn.delete(temp .. "/repo/.git")
  unchanged("R")

  local function source(lang, lines, row, col)
    vim.bo.filetype = lang
    vim.api.nvim_buf_set_lines(0, 0, -1, false, lines)
    vim.api.nvim_win_set_cursor(0, { row, col })
  end

  source("typescript", {
    "class Example {",
    "  method() {",
    "    function nested() { return 1; }",
    "    return nested();",
    "  }",
    "}",
    "const arrow = () => 42;",
    "const obj = { run: () => 7 };",
    "items.map(() => 9);",
    "const outside = 0;",
  }, 3, 30)
  copy("C", "Example")
  copy("M", "nested")
  vim.api.nvim_win_set_cursor(0, { 4, 12 })
  copy("M", "method")
  vim.api.nvim_win_set_cursor(0, { 7, 20 })
  copy("M", "arrow")
  vim.api.nvim_win_set_cursor(0, { 7, 7 })
  copy("M", "arrow") -- Cursor on the binding name, not just inside the body.
  unchanged("C")
  vim.api.nvim_win_set_cursor(0, { 8, 24 })
  copy("M", "run")
  vim.api.nvim_win_set_cursor(0, { 9, 16 })
  unchanged("M")
  vim.api.nvim_win_set_cursor(0, { 10, 10 })
  unchanged("M")

  source("python", {
    "class Outer:",
    "    class Inner:",
    "        def execute(self):",
    "            return 1",
  }, 4, 19)
  copy("C", "Inner")
  copy("M", "execute")
  vim.api.nvim_buf_set_lines(0, 2, 3, false, { "        def renamed(self):" })
  copy("M", "renamed") -- Reparse unsaved edits instead of using stale syntax nodes.
  source("javascript", { "const Named = class { run() { return 1; } };" }, 1, 37)
  copy("C", "Named")
  copy("M", "run")
  vim.api.nvim_win_set_cursor(0, { 1, 8 })
  copy("C", "Named")
  source("lua", { "local function example()", "  return 1", "end" }, 2, 9)
  copy("M", "example")
  source("markdown", { "```lua", "local function embedded()", "  return 1", "end", "```" }, 3, 9)
  copy("M", "embedded")

  vim.cmd("enew!")
  vim.bo.filetype = "text"
  unchanged("F")
  unchanged("P")
  unchanged("C")
  unchanged("M")
  vim.cmd.cd(temp)
  unchanged("R")
  vim.fn.mkdir(temp .. "/.git", "p")
  copy("R", temp) -- An unnamed buffer uses cwd for repo lookup.
  vim.bo.buftype = "nofile"
  vim.api.nvim_buf_set_name(0, "scratch")
  unchanged("F")
  unchanged("P")

  local spec = dofile(config .. "/lua/plugins/which-key.lua")[1].opts.spec
  assert(vim.iter(spec):any(function(item) return item[1] == "<leader>y" and item.group == "copy" end),
    "Missing which-key copy menu")
end)
vim.fn.delete(temp, "rf")
if not ok then io.stderr:write(tostring(err) .. "\n") end
print(ok and "Clipboard checks passed" or "Clipboard checks failed")
vim.cmd(ok and "qa!" or "cquit 1")
