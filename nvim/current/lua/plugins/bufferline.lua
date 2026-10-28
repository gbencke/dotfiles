return {
  {
    "akinsho/bufferline.nvim",
    version = "*",
    event = "VeryLazy",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    init = function() vim.opt.termguicolors = true end,
    opts = function()
      -- Inactive/visible tabs dim diagnostic names by default; keep them red/yellow like the selected tab.
      local highlights = {}
      for kind, group in pairs({ error = "DiagnosticError", warning = "DiagnosticWarn" }) do
        for _, suffix in ipairs({ "", "_visible", "_diagnostic", "_diagnostic_visible" }) do
          highlights[kind .. suffix] = { fg = { attribute = "fg", highlight = group } }
        end
      end
      return {
        highlights = highlights,
        options = {
          -- Color the tab name by its worst LSP diagnostic (eslint, vtsls...): red error, yellow warning.
          diagnostics = "nvim_lsp",
          close_command = function(bufnr) Snacks.bufdelete(bufnr) end,
          right_mouse_command = function(bufnr) Snacks.bufdelete(bufnr) end,
          offsets = {
            { filetype = "neo-tree", text = "Files", highlight = "Directory", separator = true },
          },
        },
      }
    end,
  },
}
