-- ch.14/15: nvim-dap stack + debugpy + vscode-js-debug
return {
  {
    "mfussenegger/nvim-dap",
    dependencies = {
      { "rcarriga/nvim-dap-ui", dependencies = { "nvim-neotest/nvim-nio" } },
      { "theHamsta/nvim-dap-virtual-text", opts = {
          virt_text_pos = "eol",
          highlight_changed_variables = true,
          only_first_definition = false,
      } },
      { "jay-babu/mason-nvim-dap.nvim",
        dependencies = { "mason-org/mason.nvim" },
        opts = {
          ensure_installed = { "debugpy", "js-debug-adapter" },
          automatic_installation = true,
        } },
      { "Weissle/persistent-breakpoints.nvim",
        opts = { load_breakpoints_event = { "BufReadPost" } } },
      { "Joakker/lua-json5", lazy = true, build = "./install.sh" },
    },
    keys = {
      { "<leader>db", function() require("persistent-breakpoints.api").toggle_breakpoint() end, desc = "Toggle breakpoint" },
      { "<leader>dB", function() require("dap").set_breakpoint(vim.fn.input("Condition: ")) end, desc = "Conditional breakpoint" },
      { "<leader>dl", function() require("dap").set_breakpoint(nil, nil, vim.fn.input("Log: ")) end, desc = "Logpoint" },
      { "<leader>dc", function() require("dap").continue() end, desc = "Continue / start" },
      { "<leader>dn", function() require("dap").step_over() end, desc = "Step over" },
      { "<leader>di", function() require("dap").step_into() end, desc = "Step into" },
      { "<leader>do", function() require("dap").step_out() end, desc = "Step out" },
      { "<leader>dC", function() require("dap").run_to_cursor() end, desc = "Run to cursor" },
      { "<leader>dr", function() require("dap").restart() end, desc = "Restart" },
      { "<leader>dq", function() require("dap").terminate() end, desc = "Terminate" },
      { "<leader>de", function() require("dapui").eval() end, mode = { "n", "v" }, desc = "Eval expression" },
      { "<leader>du", function() require("dapui").toggle() end, desc = "Toggle DAP UI" },
      -- optional F-key layout (ch.14.9)
      { "<F5>", function() require("dap").continue() end, desc = "DAP continue" },
      { "<F9>", function() require("persistent-breakpoints.api").toggle_breakpoint() end, desc = "DAP breakpoint" },
      { "<F10>", function() require("dap").step_over() end, desc = "DAP step over" },
      { "<F11>", function() require("dap").step_into() end, desc = "DAP step into" },
    },
    config = function()
      local dap, dapui = require("dap"), require("dapui")
      dapui.setup({
        layouts = {
          { elements = {
              { id = "scopes", size = 0.40 },
              { id = "watches", size = 0.25 },
              { id = "stacks", size = 0.20 },
              { id = "breakpoints", size = 0.15 },
            }, size = 50, position = "right" },
          { elements = {
              { id = "repl", size = 0.6 },
              { id = "console", size = 0.4 },
            }, size = 12, position = "bottom" },
        },
        floating = { border = "rounded" },
      })

      dap.listeners.before.attach.dapui_config = function() dapui.open() end
      dap.listeners.before.launch.dapui_config = function() dapui.open() end
      dap.listeners.before.event_terminated.dapui_config = function() dapui.close() end
      dap.listeners.before.event_exited.dapui_config = function() dapui.close() end

      dap.set_exception_breakpoints({ "uncaught" })

      local ok, json5 = pcall(require, "json5")
      if ok then require("dap.ext.vscode").json_decode = json5.parse end

      vim.fn.sign_define("DapBreakpoint", { text = "", texthl = "DiagnosticError" })
      vim.fn.sign_define("DapStopped", { text = "", texthl = "DiagnosticWarn" })

      -- JS/TS adapters: vscode-js-debug via mason's js-debug-adapter (ch.15.3)
      for _, adapter in ipairs({ "pwa-node", "pwa-chrome" }) do
        dap.adapters[adapter] = {
          type = "server",
          host = "127.0.0.1",
          port = "${port}",
          executable = { command = "js-debug-adapter", args = { "${port}" } },
        }
      end

      for _, lang in ipairs({ "typescript", "javascript", "typescriptreact", "javascriptreact" }) do
        dap.configurations[lang] = {
          { type = "pwa-node", request = "launch", name = "Launch current file (tsx)",
            program = "${file}", cwd = "${workspaceFolder}",
            runtimeExecutable = "npx", runtimeArgs = { "tsx" },
            sourceMaps = true,
            skipFiles = { "<node_internals>/**", "**/node_modules/**" },
            resolveSourceMapLocations = { "${workspaceFolder}/**", "!**/node_modules/**" } },
          { type = "pwa-node", request = "attach", name = "Attach to process",
            processId = require("dap.utils").pick_process,
            cwd = "${workspaceFolder}", sourceMaps = true,
            skipFiles = { "<node_internals>/**", "**/node_modules/**" } },
          { type = "pwa-chrome", request = "launch", name = "Chrome: Vite dev server",
            url = "http://localhost:5173", webRoot = "${workspaceFolder}",
            sourceMaps = true },
          { type = "pwa-chrome", request = "attach", name = "Chrome: attach (9222)",
            port = 9222, webRoot = "${workspaceFolder}", sourceMaps = true },
        }
      end
    end,
  },
  {
    "mfussenegger/nvim-dap-python",
    ft = "python",
    dependencies = { "mfussenegger/nvim-dap", "rcarriga/nvim-dap-ui" },
    config = function()
      local python = vim.fn.expand("~/.local/share/nvim/mason/packages/debugpy/venv/bin/python")
      require("dap-python").setup(python)
      require("dap-python").test_runner = "pytest"
    end,
    keys = {
      { "<leader>dtm", function() require("dap-python").test_method() end, ft = "python", desc = "Debug test method" },
      { "<leader>dtc", function() require("dap-python").test_class() end, ft = "python", desc = "Debug test class" },
    },
  },
}
