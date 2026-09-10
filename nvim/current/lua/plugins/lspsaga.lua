return {
  {
    "nvimdev/lspsaga.nvim",
    event = "LspAttach",
    dependencies = {
      "nvim-tree/nvim-web-devicons",
      "nvim-treesitter/nvim-treesitter",
    },
    opts = {
      finder = {
        methods = { tyd = "textDocument/typeDefinition" },
      },
    },
    keys = {
      { "<leader>lf", "<cmd>Lspsaga finder<cr>", desc = "Finder: references + implementations" },
      { "<leader>la", "<cmd>Lspsaga finder ref+imp+def+tyd<cr>", desc = "Finder: all" },
      { "<leader>ld", "<cmd>Lspsaga finder def<cr>", desc = "Finder: definitions" },
      { "<leader>lt", "<cmd>Lspsaga finder tyd<cr>", desc = "Finder: type definitions" },
      { "<leader>lci", "<cmd>Lspsaga incoming_calls<cr>", desc = "Incoming calls" },
      { "<leader>lco", "<cmd>Lspsaga outgoing_calls<cr>", desc = "Outgoing calls" },
    },
  },
}
