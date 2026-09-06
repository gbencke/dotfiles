-- lua/config/options.lua — baseline options + leader + diagnostics (ch.3, ch.4)
vim.g.mapleader = " "
vim.g.maplocalleader = ","

local o = vim.opt

-- Line numbers / gutter
o.number = true
o.relativenumber = true
o.signcolumn = "yes"

-- Splits
o.splitright = true
o.splitbelow = true

-- Clipboard
o.clipboard = "unnamedplus"

-- Persistent undo (≈ JetBrains Local History essentials)
o.undofile = true

-- Search
o.ignorecase = true
o.smartcase = true
o.inccommand = "split"

-- Editing feel
o.expandtab = true
o.shiftwidth = 2
o.tabstop = 2
o.smartindent = true
o.wrap = false
o.scrolloff = 8
o.sidescrolloff = 8
o.cursorline = true

-- Files & performance
o.swapfile = false
o.updatetime = 250
o.timeoutlen = 400

-- ripgrep for :grep
o.grepprg = "rg --vimgrep --smart-case"
o.grepformat = "%f:%l:%c:%m"

-- Folding via treesitter
o.foldmethod = "expr"
o.foldexpr = "v:lua.vim.treesitter.foldexpr()"
o.foldlevel = 99

-- Diagnostics (ch.4.6)
vim.diagnostic.config({
  severity_sort = true,
  signs = {
    text = {
      [vim.diagnostic.severity.ERROR] = "",
      [vim.diagnostic.severity.WARN]  = "",
      [vim.diagnostic.severity.HINT]  = "",
      [vim.diagnostic.severity.INFO]  = "",
    },
  },
  virtual_text = { spacing = 2, source = "if_many" },
  underline = true,
  update_in_insert = false,
  float = { border = "rounded", source = true },
})
