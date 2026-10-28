-- Project-wide ESLint for Neovim.
-- * Scans the whole repo with the CLI, so Trouble (<leader>xx) and Neo-tree also see unopened files.
--   Buffers with the eslint LSP attached keep the live LSP results instead, so nothing is listed twice.
-- * Two modes per project (<leader>xe): "local" = the repo's eslint + eslint.config.*; "pinned" = the
--   pinned-eslint skill (fixed eslint 9 + strict plugin set; the scan runs in bubblewrap).
-- * Rule screen (<leader>xR): choose which rules are reported. Local starts with every rule on;
--   pinned starts with only the complexity/size rules on. Rules always run; only reporting is filtered.
-- Mode and rule choices persist per project in stdpath("state")/eslint_project.json.
local M = {}

local ns = vim.api.nvim_create_namespace("eslint_project")
local PINNED_DIR = vim.fn.expand("~/.pi/agent/skills/pinned-eslint")
local PINNED_BIN = PINNED_DIR .. "/pinned-eslint"
local STATE_FILE = vim.fn.stdpath("state") .. "/eslint_project.json"
local PINNED_DEFAULT_ON = {
  ["complexity"] = true, ["sonarjs/cognitive-complexity"] = true,
  ["max-lines"] = true, ["max-lines-per-function"] = true, ["max-statements"] = true,
  ["max-depth"] = true, ["max-params"] = true, ["max-nested-callbacks"] = true,
}
local config_files = {
  "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs",
  "eslint.config.ts", "eslint.config.mts", "eslint.config.cts",
}

local raw = {} -- absolute path -> eslint messages from the last scan (unfiltered)
local linted = {} -- every file the last scan looked at, for picking --print-config samples
local running, pending = false, false -- pending: false or the opts of the queued run
local job -- the running scan, killed on a mode switch
local pinned_store -- pinned-eslint install dir (eslint + plugins), resolved once per session

-- Persistent per-project state ---------------------------------------------------------------
local state = (function()
  local ok, data = pcall(function() return vim.json.decode(table.concat(vim.fn.readfile(STATE_FILE), "\n")) end)
  return ok and type(data) == "table" and data or {}
end)()

local function project()
  local cwd = vim.fn.getcwd()
  state[cwd] = state[cwd] or {}
  local p = state[cwd]
  p.mode = p.mode or "local"
  p.overrides = p.overrides or {}
  p.overrides["local"] = p.overrides["local"] or {}
  p.overrides.pinned = p.overrides.pinned or {}
  return p, cwd
end

local function save()
  vim.fn.mkdir(vim.fn.fnamemodify(STATE_FILE, ":h"), "p")
  vim.fn.writefile({ vim.json.encode(state) }, STATE_FILE)
end

function M.mode() return (project()).mode end

local function rule_enabled(rule)
  if not rule then return true end -- parse errors and directive problems have no rule: always report
  local p = project()
  local override = p.overrides[p.mode][rule]
  if override ~= nil then return override end
  return p.mode == "local" or PINNED_DEFAULT_ON[rule] == true
end

-- Diagnostics --------------------------------------------------------------------------------
local function lsp_owns(buf)
  return #vim.lsp.get_clients({ bufnr = buf, name = "eslint" }) > 0
end

local function to_diagnostic(m)
  return {
    lnum = (m.line or 1) - 1,
    col = (m.column or 1) - 1,
    end_lnum = (m.endLine or m.line or 1) - 1,
    end_col = (m.endColumn or m.column or 1) - 1,
    severity = m.severity == 2 and vim.diagnostic.severity.ERROR or vim.diagnostic.severity.WARN,
    message = m.message,
    source = "eslint",
    code = m.ruleId,
  }
end

local function publish()
  vim.diagnostic.reset(ns)
  for path, messages in pairs(raw) do
    local shown = vim.tbl_filter(function(m) return rule_enabled(m.ruleId) end, messages)
    if #shown > 0 then
      local buf = vim.fn.bufadd(path) -- unlisted and unloaded: no tab, no file read
      if not lsp_owns(buf) then vim.diagnostic.set(ns, buf, vim.tbl_map(to_diagnostic, shown)) end
    end
  end
end

-- eslint commands per mode ---------------------------------------------------------------------
local function available(mode, cwd)
  if mode == "pinned" then
    return vim.fn.executable(PINNED_BIN) == 1 and vim.fn.executable("bwrap") == 1
  end
  if vim.fn.executable(cwd .. "/node_modules/.bin/eslint") ~= 1 then return false end
  for _, name in ipairs(config_files) do
    if vim.uv.fs_stat(cwd .. "/" .. name) then return true end
  end
  return false
end

