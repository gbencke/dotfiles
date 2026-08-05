require("nvchad.configs.lspconfig").defaults()

-- ruff owns lint/format/import-sorting; basedpyright owns types and hover.
-- Without this both answer hover and you get duplicated popups.
vim.lsp.config("ruff", {
  on_attach = function(client)
    client.server_capabilities.hoverProvider = false
  end,
})

vim.lsp.config("basedpyright", {
  settings = {
    basedpyright = {
      analysis = {
        typeCheckingMode = "standard",
        diagnosticSeverityOverrides = { reportMissingImports = "warning" },
      },
      -- ruff does this, and better
      disableOrganizeImports = true,
    },
  },
})

vim.lsp.enable {
  "html",
  "cssls",
  "jsonls",
  -- typescript / javascript
  "vtsls",
  "eslint",
  -- python
  "ruff",
  "basedpyright",
}

-- read :h vim.lsp.config for changing options of lsp servers
