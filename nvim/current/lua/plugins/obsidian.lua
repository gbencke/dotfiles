return {
  {
    "obsidian-nvim/obsidian.nvim",
    version = "*",
    ft = "markdown",
    cmd = "Obsidian",
    keys = {
      { "<leader>nn", "<cmd>Obsidian new<cr>", desc = "New note" },
      { "<leader>nf", "<cmd>Obsidian quick_switch<cr>", desc = "Find note" },
      { "<leader>ns", "<cmd>Obsidian search<cr>", desc = "Search notes" },
      { "<leader>nt", "<cmd>Obsidian today<cr>", desc = "Today's note" },
      { "<leader>nb", "<cmd>Obsidian backlinks<cr>", desc = "Note backlinks" },
      { "<leader>no", "<cmd>Obsidian open<cr>", desc = "Open in Obsidian" },
      { "<leader>nw", "<cmd>Obsidian workspace<cr>", desc = "Switch vault" },
    },
    opts = {
      legacy_commands = false,
      picker = { name = "snacks.picker" },
      workspaces = {
        { name = "journal", path = "~/gitjournal" },
        { name = "obsidian-scripts", path = "~/git/331.obsidian-scripts" },
        { name = "agentic-job-scrapper", path = "~/git/362.agentic-job-scrapper" },
      },
    },
  },
}
