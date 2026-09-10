return {
  {
    "nvim-telescope/telescope.nvim",
    dependencies = { "nvim-lua/plenary.nvim" },
    keys = {
      { "<leader>fT", "<cmd>Telescope<cr>", desc = "Telescope pickers" },
    },
  },
}