-- Never npx: no surprise installs. Pinned output mixes stderr in, so callers parse it leniently.
local function eslint_cmd(mode, cwd, args)
  if mode == "pinned" then return vim.list_extend({ PINNED_BIN, cwd, "--" }, args) end
  return vim.list_extend({ cwd .. "/node_modules/.bin/eslint" }, args)
end

local function decode_report(stdout)
  for line in vim.gsplit(stdout or "", "\n") do
    if line:sub(1, 1) == "[" then
      local ok, report = pcall(vim.json.decode, line)
      if ok and type(report) == "table" then return report end
    end
  end
end

function M.run(opts)
  local p, cwd = project()
  local mode = p.mode
  if not available(mode, cwd) then return end
  local loud = opts and opts.loud -- startup/manual/mode-switch runs report progress; save runs stay quiet
  if running then
    pending = pending or {}
    pending.loud = pending.loud or loud
    return
  end
  running = true
  local started = vim.uv.hrtime()
  local note = { id = "eslint_project", title = "ESLint" }
  if loud then vim.notify("ESLint (" .. mode .. "): scanning project...", vim.log.levels.INFO, note) end
  local args = { "--format", "json" }
  -- --cache keeps results for unchanged files (~10s cold -> ~3s warm). Only inside an existing
  -- node_modules: the pinned sandbox can write nowhere but the repo, and we must not create files there.
  if vim.fn.isdirectory(cwd .. "/node_modules") == 1 then
    vim.list_extend(args, { "--cache", "--cache-location", "node_modules/.cache/eslint-nvim-" .. mode .. "/" })
  end
  table.insert(args, ".")
  job = vim.system(eslint_cmd(mode, cwd, args), { cwd = cwd, text = true }, vim.schedule_wrap(function(res)
    running, job = false, nil
    if M.mode() ~= mode then -- killed by a mode switch: drop stale results; set_mode starts the new scan
    else
      -- Exit 1 only means "problems found"; anything above, or no JSON, means eslint itself failed.
      local report = decode_report(res.stdout)
      if res.code > 1 or not report then
        local why = vim.trim((res.stderr or "") .. "\n" .. (res.stdout or "")):sub(-800)
        vim.notify("ESLint (" .. mode .. ") failed: " .. why, vim.log.levels.WARN, note)
      else
        raw, linted = {}, {}
        for _, file in ipairs(report) do
          table.insert(linted, file.filePath)
          if #file.messages > 0 then raw[file.filePath] = file.messages end
        end
        publish()
        if loud then
          local shown, files = 0, 0
          for _, messages in pairs(raw) do
            local n = #vim.tbl_filter(function(m) return rule_enabled(m.ruleId) end, messages)
            if n > 0 then shown, files = shown + n, files + 1 end
          end
          local msg = string.format("ESLint (%s): %d problems in %d files (%.1fs)", mode, shown, files, (vim.uv.hrtime() - started) / 1e9)
          vim.notify(msg, vim.log.levels.INFO, note)
        end
      end
    end
    if pending then
      local queued = pending
      pending = false
      M.run(queued)
    end
  end))
end

-- Live LSP ---------------------------------------------------------------------------------
local function rules_customizations()
  local p = project()
  local list = {}
  -- vscode-eslint applies the last matching entry, so "*" off goes first and per-rule "on" after it.
  if p.mode == "pinned" then
    table.insert(list, { rule = "*", severity = "off" })
    local on = vim.tbl_extend("force", {}, PINNED_DEFAULT_ON)
    for rule, value in pairs(p.overrides.pinned) do on[rule] = value or nil end
    for rule in pairs(on) do table.insert(list, { rule = rule, severity = "default" }) end
  else
    for rule, value in pairs(p.overrides["local"]) do
      if value == false then table.insert(list, { rule = rule, severity = "off" }) end
    end
  end
  return list
end

local function configure(client)
  local s = client.settings
  if M.mode() == "pinned" and pinned_store then
    s.nodePath = pinned_store .. "/node_modules"
    s.options = { overrideConfigFile = pinned_store .. "/nvim/eslint.config.ts" }
    s.useFlatConfig = true
    -- The pinned config lints with type info (projectService), which resolves tsconfig from the
    -- process cwd; without chdir every file fails with "not found by the project service".
    s.workingDirectory = { directory = client.root_dir, changeProcessCWD = true }
  else
    s.nodePath, s.options, s.useFlatConfig = "", vim.empty_dict(), nil
    s.workingDirectory = { mode = "auto" }
  end
  s.rulesCustomizations = rules_customizations()
  client:notify("workspace/didChangeConfiguration", { settings = s })
end

local function each_eslint_client(fn)
  for _, client in ipairs(vim.lsp.get_clients({ name = "eslint" })) do fn(client) end
end

