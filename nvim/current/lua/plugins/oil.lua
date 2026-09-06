-- ch.20.3: directory-as-buffer explorer (emits willRenameFiles → import rewrites)
return {
  { "stevearc/oil.nvim",
    cmd = "Oil",
    keys = { { "-", "<cmd>Oil<cr>", desc = "Parent directory (oil)" } },
    opts = {
      default_file_explorer = false, -- Neo-tree owns directory buffers; use - for Oil.
      view_options = { show_hidden = true },
      float = { max_width = 80 },
    } },
}
