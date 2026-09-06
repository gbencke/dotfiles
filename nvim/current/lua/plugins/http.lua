-- ch.18: kulala (IntelliJ .http spec compatible)
return {
  {
    "mistweaverco/kulala.nvim",
    ft = { "http", "rest" },
    keys = {
      { "<leader>Rs", function() require("kulala").run() end, ft = { "http", "rest" }, desc = "Send request" },
      { "<leader>Ra", function() require("kulala").run_all() end, ft = { "http", "rest" }, desc = "Send all" },
      { "<leader>Rb", function() require("kulala").scratchpad() end, desc = "Scratchpad" },
      { "<leader>Re", function() require("kulala").set_selected_env() end, ft = { "http", "rest" }, desc = "Select environment" },
      { "<leader>Rc", function() require("kulala").copy() end, ft = { "http", "rest" }, desc = "Copy as cURL" },
    },
    opts = { global_keymaps = false },
  },
}