-- The library (nodePath) is loaded once per server, so a mode switch needs a fresh server.
local function restart_lsp()
  if not vim.lsp.is_enabled("eslint") then return end
  vim.lsp.enable("eslint", false)
  vim.defer_fn(function() vim.lsp.enable("eslint") end, 500)
end

local function ensure_pinned_store(cb)
  if pinned_store then return cb() end
  vim.system({ PINNED_BIN, vim.fn.getcwd(), "--print-store" }, { text = true }, vim.schedule_wrap(function(res)
    local store = vim.trim(res.stdout or ""):match("([^\n]+)$")
    if res.code ~= 0 or not store or vim.fn.isdirectory(store) == 0 then
      vim.notify("pinned-eslint --print-store failed: " .. vim.trim(res.stderr or ""), vim.log.levels.ERROR)
      return
    end
    -- A copy next to the pinned node_modules, so its plugin imports resolve outside the sandbox too.
    vim.fn.mkdir(store .. "/nvim", "p")
    assert(vim.uv.fs_copyfile(PINNED_DIR .. "/eslint.config.ts", store .. "/nvim/eslint.config.ts"))
    pinned_store = store
    cb()
  end))
end

function M.set_mode(mode)
  assert(mode == "local" or mode == "pinned", "ESLint mode must be local or pinned")
  local p = project()
  p.mode = mode
  save()
  raw, linted = {}, {}
  publish()
  if job then job:kill(15) end -- its results belong to the old mode
  local go = function() restart_lsp() M.run({ loud = true }) end
  if mode == "pinned" then ensure_pinned_store(go) else go() end
end

local function apply_rules()
  save()
  publish()
  each_eslint_client(configure) -- the server re-validates open files on a config change
end

-- Menus --------------------------------------------------------------------------------------
function M.pick_mode()
  local current = M.mode()
  vim.ui.select({ "local", "pinned" }, {
    prompt = "ESLint mode",
    format_item = function(mode)
      local label = mode == "local" and "local  - repo eslint + eslint.config.* (all rules on)"
        or "pinned - pinned-eslint strict set (complexity rules on)"
      return (mode == current and "● " or "  ") .. label
    end,
  }, function(choice) if choice and choice ~= current then M.set_mode(choice) end end)
end

-- Rules configured (not "off") for one sample file per extension, so .tsx-only React rules appear too.
local function configured_rules(cb)
  local mode, cwd = M.mode(), vim.fn.getcwd()
  local samples, seen = {}, {}
  for _, path in ipairs(linted) do
    local ext = path:match("%.(%w+)$")
    if ext and not seen[ext] then seen[ext] = true table.insert(samples, path) end
  end
  if #samples == 0 then return vim.notify("ESLint: wait for the project scan to finish", vim.log.levels.WARN) end
  local rules, left = {}, #samples
  for _, file in ipairs(samples) do
    vim.system(eslint_cmd(mode, cwd, { "--print-config", file }), { cwd = cwd, text = true }, vim.schedule_wrap(function(res)
      local out = res.stdout or ""
      local ok, config = pcall(vim.json.decode, out:sub(out:find("{", 1, true) or 1))
      for rule, value in pairs(ok and type(config) == "table" and config.rules or {}) do
        local level = type(value) == "table" and value[1] or value
        if level ~= 0 and level ~= "off" then rules[rule] = true end
      end
      left = left - 1
      if left == 0 then cb(vim.tbl_keys(rules)) end
    end))
  end
end

