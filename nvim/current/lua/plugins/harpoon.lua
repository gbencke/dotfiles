-- ch.20.12: pinned working-set files
return {
  { "ThePrimeagen/harpoon",
    branch = "harpoon2",
    dependencies = { "nvim-lua/plenary.nvim" },
    keys = {
      { "<leader>ha", function() require("harpoon"):list():add() end, desc = "Harpoon add" },
      { "<leader>hh", function() local h = require("harpoon") h.ui:toggle_quick_menu(h:list()) end, desc = "Harpoon menu" },
      { "<leader>1", function() require("harpoon"):list():select(1) end, desc = "Harpoon 1" },
      { "<leader>2", function() require("harpoon"):list():select(2) end, desc = "Harpoon 2" },
      { "<leader>3", function() require("harpoon"):list():select(3) end, desc = "Harpoon 3" },
      { "<leader>4", function() require("harpoon"):list():select(4) end, desc = "Harpoon 4" },
    },
    opts = { settings = { save_on_toggle = true, sync_on_ui_close = true } },
  },
}
