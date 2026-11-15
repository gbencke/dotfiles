-- Run: nvim --headless -i NONE -c 'luafile tests/lean.lua'
-- Checks the Lean menu, buffer-local shortcuts, and live proof-state tools.
local temp = vim.fn.tempname() .. ".lean"
local ok, err = pcall(function()
  vim.v.errmsg = ""
  local expected = {
    i = "LeanInfoviewToggle",
    g = "LeanGoal",
    t = "LeanTermGoal",
    f = "LeanGotoInfoview",
    p = "LeanInfoviewAddPin",
    c = "LeanInfoviewClearPins",
    P = "LeanInfoviewPinTogglePause",
    r = "LeanRestartFile",
  }
  local doc = table.concat(vim.fn.readfile("CHEATSHEET.md"), "\n")
  local groups = dofile("lua/plugins/which-key.lua")[1].opts.spec
  assert(vim.g.mapleader == " ", "Leader must remain Space")
  for prefix, label in pairs({ L = "lean", l = "lsp" }) do
    assert(
      vim.iter(groups):any(function(group)
        return group[1] == "<leader>" .. prefix and group.group == label
      end),
      "Missing which-key group: " .. label
    )
  end

  for key in pairs(expected) do
    assert(vim.fn.maparg(" L" .. key, "n") == "", "Lean shortcut leaked into a non-Lean buffer")
  end
  vim.fn.writefile({
    "def lean_menu_number : Nat := 37",
    "",
    "example (n : Nat) : n = n := by",
    "  skip",
    "  rfl",
  }, temp)
  vim.cmd.edit(vim.fn.fnameescape(temp))
  local source = vim.api.nvim_get_current_win()
  local buf = vim.api.nvim_get_current_buf()
  assert(vim.bo.filetype == "lean", "Lean filetype was not detected")
  assert(vim.fn.maparg(",i", "n") ~= "", "Lean suggested mappings were not configured")
  for key, command in pairs(expected) do
    local mapping = vim.fn.maparg(" L" .. key, "n", false, true)
    assert(mapping.buffer == 1, "Lean mapping is not buffer-local: " .. key)
    assert(mapping.rhs == "<cmd>" .. command .. "<cr>", "Wrong Lean command: " .. key)
    assert(vim.fn.exists(":" .. command) == 2, "Missing command: " .. command)
    assert(doc:find("`<leader>L" .. key .. "`", 1, true), "Shortcut is not documented: " .. key)
    assert(doc:find("`:" .. command .. "`", 1, true), "Command is not documented: " .. command)
  end

  assert(
    vim.wait(10000, function()
      local client = require("lean.lsp").client_for(buf)
      return client and client.initialized
    end),
    "Lean language server did not attach"
  )
  vim.api.nvim_win_set_cursor(source, { 4, 2 })
  local client = require("lean.lsp").client_for(buf)
  local params = vim.lsp.util.make_position_params(source, client.offset_encoding)
  local response = client:request_sync("$/lean/plainGoal", params, 10000, buf)
  assert(response and not response.err, "Lean did not return a proof state")
  assert(response.result and response.result.rendered:find("n = n", 1, true), "Unexpected proof goal")

  local function press(key)
    vim.api.nvim_set_current_win(source)
    vim.api.nvim_feedkeys(" L" .. key, "x", false)
  end
  local function info_windows()
    return vim.tbl_filter(function(win)
      return vim.bo[vim.api.nvim_win_get_buf(win)].filetype == "leaninfo"
    end, vim.api.nvim_list_wins())
  end
  assert(
    vim.wait(3000, function()
      return #info_windows() == 1
    end),
    "Infoview did not open"
  )
  press("i")
  assert(#info_windows() == 0, "Toggle did not close the infoview")
  press("i")
  assert(#info_windows() == 1, "Toggle did not reopen the infoview")
  press("p")
  assert(#info_windows() == 2, "Pin did not open a comparison window")
  -- Clear immediately to catch updates that still reference a deleted pin.
  press("c")
  assert(#info_windows() == 1, "Clear pins did not close the comparison window")
  press("P")
  press("P")
  press("f")
  assert(vim.bo.filetype == "leaninfo", "Focus did not enter the infoview")

  local function popup(key, text)
    local found
    press(key)
    assert(
      vim.wait(3000, function()
        for _, win in ipairs(vim.api.nvim_list_wins()) do
          if vim.api.nvim_win_get_config(win).relative ~= "" then
            local lines = vim.api.nvim_buf_get_lines(vim.api.nvim_win_get_buf(win), 0, -1, false)
            if table.concat(lines, "\n"):find(text, 1, true) then
              found = win
              return true
            end
          end
        end
        return false
      end),
      "Missing Lean popup: " .. text
    )
    vim.api.nvim_win_close(found, true)
  end
  popup("g", "⊢ n = n")
  vim.api.nvim_win_set_cursor(source, { 1, ("def lean_menu_number : Nat := "):len() })
  popup("t", "⊢ Nat")
  press("r")

  vim.cmd.enew()
  vim.bo.filetype = "text"
  for key in pairs(expected) do
    assert(vim.fn.maparg(" L" .. key, "n") == "", "Lean shortcut leaked into a new text buffer")
  end
  assert(vim.v.errmsg == "", vim.v.errmsg)
end)
vim.fn.delete(temp)
if not ok then
  io.stderr:write(tostring(err) .. "\n")
end
print(ok and "Lean menu checks passed" or "Lean menu checks failed")
vim.cmd(ok and "qa!" or "cquit 1")
