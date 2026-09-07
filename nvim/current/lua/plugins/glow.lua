-- Markdown preview powered by the glow CLI
return {
  {
    "ellisonleao/glow.nvim",
    cmd = "Glow",
    keys = { { "<leader>mp", "<cmd>Glow<cr>", desc = "Markdown preview" } },
    opts = {
      border = "rounded",
      width = 9999,
      height = 9999,
      width_ratio = 1,
      height_ratio = 1,
    },
  },
}
