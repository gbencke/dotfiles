-- ch.19: overseer task runner (package.json scripts, Makefile, tasks.json)
return {
  { "stevearc/overseer.nvim",
    cmd = { "OverseerRun", "OverseerToggle" },
    keys = {
      { "<leader>or", "<cmd>OverseerRun<cr>", desc = "Run task" },
      { "<leader>ot", "<cmd>OverseerToggle<cr>", desc = "Task list" },
      { "<leader>oa", "<cmd>OverseerQuickAction<cr>", desc = "Task action (restart/watch)" },
    },
    opts = {} },
  -- optional remote dev (ch.19.3 option 2) — uncomment to adopt:
  -- { "amitds1997/remote-nvim.nvim",
  --   dependencies = { "nvim-lua/plenary.nvim", "MunifTanjim/nui.nvim", "nvim-telescope/telescope.nvim" },
  --   cmd = { "RemoteStart", "RemoteInfo", "RemoteCleanup", "RemoteConfigSync" },
  --   opts = {} },
}
