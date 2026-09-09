-- ch.21.1: discoverability + group contract
return {
  { "folke/which-key.nvim",
    event = "VeryLazy",
    opts = {
      preset = "modern",
      spec = {
        { "<leader>f", group = "find" }, { "<leader>g", group = "git" },
        { "<leader>c", group = "code" }, { "<leader>d", group = "debug" },
        { "<leader>t", group = "test/terminal" }, { "<leader>s", group = "search/replace" },
        { "<leader>q", group = "session" }, { "<leader>b", group = "buffer" },
        { "<leader>x", group = "diagnostics" }, { "<leader>h", group = "harpoon" },
        { "<leader>D", group = "database" },
        { "<leader>R", group = "http" }, { "<leader>j", group = "jupyter" },
        { "<leader>o", group = "overseer" }, { "<leader>p", group = "python" },
        { "<leader>m", group = "markdown" }, { "<leader>n", group = "notes (obsidian)" },
      },
    },
    keys = { { "<leader>?", function() require("which-key").show({ global = false }) end, desc = "Buffer keymaps" } } },
}
