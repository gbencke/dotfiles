-- ch.20: snacks (picker, terminal, QoL modules)
return {
  {
    "folke/snacks.nvim",
    priority = 1000,
    lazy = false,
    opts = {
      picker = { enabled = true },
      terminal = { enabled = true },
      lazygit = { enabled = true },
      notifier = { enabled = true },
      bigfile = { enabled = true },
      quickfile = { enabled = true },
      statuscolumn = { enabled = true },
      words = { enabled = true },
      indent = { enabled = true },
      input = { enabled = true },
      bufdelete = { enabled = true },
    },
    keys = {
      -- Search Everywhere parity (ch.20.1)
      { "<leader>ff", function() Snacks.picker.files() end, desc = "Files" },
      { "<leader>fa", function() Snacks.picker.smart() end, desc = "Smart (frecency)" },
      { "<leader>fg", function() Snacks.picker.grep() end, desc = "Live grep" },
      { "<leader>fb", function() Snacks.picker.buffers() end, desc = "Buffers" },
      { "<leader>fr", function() Snacks.picker.recent() end, desc = "Recent files" },
      { "<leader>fh", function() Snacks.picker.help() end, desc = "Help tags" },
      { "<leader>fk", function() Snacks.picker.keymaps() end, desc = "Keymaps" },
      { "<leader>fc", function() Snacks.picker.commands() end, desc = "Commands" },
      { "<leader>fd", function() Snacks.picker.diagnostics() end, desc = "Diagnostics" },
      { "<leader>fq", function() Snacks.picker.qflist() end, desc = "Quickfix" },
      { "<leader>f:", function() Snacks.picker.command_history() end, desc = "Command history" },
      { "<leader>f/", function() Snacks.picker.search_history() end, desc = "Search history" },
      { "<leader>fs", function() Snacks.picker.lsp_symbols() end, desc = "Document symbols" },
      { "<leader>fS", function() Snacks.picker.lsp_workspace_symbols() end, desc = "Workspace symbols" },
      { "gr", function() Snacks.picker.lsp_references() end, desc = "References" },
      { "gd", function() Snacks.picker.lsp_definitions() end, desc = "Definitions" },
      { "gi", function() Snacks.picker.lsp_implementations() end, desc = "Implementations" },
      { "gy", function() Snacks.picker.lsp_type_definitions() end, desc = "Type definitions" },
      { "<leader>gf", function() Snacks.picker.git_status() end, desc = "Git status files" },
      -- terminal (ch.19.1)
      { "<leader>tf", function() Snacks.terminal(nil, { win = { position = "float" } }) end, desc = "Terminal (float)" },
      { "<leader>t1", function() Snacks.terminal(nil, { count = 1 }) end, desc = "Terminal 1" },
      { "<leader>t2", function() Snacks.terminal(nil, { count = 2 }) end, desc = "Terminal 2" },
      -- persistent scratch buffers
      { "<leader>.", function() Snacks.scratch() end, desc = "Toggle scratch buffer" },
      { "<leader>S", function() Snacks.scratch.select() end, desc = "Select scratch buffer" },
      -- lazygit (ch.17.3)
      { "<leader>gg", function() Snacks.lazygit() end, desc = "Lazygit" },
      -- buffer delete without layout wreck (ch.20.13)
      { "<leader>bd", function() Snacks.bufdelete() end, desc = "Delete buffer" },
    },
  },
}
