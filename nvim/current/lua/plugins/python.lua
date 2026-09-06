-- ch.8.2: interactive venv selection
return {
  {
    "linux-cultist/venv-selector.nvim",
    branch = "regexp",
    dependencies = { "neovim/nvim-lspconfig" },
    ft = "python",
    keys = {
      { "<leader>pv", "<cmd>VenvSelect<cr>", desc = "Select Python venv" },
    },
    opts = {},
  },
}
