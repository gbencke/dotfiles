-- ch.3: treesitter (pinned master) + textobjects
return {
  {
    "nvim-treesitter/nvim-treesitter",
    branch = "master",
    build = ":TSUpdate",
    event = { "BufReadPost", "BufNewFile" },
    opts = {
      ensure_installed = {
        "lua", "vim", "vimdoc", "query",
        "python",
        "javascript", "typescript", "tsx", "vue", "svelte",
        "html", "css", "scss", "json", "jsonc", "yaml", "toml",
        "markdown", "markdown_inline", "regex", "bash",
        "sql", "graphql", "dockerfile", "gitcommit", "diff",
      },
      auto_install = true,
      highlight = { enable = true },
      indent = { enable = true },
      incremental_selection = {
        enable = true,
        keymaps = {
          init_selection = "<C-space>",
          node_incremental = "<C-space>",
          node_decremental = "<BS>",
          scope_incremental = false,
        },
      },
    },
    config = function(_, opts)
      require("nvim-treesitter.configs").setup(opts)
    end,
  },
  {
    "nvim-treesitter/nvim-treesitter-textobjects",
    branch = "master",
    dependencies = "nvim-treesitter/nvim-treesitter",
    opts = {
      textobjects = {
        select = {
          enable = true,
          lookahead = true,
          keymaps = {
            ["af"] = "@function.outer", ["if"] = "@function.inner",
            ["ac"] = "@class.outer",    ["ic"] = "@class.inner",
            ["aa"] = "@parameter.outer",["ia"] = "@parameter.inner",
            ["al"] = "@loop.outer",     ["il"] = "@loop.inner",
          },
        },
        move = {
          enable = true,
          set_jumps = true,
          goto_next_start = { ["]m"] = "@function.outer", ["]]"] = "@class.outer" },
          goto_previous_start = { ["[m"] = "@function.outer", ["[["] = "@class.outer" },
        },
        swap = {
          enable = true,
          swap_next = { ["<leader>sn"] = "@parameter.inner" },
          swap_previous = { ["<leader>sp"] = "@parameter.inner" },
        },
      },
    },
    config = function(_, opts)
      require("nvim-treesitter.configs").setup(opts)
    end,
  },
}
