-- prettierd is faster but needs a writable $XDG_RUNTIME_DIR and dies without one.
-- Swap to { "prettierd", "prettier", stop_after_first = true } if formatting feels slow.
local prettier = { "prettier" }

local options = {
  formatters_by_ft = {
    lua = { "stylua" },
    python = { "ruff_organize_imports", "ruff_format" },

    javascript = prettier,
    javascriptreact = prettier,
    typescript = prettier,
    typescriptreact = prettier,
    json = prettier,
    jsonc = prettier,
    yaml = prettier,
    css = prettier,
    html = prettier,
    markdown = prettier,
  },

  format_on_save = {
    timeout_ms = 1000,
    lsp_format = "fallback",
  },
}

return options
