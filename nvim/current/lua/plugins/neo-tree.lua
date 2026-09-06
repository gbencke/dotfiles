return {
  {
    "nvim-neo-tree/neo-tree.nvim",
    branch = "v3.x",
    lazy = false,
    dependencies = {
      "nvim-lua/plenary.nvim",
      "MunifTanjim/nui.nvim",
      "nvim-tree/nvim-web-devicons",
    },
    keys = {
      { "<leader>e", "<cmd>Neotree toggle<cr>", desc = "Toggle file tree" },
    },
    opts = {},
    init = function()
      vim.g.loaded_netrw = 1
      vim.g.loaded_netrwPlugin = 1
      -- UIEnter opens the sidebar on startup without affecting headless commands.
      vim.api.nvim_create_autocmd("UIEnter", {
        group = vim.api.nvim_create_augroup("NeoTreeStartup", { clear = true }),
        once = true,
        callback = vim.schedule_wrap(function()
          require("neo-tree.command").execute({ action = "show" })
        end),
      })
    end,
  },
}
