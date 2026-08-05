return {
  {
    'https://github.com/goolord/alpha-nvim',
    lazy=false,
    dependencies = { 'https://github.com/nvim-tree/nvim-web-devicons' },
    config = function ()
      require'alpha'.setup(require'alpha.themes.startify'.config)
    end
  },
  {
    "stevearc/conform.nvim",
    event = "BufWritePre",
    cmd = "ConformInfo",
    opts = require "configs.conform"
  },

  -- Without this spec, lua/configs/lspconfig.lua is never loaded and only
  -- NvChad's built-in lua_ls is enabled.
  {
    "neovim/nvim-lspconfig",
    config = function()
      require "configs.lspconfig"
    end,
  },

  -- NvChad sets PATH = "skip", which hides Mason binaries from Neovim.
  -- Without this, mason-installed servers/formatters are never found.
  {
    "mason-org/mason.nvim",
    opts = function(_, opts)
      opts.PATH = "prepend"
      return opts
    end,
  },

  -- Telescope's default sorter is pure Lua and crawls on large repos.
  {
    "nvim-telescope/telescope.nvim",
    dependencies = {
      { "nvim-telescope/telescope-fzf-native.nvim", build = "make" },
    },
    opts = function(_, opts)
      opts.extensions_list = vim.list_extend(opts.extensions_list or {}, { "fzf" })
      return opts
    end,
  },

  {
    "nvim-treesitter/nvim-treesitter",
    -- lazy.nvim otherwise resolves this to `nvim-treesitter.setup()`, which
    -- takes no arguments and silently throws the options away.
    main = "nvim-treesitter.configs",
    init = function()
      -- Neovim 0.12 dropped the `all = false` match format: handlers now always
      -- receive `match[capture_id]` as a TSNode[] list. nvim-treesitter (master,
      -- EOL) still registers with `all = false` and indexes a bare node, which
      -- crashes injection parsing with "attempt to call method 'range'".
      -- Wrap registration so legacy handlers keep seeing single nodes.
      -- Remove once nvim-treesitter `main` replaces `master` here.
      local query = require "vim.treesitter.query"
      local function unwrap(handler)
        return function(match, ...)
          local single = {}
          for id, nodes in pairs(match) do
            single[id] = type(nodes) == "table" and nodes[1] or nodes
          end
          return handler(single, ...)
        end
      end
      for _, name in ipairs { "add_predicate", "add_directive" } do
        local add = query[name]
        query[name] = function(qname, handler, opts)
          if type(opts) == "table" and opts.all == false then
            handler = unwrap(handler)
          end
          return add(qname, handler, opts)
        end
      end
    end,
    opts = function(_, opts)
      opts.ensure_installed = vim.list_extend({
        "python", "toml",
        "typescript", "tsx", "javascript", "jsdoc",
        -- no "jsonc": upstream grammar repo no longer fetches
        "html", "css", "json", "yaml", "markdown", "markdown_inline",
        "bash", "diff", "git_rebase", "gitcommit", "regex",
      }, opts.ensure_installed or {})
      opts.highlight = { enable = true }
      opts.indent = { enable = true }
      return opts
    end,
  },
}
