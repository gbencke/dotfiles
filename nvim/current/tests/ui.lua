-- Run: nvim -i NONE -c 'luafile tests/ui.lua'
-- Also run with --headless to check that startup does not open a sidebar.
vim.api.nvim_create_autocmd("VimEnter", {
  once = true,
  callback = function()
    vim.schedule(function()
      local ok, err = pcall(function()
        assert(not Snacks.config.dashboard.enabled, "Snacks dashboard is enabled")
        for _, name in ipairs({ "copilot.lua", "codecompanion.nvim", "minuet-ai.nvim" }) do
          assert(not require("lazy.core.config").plugins[name], name .. " is still configured")
        end
        local filters = require("neo-tree.sources.manager").get_state("filesystem").filtered_items
        local matches = require("neo-tree.utils").is_filtered_by_pattern
        assert(not filters.hide_dotfiles, "Neo-tree hides dotfiles")
        assert(matches(filters.always_show_by_pattern, "/repo/.env", ".env"), "Ignored dotfiles are not always shown")
        assert(matches(filters.always_show_by_pattern, "/repo/.config/settings.json", "settings.json"),
          "Children of dot-directories are hidden")
        assert(matches(filters.always_show_by_pattern, "/repo/.config/nvim/lua/init.lua", "init.lua"),
          "Nested children of dot-directories are hidden")
        assert(not matches(filters.always_show_by_pattern, "/repo/build", "build"), "Non-dotfiles are always shown")
        assert(not matches(filters.always_show_by_pattern, "/repo/app.v2/build/output.js", "output.js"),
          "Contents of non-dot-directories are always shown")
        local interactive = #vim.api.nvim_list_uis() > 0
        local function tree_windows()
          return vim.tbl_filter(function(win)
            return vim.bo[vim.api.nvim_win_get_buf(win)].filetype == "neo-tree"
          end, vim.api.nvim_list_wins())
        end
        if not interactive then
          assert(#tree_windows() == 0, "Neo-tree opened in headless mode")
          return
        end
        assert(vim.wait(5000, function()
          -- Directory hijacking finishes asynchronously after the sidebar opens.
          for _, buf in ipairs(vim.api.nvim_list_bufs()) do
            if vim.fn.isdirectory(vim.api.nvim_buf_get_name(buf)) == 1 then return false end
          end
          return package.loaded["bufferline"] ~= nil and #tree_windows() == 1
        end), "Bufferline or Neo-tree did not reach the expected startup state")
        for _, win in ipairs(vim.api.nvim_list_wins()) do
          assert(vim.bo[vim.api.nvim_win_get_buf(win)].filetype ~= "snacks_dashboard", "Startup dashboard is visible")
        end
        assert(vim.o.showtabline == 2, "Bufferline is hidden")
        assert(vim.o.tabline:find("bufferline", 1, true), "Bufferline is not configured")
        assert(vim.api.nvim_win_get_position(tree_windows()[1])[2] == 0, "Neo-tree is not on the left")
        require("neo-tree.command").execute({ action = "close" })
        vim.api.nvim_exec_autocmds("UIEnter", { modeline = false })
        vim.wait(100)
        assert(#tree_windows() == 0, "Neo-tree reopened after startup")
      end)
      if not ok then io.stderr:write(tostring(err) .. "\n") end
      print(ok and "UI startup check passed" or "UI startup check failed")
      vim.cmd(ok and "qa!" or "cquit 1")
    end)
  end,
})
