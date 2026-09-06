-- ch.3.12: micro-editing trio
return {
  { "windwp/nvim-autopairs", event = "InsertEnter", opts = {
      check_ts = true,
      fast_wrap = {},
  } },
  { "kylechui/nvim-surround", event = { "BufReadPost", "BufNewFile" }, opts = {} },
  { "numToStr/Comment.nvim", event = { "BufReadPost", "BufNewFile" }, opts = {} },
}
