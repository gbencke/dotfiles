-- ch.5: blink.cmp (pinned v1)
return {
  {
    "saghen/blink.cmp",
    version = "1.*",
    event = { "InsertEnter", "CmdlineEnter" },
    dependencies = { "rafamadriz/friendly-snippets" },
    opts = {
      keymap = {
        preset = "default",
        ["<Tab>"] = { "select_and_accept", "snippet_forward", "fallback" },
        ["<S-Tab>"] = { "snippet_backward", "fallback" },
      },
      appearance = { nerd_font_variant = "mono" },
      completion = {
        documentation = { auto_show = true, auto_show_delay_ms = 200 },
        ghost_text = { enabled = true },
        list = { selection = { preselect = true, auto_insert = false } },
      },
      sources = {
        default = { "lsp", "path", "snippets", "buffer" },
        per_filetype = {
          sql   = { "dadbod", "snippets", "buffer" },
          mysql = { "dadbod", "snippets", "buffer" },
        },
        providers = {
          dadbod = { name = "Dadbod", module = "vim_dadbod_completion.blink" },
        },
      },
      fuzzy = { implementation = "prefer_rust_with_warning" },
      signature = { enabled = true },
      cmdline = { enabled = true },
    },
  },
}
