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
      vim.api.nvim_create_autocmd({ "BufWritePost", "BufReadPost", "InsertLeave" }, {
        group = group,
        callback = function() lint.try_lint() end,
      })
    end,
  },
}
