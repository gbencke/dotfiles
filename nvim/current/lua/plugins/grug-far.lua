-- ch.20.2: Replace in Path
return {
  {
    "MagicDuck/grug-far.nvim",
    cmd = { "GrugFar", "GrugFarWithin" },
    keys = {
      { "<leader>sr", function() require("grug-far").open() end, desc = "Search & replace" },
      { "<leader>sw", function() require("grug-far").open({ prefills = { search = vim.fn.expand("<cword>") } }) end, desc = "Replace word under cursor" },
      { "<leader>sw", function() require("grug-far").with_visual_selection() end, mode = "v", desc = "Replace selection" },
      { "<leader>sf", function() require("grug-far").open({ prefills = { paths = vim.fn.expand("%") } }) end, desc = "Replace in current file" },
      { "<leader>sa", function() require("grug-far").open({ engine = "astgrep" }) end, desc = "Structural replace (ast-grep)" },
    },
    opts = {},
  },
}
