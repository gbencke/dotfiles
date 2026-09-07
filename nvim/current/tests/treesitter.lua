-- Run: nvim --headless -i NONE -c 'luafile tests/treesitter.lua'
-- Guards the Neovim 0.12 nvim-treesitter branch and Markdown injection path.
local ok, err = pcall(function()
  assert(require("lazy.core.config").plugins["nvim-treesitter"].branch == "main",
    "nvim-treesitter must use its Neovim 0.12-compatible main branch")

  vim.cmd("enew")
  vim.api.nvim_buf_set_lines(0, 0, -1, false, {
    "# Tree-sitter injection check",
    "",
    "```lua",
    "print('ok')",
    "```",
  })
  vim.cmd("setfiletype markdown")

  local scope_done = false
  Snacks.scope.get(function() scope_done = true end, { buf = 0, pos = { 4, 0 } })
  assert(vim.wait(1000, function() return scope_done end), "Snacks scope timed out parsing Markdown injections")

  local parser = vim.treesitter.get_parser(0, "markdown")
  local parsed, parse_err = pcall(parser.parse, parser, true)
  assert(parsed, parse_err)
  print("Tree-sitter Markdown injection check passed", "OK")
end)
if not ok then io.stderr:write(tostring(err) .. "\n") end
vim.cmd(ok and "qa!" or "cquit 1")
