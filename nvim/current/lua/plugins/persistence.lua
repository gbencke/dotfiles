-- ch.20.4: per-directory sessions (recent projects)
return {
  { "folke/persistence.nvim",
    event = "BufReadPre",
    opts = {},
    keys = {
      { "<leader>qs", function() require("persistence").load() end, desc = "Restore session (cwd)" },
      { "<leader>ql", function() require("persistence").load({ last = true }) end, desc = "Restore last session" },
      { "<leader>qd", function() require("persistence").stop() end, desc = "Don't save this session" },
      { "<leader>qp", function() require("persistence").select() end, desc = "Pick session (recent projects)" },
    } },
}
