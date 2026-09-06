-- lua/config/autocmds.lua — QoL autocmds + LspAttach + save pipelines (ch.3, 4, 9, 13, 19)
local augroup = vim.api.nvim_create_augroup("UserConfig", { clear = true })

-- Flash yanked text
vim.api.nvim_create_autocmd("TextYankPost", {
  group = augroup,
  callback = function() vim.hl.on_yank({ timeout = 150 }) end,
})

-- Restore cursor position
vim.api.nvim_create_autocmd("BufReadPost", {
  group = augroup,
  callback = function()
    local mark = vim.api.nvim_buf_get_mark(0, '"')
    if mark[1] > 0 and mark[1] <= vim.api.nvim_buf_line_count(0) then
      pcall(vim.api.nvim_win_set_cursor, 0, mark)
    end
  end,
})

-- Close tool windows with q
vim.api.nvim_create_autocmd("FileType", {
  group = augroup,
  pattern = { "help", "qf", "lspinfo", "checkhealth", "man" },
  callback = function(event)
    vim.bo[event.buf].buflisted = false
    vim.keymap.set("n", "q", ":close<CR>", { buffer = event.buf, silent = true })
  end,
})

-- Equalize splits on resize
vim.api.nvim_create_autocmd("VimResized", {
  group = augroup,
  callback = function() vim.cmd("tabdo wincmd =") end,
})

-- gitcommit: start in insert at line 1
vim.api.nvim_create_autocmd("FileType", {
  group = augroup,
  pattern = { "gitcommit", "gitrebase" },
  callback = function()
    vim.cmd("normal! gg")
    if vim.fn.getline(1) == "" then vim.cmd("startinsert") end
  end,
})

-- Don't auto-continue comments
vim.api.nvim_create_autocmd("FileType", {
  group = augroup,
  callback = function() vim.opt_local.formatoptions:remove({ "c", "r", "o" }) end,
})

-- Terminal buffers (ch.19.9)
vim.api.nvim_create_autocmd("TermOpen", {
  group = augroup,
  callback = function()
    vim.opt_local.number = false
    vim.opt_local.relativenumber = false
    vim.opt_local.signcolumn = "no"
    vim.cmd("startinsert")
  end,
})

-- LspAttach: buffer-local LSP maps (ch.4.5). Navigation maps (gd/gr/gi/gy) are
-- owned by the snacks picker (plugins/snacks.lua) per ch.20; raw fallbacks: vim.lsp.buf.*
vim.api.nvim_create_autocmd("LspAttach", {
  group = augroup,
  callback = function(event)
    local map = function(keys, fn, desc, mode)
      vim.keymap.set(mode or "n", keys, fn, { buffer = event.buf, desc = "LSP: " .. desc })
    end

    map("K", vim.lsp.buf.hover, "Hover docs")
    map("gD", vim.lsp.buf.declaration, "Goto declaration")
    map("<leader>cr", vim.lsp.buf.rename, "Rename symbol")
    map("<leader>ca", vim.lsp.buf.code_action, "Code action", { "n", "v" })
    map("<leader>cf", function() require("conform").format({ async = true }) end, "Format")
    map("<leader>ci", function()
      vim.lsp.buf.code_action({ context = { only = { "source.organizeImports" } }, apply = true })
    end, "Organize imports")

    local client = vim.lsp.get_client_by_id(event.data.client_id)
    if client and client:supports_method("textDocument/inlayHint") then
      map("<leader>ch", function()
        vim.lsp.inlay_hint.enable(not vim.lsp.inlay_hint.is_enabled({ bufnr = event.buf }), { bufnr = event.buf })
      end, "Toggle inlay hints")
    end
  end,
})

-- Python save pipeline: ruff fixAll + organizeImports, then format (ch.9.3)
local ruff_group = vim.api.nvim_create_augroup("RuffOnSave", { clear = true })
vim.api.nvim_create_autocmd("LspAttach", {
  group = ruff_group,
  callback = function(event)
    local client = vim.lsp.get_client_by_id(event.data.client_id)
    if not client or client.name ~= "ruff" then return end
    vim.api.nvim_create_autocmd("BufWritePre", {
      group = ruff_group,
      buffer = event.buf,
      callback = function()
        vim.lsp.buf.code_action({
          context = { only = { "source.fixAll.ruff", "source.organizeImports.ruff" }, diagnostics = {} },
          apply = true,
        })
        require("conform").format({ bufnr = event.buf, lsp_format = "fallback" })
      end,
    })
  end,
})

-- Web save pipeline: eslint fixAll on save (ch.13.1)
local eslint_group = vim.api.nvim_create_augroup("EslintOnSave", { clear = true })
vim.api.nvim_create_autocmd("LspAttach", {
  group = eslint_group,
  callback = function(event)
    local client = vim.lsp.get_client_by_id(event.data.client_id)
    if not client or client.name ~= "eslint" then return end
    vim.api.nvim_create_autocmd("BufWritePre", {
      group = eslint_group,
      buffer = event.buf,
      callback = function()
        vim.lsp.buf.code_action({
          context = { only = { "source.fixAll.eslint" }, diagnostics = {} },
          apply = true,
        })
      end,
    })
  end,
})
