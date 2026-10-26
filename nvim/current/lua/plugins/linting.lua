-- ch.6.4: nvim-lint for non-LSP linters
return {
  {
    "mfussenegger/nvim-lint",
    event = { "BufReadPost", "BufWritePost" },
    config = function()
      local lint = require("lint")
      lint.linters_by_ft = {
        markdown = { "markdownlint" },
        sh       = { "shellcheck" },
        dockerfile = { "hadolint" },
        -- python = { "mypy" },   -- enable if you run mypy alongside basedpyright
      }
      local group = vim.api.nvim_create_augroup("NvimLint", { clear = true })
      local warned = {}
      vim.api.nvim_create_autocmd({ "BufWritePost", "BufReadPost", "InsertLeave" }, {
        group = group,
        callback = function()
          -- Skip missing linters with one hint instead of an ENOENT error on every event.
          local names = vim.tbl_filter(function(name)
            local linter = lint.linters[name]
            if type(linter) == "function" then linter = linter() end
            local cmd = type(linter.cmd) == "function" and linter.cmd() or linter.cmd
            if vim.fn.executable(cmd) == 1 then return true end
            if not warned[name] then
              warned[name] = true
              vim.notify(name .. " is not installed; run :MasonInstall " .. name, vim.log.levels.WARN)
            end
            return false
          end, lint.linters_by_ft[vim.bo.filetype] or {})
          if #names > 0 then lint.try_lint(names) end
        end,
      })
    end,
  },
}
