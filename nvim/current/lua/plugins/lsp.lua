-- ch.4: LSP architecture (0.11 native) + mason + capabilities (ch.5.3)
return {
  {
    "neovim/nvim-lspconfig",
    init = function()
      vim.lsp.config("*", {
        capabilities = require("blink.cmp").get_lsp_capabilities(),
      })
    end,
  },
  {
    "mason-org/mason-lspconfig.nvim",
    dependencies = { "mason-org/mason.nvim" },
    opts = {
      ensure_installed = {
        "basedpyright", "ruff",
        "vtsls", "eslint", "tailwindcss", "cssls", "jsonls", "yamlls", "emmet_ls",
        "vue_ls",
        "lua_ls", "bashls", "dockerls",
      },
      automatic_enable = true,
    },
  },
  { "mason-org/mason.nvim", opts = {} },
  { "b0o/schemastore.nvim", lazy = true },
}
