-- Run: nvim --headless -i NONE -c 'luafile tests/colorizer.lua'
local deprecate = vim.deprecate
local deprecated_call
vim.deprecate = function(name, ...)
  if name == "vim.tbl_flatten" then deprecated_call = debug.traceback(name) end
  return deprecate(name, ...)
end

local ok, err = pcall(function()
  require("lazy").load({ plugins = { "nvim-colorizer.lua" } })
  vim.api.nvim_buf_set_lines(0, 0, -1, false, { "body { color: #ff0000; }" })
  vim.bo.filetype = "css"
  require("colorizer").attach_to_buffer(0)
  assert(vim.wait(2000, function()
    for _, mark in ipairs(vim.api.nvim_buf_get_extmarks(0, -1, 0, -1, { details = true })) do
      local group = mark[4].hl_group
      if type(group) == "string" and vim.api.nvim_get_hl(0, { name = group }).bg == 0xff0000 then
        return true
      end
    end
    return false
  end), "CSS hex colors are not highlighted")
  assert(not deprecated_call, deprecated_call)
end)
vim.deprecate = deprecate
if not ok then io.stderr:write(tostring(err) .. "\n") end
print(ok and "Colorizer check passed" or "Colorizer check failed")
vim.cmd(ok and "qa!" or "cquit 1")
