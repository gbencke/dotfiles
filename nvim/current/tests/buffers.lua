-- Run: nvim --headless -i NONE -c 'luafile tests/buffers.lua'
local confirm = vim.fn.confirm
local ok, err = pcall(function()
  local current = vim.api.nvim_get_current_buf()
  vim.api.nvim_buf_set_lines(current, 0, -1, false, { "keep these unsaved changes" })
  local other = vim.api.nvim_create_buf(true, false)
  local modified = vim.api.nvim_create_buf(true, false)
  local unlisted = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(modified, 0, -1, false, { "do not discard" })
  vim.cmd("vsplit")
  vim.api.nvim_win_set_buf(0, other)
  vim.cmd("wincmd p")
  local windows = #vim.api.nvim_list_wins()
  local prompts = 0
  vim.fn.confirm = function()
    prompts = prompts + 1
    return 3 -- Cancel closing the modified buffer.
  end

  local mapping = vim.fn.maparg(vim.g.mapleader .. "bo", "n", false, true)
  assert(type(mapping.callback) == "function", "Missing close-other-buffers mapping")
  mapping.callback()

  assert(vim.api.nvim_get_current_buf() == current, "Current buffer changed")
  assert(vim.bo[current].buflisted and vim.bo[current].modified, "Current buffer was closed or saved")
  assert(not vim.bo[other].buflisted, "Other unmodified buffer remains open")
  assert(#vim.api.nvim_list_wins() == windows, "Window layout changed")
  assert(prompts == 1, "Unsaved buffer did not prompt before closing")
  assert(vim.bo[modified].buflisted, "Cancelled buffer was closed")
  assert(vim.api.nvim_buf_get_lines(modified, 0, -1, false)[1] == "do not discard", "Unsaved changes were lost")
  assert(vim.api.nvim_buf_is_valid(unlisted), "Unlisted utility buffer was deleted")
  assert(table.concat(vim.fn.readfile("CHEATSHEET.md"), "\n"):find("`<leader>bo`", 1, true),
    "Cheatsheet is missing close-other-buffers mapping")

  -- New buffer shows up in bufferline (listed), save-as renames it to the chosen file.
  local before = #vim.fn.getbufinfo({ buflisted = 1 })
  vim.api.nvim_feedkeys(vim.g.mapleader .. "bN", "x", false)
  assert(#vim.fn.getbufinfo({ buflisted = 1 }) == before + 1, "New buffer is not listed")
  local fresh = vim.api.nvim_get_current_buf()
  vim.api.nvim_buf_set_lines(fresh, 0, -1, false, { "saved" })
  local target = vim.fn.tempname() .. "/saved file.txt"
  vim.fn.mkdir(vim.fn.fnamemodify(target, ":h"), "p")
  local input = vim.ui.input
  vim.ui.input = function(_, on_confirm) on_confirm(target) end
  vim.fn.maparg(vim.g.mapleader .. "bs", "n", false, true).callback()
  vim.ui.input = input
  assert(vim.api.nvim_buf_get_name(fresh) == target, "Buffer was not renamed by save-as")
  assert(vim.fn.readfile(target)[1] == "saved", "Save-as did not write the file")
end)
vim.fn.confirm = confirm
if not ok then io.stderr:write(tostring(err) .. "\n") end
print(ok and "Close-other-buffers checks passed" or "Close-other-buffers checks failed")
vim.cmd(ok and "qa!" or "cquit 1")
