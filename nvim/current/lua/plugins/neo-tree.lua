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
    opts = {
      filesystem = {
        components = {
          -- Color file/dir names by their worst diagnostic (eslint, vtsls...); stock name ignores them.
          name = function(config, node, state)
            local common = require("neo-tree.sources.common.components")
            local result = common.name(config, node, state)
            local diag = common.diagnostics({}, node, state)
            if diag.highlight then result.highlight = diag.highlight end
            return result
          end,
        },
        filtered_items = {
          hide_dotfiles = false,
          -- Include ignored dotfiles and their descendants, not unrelated ignored files.
          always_show_by_pattern = { ".*", "*/.*/*" },
        },
        -- Watch the filesystem so external moves/creates show up without a manual refresh.
        use_libuv_file_watcher = true,
      },
    },
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
