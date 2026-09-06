-- ch.17: gitsigns + diffview + gitlinker + octo (lazygit via snacks, ch.20)
return {
  {
    "lewis6991/gitsigns.nvim",
    event = { "BufReadPre", "BufNewFile" },
    opts = {
      signs = {
        add = { text = "▎" }, change = { text = "▎" }, delete = { text = "" },
        topdelete = { text = "" }, changedelete = { text = "▎" }, untracked = { text = "▎" },
      },
      current_line_blame = false,
      current_line_blame_opts = { delay = 300, virt_text_pos = "eol" },
      on_attach = function(bufnr)
        local gs = require("gitsigns")
        local function map(mode, l, r, desc)
          vim.keymap.set(mode, l, r, { buffer = bufnr, desc = "Git: " .. desc })
        end
        map("n", "]h", function() gs.nav_hunk("next") end, "Next hunk")
        map("n", "[h", function() gs.nav_hunk("prev") end, "Prev hunk")
        map({ "n", "v" }, "<leader>ghs", ":Gitsigns stage_hunk<CR>", "Stage hunk")
        map({ "n", "v" }, "<leader>ghr", ":Gitsigns reset_hunk<CR>", "Reset hunk")
        map("n", "<leader>ghS", gs.stage_buffer, "Stage buffer")
        map("n", "<leader>ghu", gs.undo_stage_hunk, "Undo stage hunk")
        map("n", "<leader>ghp", gs.preview_hunk_inline, "Preview hunk inline")
        map("n", "<leader>ghb", function() gs.blame_line({ full = true }) end, "Blame line (full)")
        map("n", "<leader>ghd", gs.diffthis, "Diff this")
        map("n", "<leader>ghD", function() gs.diffthis("~") end, "Diff this (~)")
        map("n", "<leader>ghq", gs.setqflist, "Hunks to quickfix")
        map("n", "<leader>gtb", gs.toggle_current_line_blame, "Toggle line blame")
        map("n", "<leader>gtw", gs.toggle_word_diff, "Toggle word diff")
        map({ "o", "x" }, "ih", ":Gitsigns select_hunk<CR>", "Select hunk")
      end,
    },
  },
  {
    "sindrets/diffview.nvim",
    cmd = { "DiffviewOpen", "DiffviewFileHistory" },
    keys = {
      { "<leader>gd", "<cmd>DiffviewOpen<cr>", desc = "Diffview: working tree" },
      { "<leader>gD", "<cmd>DiffviewFileHistory %<cr>", desc = "File history" },
      { "<leader>gH", "<cmd>DiffviewFileHistory<cr>", desc = "Branch history" },
    },
    opts = {
      view = { merge_tool = { layout = "diff3_mixed" } },
      file_panel = { listing_style = "tree" },
    },
  },
  { "tpope/vim-fugitive", cmd = { "G", "Git", "Gblame", "Gdiffsplit", "Glog", "Gread", "Gwrite" } },
  { "ruifm/gitlinker.nvim", dependencies = "nvim-lua/plenary.nvim",
    keys = {
      { "<leader>gy", function() require("gitlinker").get_buf_range_url("n") end, desc = "Copy git permalink" },
      { "<leader>gy", function() require("gitlinker").get_buf_range_url("v") end, mode = "v", desc = "Copy range permalink" },
    },
    opts = {} },
  { "pwntester/octo.nvim", cmd = "Octo",
    dependencies = { "nvim-lua/plenary.nvim", "nvim-telescope/telescope.nvim", "nvim-tree/nvim-web-devicons" },
    opts = {} },
}
