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
