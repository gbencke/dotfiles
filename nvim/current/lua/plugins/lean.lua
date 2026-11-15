-- Lean proof tools under Space L; Space l remains the general LSP menu.
return {
  {
    "Julian/lean.nvim",
    ft = "lean",
    -- lean.nvim reads vim.g.lean_config; it does not provide setup().
    init = function()
      vim.g.lean_config = {
        mappings = true,
        -- shortcut: unthrottled updates can cost more CPU, restore the cooldown after lean.nvim fixes cleared-pin updates.
        infoview = { update_cooldown = 0 },
      }
    end,
    keys = {
      { "<leader>Li", "<cmd>LeanInfoviewToggle<cr>", ft = "lean", desc = "Toggle infoview" },
      { "<leader>Lg", "<cmd>LeanGoal<cr>", ft = "lean", desc = "Show proof goal" },
      { "<leader>Lt", "<cmd>LeanTermGoal<cr>", ft = "lean", desc = "Show expected type" },
      { "<leader>Lf", "<cmd>LeanGotoInfoview<cr>", ft = "lean", desc = "Focus infoview" },
      { "<leader>Lp", "<cmd>LeanInfoviewAddPin<cr>", ft = "lean", desc = "Pin proof state" },
      { "<leader>Lc", "<cmd>LeanInfoviewClearPins<cr>", ft = "lean", desc = "Clear proof pins" },
      { "<leader>LP", "<cmd>LeanInfoviewPinTogglePause<cr>", ft = "lean", desc = "Pause/resume infoview" },
      { "<leader>Lr", "<cmd>LeanRestartFile<cr>", ft = "lean", desc = "Restart Lean file" },
    },
  },
}
