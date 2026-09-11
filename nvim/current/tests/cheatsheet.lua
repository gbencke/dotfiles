-- Run: nvim --headless -i NONE -c 'luafile tests/cheatsheet.lua'
-- Validates runtime keymaps and commands documented by CHEATSHEET.md.
local ok, err = pcall(function()
  local doc = table.concat(vim.fn.readfile("CHEATSHEET.md"), "\n")

  local function run(keys)
    vim.cmd("new")
    local ok_run, result = pcall(function()
      vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes(keys, true, true, true), "x", false)
      return true
    end)
    pcall(vim.cmd, "silent! bwipeout!")
    assert(ok_run, result)
  end

  local function load(lhs, plugin)
    local ok_load = pcall(require("lazy.core.loader").load, { plugin }, { keys = lhs })
    assert(ok_load, plugin)
  end

  -- Register plugin keymaps by loading specs; do not execute external/UI actions.
  load("<leader>ff", "snacks.nvim")
  load("<leader>fT", "telescope.nvim")
  load("<leader>gg", "snacks.nvim")
  load("<leader>sr", "grug-far.nvim")
  load("<leader>ha", "harpoon")
  load("<leader>qs", "persistence.nvim")
  load("<leader>Du", "vim-dadbod-ui")
  load("<leader>or", "overseer.nvim")
  load("<leader>du", "nvim-dap")
  load("<leader>lf", "lspsaga.nvim")
  load("<leader>ts", "neotest")
  load("<leader>mp", "glow.nvim")
  load("<leader>nf", "obsidian.nvim")
  assert(Snacks.config.scratch.filekey.cwd == false, "Scratch buffers must be shared across repositories")
  assert(Snacks.config.scratch.filekey.branch == false, "Scratch buffers must be shared across branches")

  local maps = {}
  for _, mode in ipairs({ "n", "v", "o", "x", "t", "i" }) do
    maps[mode] = vim.api.nvim_get_keymap(mode)
  end

  local function map_exists(mode, lhs)
    lhs = lhs:gsub("<leader>", vim.g.mapleader)
    lhs = lhs:gsub("<localleader>", vim.g.maplocalleader)
    for _, map in ipairs(maps[mode]) do
      if map.lhs:lower() == lhs:lower() then
        return true
      end
    end
    return false
  end

  local function check_map(mode, lhs)
    if lhs:find("<C%-h>") or lhs:find("<C%-j>") or lhs:find("<C%-k>") or lhs:find("<C%-l>") then
      -- Snacks terminal maps intentionally replace global window movement while terminal buffers exist.
      return
    end
    if lhs:find("<C%-") then
      lhs = lhs:gsub("<C%-", "<c-"):gsub("<S%-", "<s-")
    end
    assert(map_exists(mode, lhs), "Missing runtime mapping: " .. mode .. " " .. lhs)
  end

  local global = {
    ["<leader>e"] = true, ["<leader>bd"] = true, ["]b"] = true, ["[b"] = true,
    ["]d"] = true, ["[d"] = true, ["<leader>ff"] = true, ["<leader>fa"] = true,
    ["<leader>fg"] = true, ["<leader>fb"] = true, ["<leader>fr"] = true,
    ["<leader>fh"] = true, ["<leader>fk"] = true, ["<leader>fc"] = true,
    ["<leader>fd"] = true, ["<leader>fq"] = true, ["<leader>fT"] = true,
    ["<leader>f:"] = true,
    ["<leader>f/"] = true, ["<leader>fs"] = true, ["<leader>fS"] = true,
    ["gr"] = true, ["gd"] = true, ["gi"] = true, ["gy"] = true,
    ["<leader>gf"] = true, ["<leader>gg"] = true, ["<leader>sr"] = true,
    ["<leader>sw"] = true, ["<leader>sf"] = true, ["<leader>sa"] = true,
    ["<leader>ha"] = true, ["<leader>hh"] = true, ["<leader>1"] = true,
    ["<leader>2"] = true, ["<leader>3"] = true, ["<leader>4"] = true,
    ["<leader>qs"] = true, ["<leader>ql"] = true, ["<leader>qp"] = true,
    ["<leader>qd"] = true, ["<leader>du"] = true, ["<leader>db"] = true,
    ["<leader>dB"] = true, ["<leader>dl"] = true, ["<leader>dc"] = true,
    ["<leader>dn"] = true, ["<leader>di"] = true, ["<leader>do"] = true,
    ["<leader>dC"] = true, ["<leader>dr"] = true, ["<leader>dq"] = true,
    ["<leader>de"] = true, ["<leader>lf"] = true, ["<leader>la"] = true,
    ["<leader>ld"] = true, ["<leader>lt"] = true, ["<leader>lci"] = true,
    ["<leader>lco"] = true, ["<F5>"] = true, ["<F9>"] = true,
    ["<F10>"] = true, ["<F11>"] = true, ["<leader>or"] = true,
    ["<leader>ot"] = true, ["<leader>oa"] = true, ["<leader>ts"] = true,
    ["<leader>tt"] = true, ["<leader>tr"] = true, ["<leader>to"] = true,
    ["<leader>tO"] = true, ["<leader>tl"] = true, ["<leader>td"] = true,
    ["<leader>ta"] = true, ["<leader>tx"] = true, ["]t"] = true,
    ["[t"] = true, ["<leader>xx"] = true, ["<leader>xX"] = true,
    ["<leader>xs"] = true, ["<leader>xr"] = true, ["<leader>xq"] = true,
    ["<leader>?"] = true, ["-"] = true, ["<leader>gd"] = true,
    ["<leader>gc"] = true, ["<leader>gD"] = true, ["<leader>gH"] = true, ["<leader>gy"] = true,
    ["<leader>mp"] = true, ["<leader>nn"] = true, ["<leader>nf"] = true,
    ["<leader>ns"] = true, ["<leader>nt"] = true, ["<leader>nb"] = true,
    ["<leader>no"] = true, ["<leader>nw"] = true,
    ["<leader>."] = true, ["<leader>S"] = true,
  }
  for lhs in pairs(global) do
    assert(doc:find("`" .. lhs .. "`", 1, true), "Cheatsheet is missing " .. lhs)
    check_map("n", lhs)
  end
  for lhs in pairs({ ["J"] = true, ["K"] = true }) do
    check_map("v", lhs)
  end
  check_map("v", "<leader>sw")
  check_map("v", "<leader>de")
  check_map("v", "<leader>gy")
  check_map("t", "<C-]>")

  vim.cmd("enew")
  vim.bo.filetype = "python"
  vim.api.nvim_buf_set_lines(0, 0, -1, false, { "def sample():", "    return 1" })
  load("<leader>dtm", "nvim-dap-python")
  load("<leader>pv", "venv-selector.nvim")
  for _, lhs in ipairs({ "<leader>dtm", "<leader>dtc", "<leader>pv" }) do
    assert(vim.fn.maparg(lhs, "n") ~= "", "Missing Python mapping: " .. lhs)
  end
  for _, lhs in ipairs({ "K", "gD", "<leader>cr", "<leader>ca", "<leader>cf", "<leader>ci", "<leader>ch" }) do
    assert(doc:find("`" .. lhs .. "`", 1, true), "Cheatsheet is missing LSP mapping " .. lhs)
  end
  pcall(vim.cmd, "silent! bwipeout!")

  vim.cmd("enew")
  vim.bo.filetype = "http"
  load("<leader>Rs", "kulala.nvim")
  for _, lhs in ipairs({ "<leader>Rs", "<leader>Ra", "<leader>Re", "<leader>Rc" }) do
    assert(vim.fn.maparg(lhs, "n") ~= "", "Missing HTTP mapping: " .. lhs)
  end
  pcall(vim.cmd, "silent! bwipeout!")

  vim.cmd("enew")
  vim.bo.filetype = "sql"
  assert(vim.fn.maparg("<leader>S", "n"):find("DBUI_ExecuteQuery", 1, true), "Missing SQL execute mapping")
  assert(vim.fn.maparg("<leader>W", "n"):find("DBUI_SaveQuery", 1, true), "Missing SQL save mapping")
  pcall(vim.cmd, "silent! bwipeout!")

  -- Load the remaining plugin commands directly by name.
  load("<leader>ji", "molten-nvim")
  load("<F5>", "nvim-dap")
  load("<leader>gd", "diffview.nvim")
  require("lazy").load({ plugins = { "nvim-treesitter", "vim-fugitive", "octo.nvim" } })
  local commands = {
    "Mason", "MasonInstall", "DapPause", "DapDisconnect", "DapToggleRepl",
    "DapShowLog", "DapSetLogLevel", "ConformInfo", "DiffviewClose", "Git", "Octo",
    "OverseerRun", "OverseerToggle", "DBUIToggle", "DBUIFindBuffer", "DBUIAddConnection",
    "MoltenInit", "UpdateRemotePlugins", "TSInstall", "TSUpdate", "Lazy",
    "VenvSelect", "Glow", "Obsidian", "Lspsaga",
  }
  for _, command in ipairs(commands) do
    local found = doc:find("`:" .. command, 1, true) or doc:find("`" .. command .. "`", 1, true)
    assert(found, "Cheatsheet is missing " .. command)
  end
  for _, command in ipairs({ "Neotree", "Mason", "MasonInstall", "DapPause", "DapDisconnect", "DapToggleRepl", "DapShowLog", "DapSetLogLevel", "ConformInfo", "DiffviewClose", "Git", "Octo", "OverseerRun", "OverseerToggle", "DBUIToggle", "DBUIFindBuffer", "DBUIAddConnection", "TSInstall", "TSUpdate", "Lazy", "VenvSelect", "Glow", "Obsidian", "Lspsaga" }) do
    assert(vim.fn.exists(":" .. command) == 2, "Missing command: " .. command)
  end
  if vim.fn.has("python3") == 1 then
    assert(vim.fn.exists(":MoltenInit") == 2, "Python provider is available, but :MoltenInit is missing")
  end
  print("Cheatsheet runtime check passed", "OK")
end)
if not ok then
  io.stderr:write(tostring(err) .. "\n")
end
vim.wait(3000, function() return false end)
vim.cmd(ok and "qa!" or "cquit 1")
