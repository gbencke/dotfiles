-- ch.12/13: JSX auto-tags + color swatches (+ optional tailwind-tools, package-info)
return {
  { "windwp/nvim-ts-autotag", event = { "BufReadPost", "BufNewFile" }, opts = {} },
  { "catgoose/nvim-colorizer.lua", event = "BufReadPost",
    opts = { filetypes = { "css", "scss", "html", "javascript", "typescript", "vue", "svelte" } } },
  -- Optional polish (ch.13.9) — uncomment to adopt:
  -- { "luckasRanarison/tailwind-tools.nvim",
  --   dependencies = { "nvim-treesitter/nvim-treesitter" },
  --   ft = { "html", "css", "scss", "javascriptreact", "typescriptreact", "vue", "svelte" },
  --   opts = {} },
  -- { "vuki656/package-info.nvim",
  --   dependencies = { "MunifTanjim/nui.nvim" },
  --   ft = "json",
  --   opts = {} },
}
