-- ch.21.5: statusline with DAP session status
return {
  { "nvim-lualine/lualine.nvim",
    event = "VeryLazy",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    opts = {
      options = { theme = "auto", section_separators = "", component_separators = "|" },
      sections = {
        lualine_a = { "mode" },
        lualine_b = { "branch", "diff" },
        lualine_c = { { "filename", path = 1 },
          { function()
              local ok, dap = pcall(require, "dap")
              if not ok then return "" end
              local s = dap.status()
              return s ~= "" and (" " .. s) or ""
            end,
            cond = function() return package.loaded["dap"] and require("dap").session() ~= nil end },
        },
        lualine_x = { "diagnostics", "lsp_status", "filetype" },
        lualine_y = { "progress" },
        lualine_z = { "location" },
      },
    } },
}
