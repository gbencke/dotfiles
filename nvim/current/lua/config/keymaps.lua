-- lua/config/keymaps.lua — global (pluginless) maps only (ch.3, ch.19)
local map = vim.keymap.set

-- Window navigation
map("n", "<C-h>", "<C-w>h", { desc = "Window left" })
map("n", "<C-j>", "<C-w>j", { desc = "Window down" })
map("n", "<C-k>", "<C-w>k", { desc = "Window up" })
map("n", "<C-l>", "<C-w>l", { desc = "Window right" })

-- Resize
map("n", "<C-Up>", ":resize +2<CR>", { silent = true })
map("n", "<C-Down>", ":resize -2<CR>", { silent = true })
map("n", "<C-Left>", ":vertical resize -2<CR>", { silent = true })
map("n", "<C-Right>", ":vertical resize +2<CR>", { silent = true })

-- Buffers
map("n", "]b", ":bnext<CR>", { silent = true, desc = "Next buffer" })
map("n", "[b", ":bprevious<CR>", { silent = true, desc = "Prev buffer" })
map("n", "<leader>bn", ":bnext<CR>", { silent = true, desc = "Next buffer" })
map("n", "<leader>bp", ":bprevious<CR>", { silent = true, desc = "Prev buffer" })
map("n", "<leader>bd", ":bdelete<CR>", { silent = true, desc = "Delete buffer" })

-- Copy file/project information and enclosing symbol names to the system clipboard.
local function file_path()
  if vim.bo.buftype ~= "" then return "" end
  local path = vim.api.nvim_buf_get_name(0)
  return vim.fn.isdirectory(path) == 0 and path or ""
end

local function symbol_name(kind)
  local types = kind == "class"
    and { "class", "class_declaration", "class_definition" }
    or { "function_declaration", "function_definition", "method_definition", "method_declaration",
      "function_expression", "arrow_function", "generator_function", "generator_function_declaration", "lambda" }
  local parser = vim.treesitter.get_parser(0)
  if not parser then return end
  local row = vim.api.nvim_win_get_cursor(0)[1]
  parser:parse({ row - 1, row })
  local node = vim.treesitter.get_node({ ignore_injections = false })
  while node do
    -- Include the binding name when the cursor is on `run` in `const run = () => ...`.
    local value = node:field("value")[1] or node:field("right")[1]
    if value and vim.tbl_contains(types, value:type()) then node = value end
    if vim.tbl_contains(types, node:type()) then
      local name = node:field("name")[1]
      local parent = node:parent()
      -- Named expressions: const run = () => ..., { run: () => ... }, etc.
      if not name and parent
        and (parent:field("value")[1] == node or parent:field("right")[1] == node) then
        name = parent:field("name")[1] or parent:field("key")[1] or parent:field("left")[1]
      end
      return name and vim.treesitter.get_node_text(name, 0)
    end
    node = node:parent()
  end
end

local function copy_map(key, label, get_value)
  map("n", "<leader>y" .. key, function()
    local ok, value = pcall(get_value)
    if not ok then
      vim.notify("Cannot copy " .. label .. ": " .. tostring(value), vim.log.levels.WARN)
      return
    end
    if not value or value == "" then
      vim.notify("No " .. label .. " here", vim.log.levels.WARN)
      return
    end
    if vim.fn.has("clipboard") == 0 then
      vim.notify("No clipboard provider. Install xclip or wl-clipboard, then restart Neovim.", vim.log.levels.WARN)
      return
    end
    vim.fn.setreg("+", value, "v")
    vim.notify("Copied: " .. value)
  end, { desc = "Copy " .. label })
end

copy_map("F", "file name", function() return vim.fn.fnamemodify(file_path(), ":t") end)
copy_map("P", "absolute file path", file_path)
copy_map("C", "class name", function() return symbol_name("class") end)
copy_map("M", "method/function name", function() return symbol_name("function") end)
copy_map("R", "repository root", function() return vim.fs.root(0, ".git") end)

-- Clear search highlight
map("n", "<Esc>", ":nohlsearch<CR>", { silent = true })

-- Move lines (Alt+Shift+Up/Down in JetBrains)
map("v", "J", ":m '>+1<CR>gv=gv", { silent = true, desc = "Move selection down" })
map("v", "K", ":m '<-2<CR>gv=gv", { silent = true, desc = "Move selection up" })

-- Centered search jumps
map("n", "n", "nzzzv")
map("n", "N", "Nzzzv")

-- Diagnostics (F2 in JetBrains)
map("n", "]d", function() vim.diagnostic.jump({ count = 1 }) end, { desc = "Next diagnostic" })
map("n", "[d", function() vim.diagnostic.jump({ count = -1 }) end, { desc = "Prev diagnostic" })

-- Terminal-mode ergonomics (ch.19.9)
map("t", "<C-]>", [[<C-\><C-n>]], { desc = "Exit terminal mode" })
map("t", "<C-h>", [[<C-\><C-n><C-w>h]], { desc = "Window left (terminal)" })
map("t", "<C-j>", [[<C-\><C-n><C-w>j]], { desc = "Window down (terminal)" })
map("t", "<C-k>", [[<C-\><C-n><C-w>k]], { desc = "Window up (terminal)" })
map("t", "<C-l>", [[<C-\><C-n><C-w>l]], { desc = "Window right (terminal)" })
