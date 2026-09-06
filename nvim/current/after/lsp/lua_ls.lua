-- ch.4.10: lua_ls rooted at the config dir itself
return {
  root_dir = function(bufnr, on_dir)
    local fname = vim.api.nvim_buf_get_name(bufnr)
    local root = vim.fs.root(fname, { ".luarc.json", ".git" })
    on_dir(root or vim.fn.getcwd())
  end,
}
