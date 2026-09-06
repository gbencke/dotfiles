-- ch.6: conform.nvim owns formatting
return {
  {
    "stevearc/conform.nvim",
    event = { "BufWritePre" },
    cmd = { "ConformInfo" },
    opts = {
      formatters_by_ft = {
        python     = { "ruff_fix", "ruff_format", "ruff_organize_imports" },
        javascript = { "prettier" },
        typescript = { "prettier" },
        javascriptreact = { "prettier" },
        typescriptreact = { "prettier" },
        vue        = { "prettier" },
        svelte     = { "prettier" },
        css        = { "prettier" },
        scss       = { "prettier" },
        html       = { "prettier" },
        json       = { "prettier" },
        jsonc      = { "prettier" },
        yaml       = { "prettier" },
        markdown   = { "prettier" },
        graphql    = { "prettier" },
        lua        = { "stylua" },
        sh         = { "shfmt" },
        sql        = { "sqlfluff" },
        ["_"]      = { "trim_whitespace" },
      },
      formatters = {
        prettier = { require_cwd = true },  -- project-local prettier only (ch.6.7)
        sqlfluff = { append_args = { "--dialect", "postgres" } },
      },
      default_format_opts = {
        lsp_format = "fallback",
        timeout_ms = 1000,
      },
      format_on_save = function(bufnr)
        if vim.api.nvim_buf_get_name(bufnr):match("/node_modules/") then return end
        return { timeout_ms = 1000, lsp_format = "fallback" }
      end,
    },
    init = function()
      vim.o.formatexpr = "v:lua.require'conform'.formatexpr()"
    end,
  },
}
