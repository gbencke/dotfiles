-- ch.3: treesitter + textobjects
local parsers = {
  "lua", "vim", "vimdoc", "query",
  "python",
  "javascript", "typescript", "tsx", "vue", "svelte",
  "html", "css", "scss", "json", "yaml", "toml",
  "markdown", "markdown_inline", "regex", "bash",
  "sql", "graphql", "dockerfile", "gitcommit", "diff",
}

return {
  {
    "nvim-treesitter/nvim-treesitter",
    branch = "main",
    lazy = false,
    build = ":TSUpdate",
    config = function()
      require("nvim-treesitter").install(parsers)
      vim.api.nvim_create_autocmd("FileType", {
        callback = function(event)
          local lang = vim.treesitter.language.get_lang(vim.bo[event.buf].filetype)
          if lang and vim.treesitter.language.add(lang) then
            vim.treesitter.start(event.buf, lang)
            vim.bo[event.buf].indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
          end
        end,
      })

      vim.keymap.set({ "n", "x" }, "<C-space>", function() vim.treesitter.select("parent") end,
        { desc = "Expand syntax-node selection" })
      vim.keymap.set("x", "<BS>", function() vim.treesitter.select("child") end,
        { desc = "Shrink syntax-node selection" })
    end,
  },
  {
    "nvim-treesitter/nvim-treesitter-textobjects",
    branch = "main",
    lazy = false,
    dependencies = "nvim-treesitter/nvim-treesitter",
    config = function()
      require("nvim-treesitter-textobjects").setup({
        select = { lookahead = true },
        move = { set_jumps = true },
      })

      local function map(modes, lhs, module, method, query, desc)
        vim.keymap.set(modes, lhs, function()
          require("nvim-treesitter-textobjects." .. module)[method](query, "textobjects")
        end, { desc = desc })
      end

      map({ "x", "o" }, "af", "select", "select_textobject", "@function.outer", "Around function")
      map({ "x", "o" }, "if", "select", "select_textobject", "@function.inner", "Inside function")
      map({ "x", "o" }, "ac", "select", "select_textobject", "@class.outer", "Around class")
      map({ "x", "o" }, "ic", "select", "select_textobject", "@class.inner", "Inside class")
      map({ "x", "o" }, "aa", "select", "select_textobject", "@parameter.outer", "Around parameter")
      map({ "x", "o" }, "ia", "select", "select_textobject", "@parameter.inner", "Inside parameter")
      map({ "x", "o" }, "al", "select", "select_textobject", "@loop.outer", "Around loop")
      map({ "x", "o" }, "il", "select", "select_textobject", "@loop.inner", "Inside loop")
      map({ "n", "x", "o" }, "]m", "move", "goto_next_start", "@function.outer", "Next function")
      map({ "n", "x", "o" }, "[m", "move", "goto_previous_start", "@function.outer", "Previous function")
      map({ "n", "x", "o" }, "]]", "move", "goto_next_start", "@class.outer", "Next class")
      map({ "n", "x", "o" }, "[[", "move", "goto_previous_start", "@class.outer", "Previous class")
      map("n", "<leader>sn", "swap", "swap_next", "@parameter.inner", "Swap next parameter")
      map("n", "<leader>sp", "swap", "swap_previous", "@parameter.inner", "Swap previous parameter")
    end,
  },
}
