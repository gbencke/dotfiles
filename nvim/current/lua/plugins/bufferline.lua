return {
  {
    "akinsho/bufferline.nvim",
    version = "*",
    event = "VeryLazy",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    init = function() vim.opt.termguicolors = true end,
    opts = {
      options = {
        close_command = function(bufnr) Snacks.bufdelete(bufnr) end,
        right_mouse_command = function(bufnr) Snacks.bufdelete(bufnr) end,
        offsets = {
          { filetype = "neo-tree", text = "Files", highlight = "Directory", separator = true },
        },
      },
    },
  },
}
