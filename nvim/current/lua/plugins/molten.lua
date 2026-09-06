-- ch.10: Jupyter via molten + jupytext + image
return {
  {
    "benlubas/molten-nvim",
    version = "^1.0.0",
    build = ":UpdateRemotePlugins",
    dependencies = { "3rd/image.nvim" },
    init = function()
      vim.g.molten_image_provider = "image.nvim"
      vim.g.molten_output_win_max_height = 20
      vim.g.molten_virt_text_output = true
      vim.g.molten_output_virt_lines = true
      vim.g.molten_auto_open_output = false
      vim.g.molten_save_path = vim.fn.stdpath("data") .. "/molten"
    end,
    keys = {
      { "<leader>ji", ":MoltenInit<cr>", desc = "Init Jupyter kernel", silent = true },
      { "<leader>jl", ":MoltenEvaluateLine<cr>", desc = "Run line", silent = true },
      { "<leader>jv", ":<C-u>MoltenEvaluateVisual<cr>gv", mode = "v", desc = "Run selection", silent = true },
      { "<leader>jc", ":MoltenReevaluateCell<cr>", desc = "Re-run cell", silent = true },
      { "<leader>jm", ":MoltenEvaluateOperator<cr>", desc = "Molten operator (e.g. jmip = paragraph)", silent = true },
      { "<leader>jo", ":MoltenShowOutput<cr>", desc = "Show output float", silent = true },
      { "<leader>jh", ":MoltenHideOutput<cr>", desc = "Hide output", silent = true },
      { "<leader>jD", ":MoltenDeinit<cr>", desc = "Deinit kernel", silent = true },
      { "<leader>jI", ":MoltenImagePopup<cr>", desc = "Show image popup", silent = true },
    },
  },
  {
    "3rd/image.nvim",
    opts = {
      backend = "kitty",   -- see ch.10.8 matrix; use "ueberzug" on plain X11
      max_height_window_percentage = 50,
    },
  },
  {
    "GCBallesteros/jupytext.nvim",
    lazy = false,
    opts = {
      style = "markdown",
      output_extension = "md",
      force_ft = "markdown",
    },
  },
}
