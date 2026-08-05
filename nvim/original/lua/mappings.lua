require "nvchad.mappings"

-- add yours here

local map = vim.keymap.set

map("n", ";", ":", { desc = "CMD enter command mode" })
map("i", "jk", "<ESC>")

-- code navigation (pickers NvChad ships but leaves unmapped)
map("n", "<leader>fs", "<cmd>Telescope lsp_document_symbols<CR>", { desc = "telescope symbols in file" })
map("n", "<leader>fS", "<cmd>Telescope lsp_dynamic_workspace_symbols<CR>", { desc = "telescope symbols in project" })
map("n", "<leader>fr", "<cmd>Telescope lsp_references<CR>", { desc = "telescope references" })
map("n", "<leader>fi", "<cmd>Telescope lsp_incoming_calls<CR>", { desc = "telescope who calls this" })
map("n", "<leader>fd", "<cmd>Telescope diagnostics<CR>", { desc = "telescope project diagnostics" })
map("n", "<leader>fW", "<cmd>Telescope grep_string<CR>", { desc = "telescope grep word under cursor" })
map("n", "<leader>fR", "<cmd>Telescope resume<CR>", { desc = "telescope resume last search" })

-- map({ "n", "i", "v" }, "<C-s>", "<cmd> w <cr>")