-- Checkbox dialog: one "[x] rule  count" line per configured rule. Toggles apply immediately.
function M.pick_rules()
  configured_rules(function(rules)
    local counts = {}
    for _, messages in pairs(raw) do
      for _, m in ipairs(messages) do
        if m.ruleId then counts[m.ruleId] = (counts[m.ruleId] or 0) + 1 end
      end
    end
    -- Rules with problems first, most problems first; then alphabetical.
    table.sort(rules, function(a, b)
      local ca, cb = counts[a] or 0, counts[b] or 0
      if ca ~= cb then return ca > cb end
      return a < b
    end)
    local p = project()
    local hl_ns = vim.api.nvim_create_namespace("eslint_rules_dialog")
    local buf = vim.api.nvim_create_buf(false, true)
    vim.bo[buf].bufhidden = "wipe"
    vim.bo[buf].filetype = "eslint_rules"
    local width = 20
    for _, rule in ipairs(rules) do width = math.max(width, #rule + 14) end
    width = math.min(width, vim.o.columns - 4)
    local height = math.min(#rules, vim.o.lines - 6)
    local win = vim.api.nvim_open_win(buf, true, {
      relative = "editor", style = "minimal", border = "rounded",
      width = width, height = height,
      row = math.floor((vim.o.lines - height) / 2) - 1, col = math.floor((vim.o.columns - width) / 2),
      title = " ESLint rules (" .. p.mode .. ") ", title_pos = "center",
      footer = " <Space> toggle  a all  n none  r defaults  / search  q close ", footer_pos = "center",
    })
    vim.wo[win].cursorline = true

    local function render()
      local lines = {}
      for i, rule in ipairs(rules) do
        local count = counts[rule] and tostring(counts[rule]) or ""
        local left = (rule_enabled(rule) and "[x] " or "[ ] ") .. rule
        lines[i] = left .. string.rep(" ", math.max(1, width - #left - #count - 1)) .. count
      end
      vim.bo[buf].modifiable = true
      vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
      vim.bo[buf].modifiable = false
      vim.api.nvim_buf_clear_namespace(buf, hl_ns, 0, -1)
      for i, rule in ipairs(rules) do
        local on = rule_enabled(rule)
        vim.api.nvim_buf_set_extmark(buf, hl_ns, i - 1, 0, { end_col = 3, hl_group = on and "DiagnosticOk" or "Comment" })
        vim.api.nvim_buf_set_extmark(buf, hl_ns, i - 1, 4, { end_col = 4 + #rule, hl_group = on and "Normal" or "Comment" })
        if counts[rule] then
          vim.api.nvim_buf_set_extmark(buf, hl_ns, i - 1, #lines[i] - #tostring(counts[rule]), { end_col = #lines[i], hl_group = "DiagnosticWarn" })
        end
      end
    end

    local function set(first, last, value) -- value: true/false = force, nil = flip, "default" = reset
      for i = first, last do
        local rule = rules[i]
        if value == "default" then p.overrides[p.mode][rule] = nil
        elseif value == nil then p.overrides[p.mode][rule] = not rule_enabled(rule)
        else p.overrides[p.mode][rule] = value end
      end
      apply_rules()
      render()
    end

    local function map(modes, lhs, fn) vim.keymap.set(modes, lhs, fn, { buffer = buf, nowait = true }) end
    local function cur() return vim.api.nvim_win_get_cursor(win)[1] end
    for _, lhs in ipairs({ "<Space>", "x", "<CR>" }) do
      map("n", lhs, function() set(cur(), cur()) end)
      map("x", lhs, function()
        local a, b = vim.fn.line("v"), vim.fn.line(".")
        vim.cmd("normal! \27")
        set(math.min(a, b), math.max(a, b))
      end)
    end
    map("n", "a", function() set(1, #rules, true) end)
    map("n", "n", function() set(1, #rules, false) end)
    map("n", "r", function() set(1, #rules, "default") end)
    map("n", "q", function() vim.api.nvim_win_close(win, true) end)
    map("n", "<Esc>", function() vim.api.nvim_win_close(win, true) end)
    render()
  end)
end

-- Wiring ---------------------------------------------------------------------------------------
vim.lsp.config("eslint", { on_init = function(client) configure(client) end })

local group = vim.api.nvim_create_augroup("EslintProject", { clear = true })
-- Start the full scan now, while plugins load, instead of waiting for VimEnter.
if M.mode() == "pinned" then
  ensure_pinned_store(function() restart_lsp() M.run({ loud = true }) end)
else
  M.run({ loud = true })
end
vim.api.nvim_create_autocmd("DirChanged", { group = group, callback = function() M.run({ loud = true }) end })
vim.api.nvim_create_autocmd("BufWritePost", {
  group = group,
  pattern = { "*.js", "*.mjs", "*.cjs", "*.jsx", "*.ts", "*.mts", "*.cts", "*.tsx", "*.vue" },
  callback = function() M.run() end,
})
-- Hand a file over to the LSP when it attaches, and back to the scan results when it detaches.
vim.api.nvim_create_autocmd({ "LspAttach", "LspDetach" }, {
  group = group,
  callback = function(event)
    local client = vim.lsp.get_client_by_id(event.data.client_id)
    if client and client.name == "eslint" then vim.schedule(publish) end
  end,
})

vim.api.nvim_create_user_command("EslintProject", function() M.run({ loud = true }) end, { desc = "Lint the whole project into diagnostics" })
vim.api.nvim_create_user_command("EslintMode", function(cmd)
  if cmd.args == "" then M.pick_mode() else M.set_mode(cmd.args) end
end, { nargs = "?", complete = function() return { "local", "pinned" } end, desc = "Switch ESLint between local and pinned" })
vim.api.nvim_create_user_command("EslintRules", M.pick_rules, { desc = "Enable/disable reported ESLint rules" })
vim.keymap.set("n", "<leader>xe", M.pick_mode, { desc = "ESLint mode (local/pinned)" })
vim.keymap.set("n", "<leader>xR", M.pick_rules, { desc = "ESLint rules on/off" })

return M
