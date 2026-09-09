-- ch.16: neotest + coverage
return {
  {
    "nvim-neotest/neotest",
    dependencies = {
      "nvim-neotest/nvim-nio",
      "nvim-lua/plenary.nvim",
      "antoinemadec/FixCursorHold.nvim",
      "nvim-treesitter/nvim-treesitter",
      "nvim-neotest/neotest-python",
      "marilari88/neotest-vitest",
      "nvim-neotest/neotest-jest",
      "mfussenegger/nvim-dap",
    },
    opts = function()
      return {
        adapters = {
          require("neotest-python")({
            runner = "pytest",
            python = ".venv/bin/python",
            dap = { justMyCode = false },
            args = { "-vv" },
          }),
          require("neotest-vitest")({
            filter_dir = function(name) return name ~= "node_modules" end,
          }),
          require("neotest-jest")({
            jestCommand = "npm test --",
            cwd = function() return vim.fn.getcwd() end,  -- monorepo: see ch.16.13
          }),
        },
        diagnostic = { enabled = true },
        status = { virtual_text = true, signs = true },
        summary = {
          open = "botright vsplit | vertical resize 60",
          mappings = {
            expand = { "<CR>", "<2-LeftMouse>" },
            run = "r", debug = "d", output = "o", stop = "u",
            mark = "m", run_marked = "R", debug_marked = "D",
            watch = "w",
          },
        },
        output = { open_on_run = false },
        quickfix = { enabled = false },
      }
    end,
    keys = {
      { "<leader>tt", function() require("neotest").run.run(vim.fn.expand("%")) end, desc = "Run file" },
      { "<leader>tr", function() require("neotest").run.run() end, desc = "Run nearest" },
      { "<leader>ts", function() require("neotest").summary.toggle() end, desc = "Toggle summary" },
      { "<leader>to", function() require("neotest").output.open({ enter = true, auto_close = true }) end, desc = "Show output" },
      { "<leader>tO", function() require("neotest").output_panel.toggle() end, desc = "Output panel" },
      { "<leader>tl", function() require("neotest").run.run_last() end, desc = "Run last" },
      { "<leader>td", function() require("neotest").run.run({ strategy = "dap" }) end, desc = "Debug nearest" },
      { "<leader>ta", function() require("neotest").run.attach() end, desc = "Attach to running test" },
      { "<leader>tx", function() require("neotest").run.stop() end, desc = "Stop" },
      { "[t", function() require("neotest").jump.prev({ status = "failed" }) end, desc = "Prev failed test" },
      { "]t", function() require("neotest").jump.next({ status = "failed" }) end, desc = "Next failed test" },
    },
  },
  {
    "andythigpen/nvim-coverage",
    dependencies = { "nvim-lua/plenary.nvim" },
    cmd = { "Coverage", "CoverageLoad", "CoverageShow", "CoverageHide", "CoverageSummary", "CoverageWatch" },
    keys = {
      { "<leader>tcv", function() require("coverage").load(true) end, desc = "Load + show coverage" },
      { "<leader>tcc", "<cmd>CoverageSummary<cr>", desc = "Coverage summary" },
    },
    opts = {
      auto_reload = true,
      signs = {
        covered = { hl = "CoverageCovered", text = "▎" },
        uncovered = { hl = "CoverageUncovered", text = "▎" },
      },
    },
  },
}
