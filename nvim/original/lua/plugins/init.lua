return {
  {
    "https://github.com/nvim-neo-tree/neo-tree.nvim",
    lazy=false,
    branch = "v3.x",
    dependencies = {
      "https://github.com/nvim-lua/plenary.nvim",
      "https://github.com/nvim-tree/nvim-web-devicons", -- not strictly required, but recommended
      "https://github.com/MunifTanjim/nui.nvim",
    }
  },
  {
    "https://github.com/nvim-tree/nvim-web-devicons",
    lazy=false
  },
  {
    "stevearc/conform.nvim",
    config = function()
      require "configs.conform"
    end,
  },
  {
    "https://github.com/nvim-telescope/telescope.nvim", 
    lazy=false,
    tag = '0.1.8',
    dependencies = {
      "https://github.com/nvim-lua/plenary.nvim"
    }
  },
  {
    "https://github.com/lukas-reineke/indent-blankline.nvim",
    lazy=false
  },
  {
    "https://github.com/voldikss/vim-floaterm",
    lazy=false
  },
  {
    'https://github.com/goolord/alpha-nvim',
    lazy=false,
    dependencies = { 'https://github.com/nvim-tree/nvim-web-devicons' },
    config = function ()
      require'alpha'.setup(require'alpha.themes.startify'.config)
    end
  },
  {
    "neovim/nvim-lspconfig",
    config = function()
      require("nvchad.configs.lspconfig").defaults()
      require "configs.lspconfig"
    end,
  },
  {
    "williamboman/mason.nvim",
 	  opts = {
      ensure_installed = {
        "lua-language-server", "stylua",
        "html-lsp", "css-lsp" , "prettier"
      }
    }
  },
  {
    "nvim-treesitter/nvim-treesitter",
    opts = {
      ensure_installed = {
        "vim", "lua", "vimdoc",
        "html", "css"
      },
    },
  },
  {
    "https://github.com/tpope/vim-fugitive",
    lazy=false
  },
  {
    "https://github.com/lewis6991/gitsigns.nvim",
    lazy=false
  }
}
