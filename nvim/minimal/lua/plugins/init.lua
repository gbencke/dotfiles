-- Plugin specifications
-- Add your plugins here as separate files or in this file

return {
	{
		'https://github.com/goolord/alpha-nvim',
		lazy=false,
		dependencies = { 'https://github.com/nvim-tree/nvim-web-devicons' },
		config = function ()
			require'alpha'.setup(require'alpha.themes.startify'.config)
		end
	},
	{
		'https://github.com/rebelot/kanagawa.nvim',
		lazy=false,
	},
	{
		"nvim-neo-tree/neo-tree.nvim",
		branch = "v3.x",
		dependencies = {
			"nvim-lua/plenary.nvim",
			"MunifTanjim/nui.nvim",
			"nvim-tree/nvim-web-devicons", -- optional, but recommended
		},
		lazy = false, -- neo-tree will lazily load itself
	},

	{
		"nvim-treesitter/nvim-treesitter",
		opts = {
			ensure_installed = {
				"vim", "lua", "vimdoc",
				"html", "css",
				"python",
				"typescript", "javascript", "tsx",
				"go", "gomod", "gowork",
				"c", "cpp",
				"yaml",
				"bash",
			},
		},
	},
	{
		"https://github.com/tpope/vim-fugitive",
		lazy=false
	},
	{
		"https://github.com/lewis6991/gitsigns.nvim",
		lazy=false
	},
	{
		"mason-org/mason.nvim",
		opts = {}
	},
	{
		"hrsh7th/nvim-cmp",
		dependencies = {
			-- Snippet engine & its source
			"L3MON4D3/LuaSnip",
			"saadparwaiz1/cmp_luasnip",

			-- Completion sources
			"hrsh7th/cmp-nvim-lsp",
			"hrsh7th/cmp-buffer",
			"hrsh7th/cmp-path",

			-- For nice icons
			"onsails/lspkind.nvim",
		},
		config = function()
			local cmp = require("cmp")
			local luasnip = require("luasnip")
			local lspkind = require("lspkind")

			cmp.setup({
				snippet = {
					expand = function(args)
						luasnip.lsp_expand(args.body)
					end,
				},
				mapping = cmp.mapping.preset.insert({
					['<C-b>'] = cmp.mapping.scroll_docs(-4),
					['<C-f>'] = cmp.mapping.scroll_docs(4),
					['<C-d>'] = cmp.mapping.close_docs(),
					['<C-Space>'] = cmp.mapping.complete(),
					['<C-e>'] = cmp.mapping.abort(),
					['<CR>'] = cmp.mapping.confirm({ select = true }),
					['<Tab>'] = cmp.mapping(function(fallback)
						if cmp.visible() then
							cmp.select_next_item()
						elseif luasnip.expand_or_jumpable() then
							luasnip.expand_or_jump()
						else
							fallback()
						end
					end, { 'i', 's' }),
					['<S-Tab>'] = cmp.mapping(function(fallback)
						if cmp.visible() then
							cmp.select_prev_item()
						elseif luasnip.jumpable(-1) then
							luasnip.jump(-1)
						else
							fallback()
						end
					end, { 'i', 's' }),
				}),
				sources = cmp.config.sources({
					{ name = 'nvim_lsp' },
					{ name = 'luasnip' },
					{ name = 'buffer' },
					{ name = 'path' },
				}),
				formatting = {
					format = lspkind.cmp_format({
						mode = 'symbol_text',
						maxwidth = 50,
						ellipsis_char = '...',
					})
				},
			})
		end,
	},
	{
		"neovim/nvim-lspconfig",
		lazy = false,
	},
	{
		"williamboman/mason-lspconfig.nvim",
		lazy = false,
		dependencies = {
			"mason-org/mason.nvim",
			"neovim/nvim-lspconfig",
			"hrsh7th/nvim-cmp",
		},
		config = function()
			local mason_lspconfig = require("mason-lspconfig")

			-- Setup mason-lspconfig with automatic server installation
			mason_lspconfig.setup({
				ensure_installed = {
					"pyright",      -- Python
					"lua_ls",       -- Lua
					"ts_ls",        -- TypeScript/JavaScript
					"gopls",        -- Go
					"clangd",       -- C/C++
					"yamlls",       -- YAML/Kubernetes
					"bashls",       -- Bash/Zsh
				},
			})

			-- LSP keybindings when attached to buffer
			local on_attach = function(client, bufnr)
				local opts = { buffer = bufnr, noremap = true, silent = true }
				vim.keymap.set('n', 'gd', vim.lsp.buf.definition, opts)
				vim.keymap.set('n', 'K', vim.lsp.buf.hover, opts)
				vim.keymap.set('n', 'gi', vim.lsp.buf.implementation, opts)
				vim.keymap.set('n', '<C-k>', vim.lsp.buf.signature_help, opts)
				vim.keymap.set('n', '<leader>rn', vim.lsp.buf.rename, opts)
				vim.keymap.set('n', '<leader>ca', vim.lsp.buf.code_action, opts)
				vim.keymap.set('n', 'gr', vim.lsp.buf.references, opts)
			end

			-- Get capabilities from nvim-cmp
			local capabilities = require("cmp_nvim_lsp").default_capabilities()

			-- Configure pyright for Python using native vim.lsp.config
			vim.lsp.config('pyright', {
				cmd = { 'pyright-langserver', '--stdio' },
				filetypes = { 'python' },
				root_markers = { 'pyproject.toml', 'setup.py', 'setup.cfg', 'requirements.txt', 'Pipfile', '.git' },
				on_attach = on_attach,
				capabilities = capabilities,
				settings = {
					python = {
						analysis = {
							typeCheckingMode = "basic",
							autoSearchPaths = true,
							useLibraryCodeForTypes = true,
						}
					}
				}
			})

			-- Configure lua_ls for Lua using native vim.lsp.config
			vim.lsp.config('lua_ls', {
				cmd = { 'lua-language-server' },
				filetypes = { 'lua' },
				root_markers = { '.luarc.json', '.luarc.jsonc', '.luacheckrc', '.stylua.toml', 'stylua.toml', 'selene.toml', 'selene.yml', '.git' },
				on_attach = on_attach,
				capabilities = capabilities,
				settings = {
					Lua = {
						diagnostics = {
							globals = { 'vim' }
						}
					}
				}
			})

			-- Configure ts_ls for TypeScript/JavaScript
			vim.lsp.config('ts_ls', {
				cmd = { 'typescript-language-server', '--stdio' },
				filetypes = { 'javascript', 'javascriptreact', 'typescript', 'typescriptreact' },
				root_markers = { 'package.json', 'tsconfig.json', 'jsconfig.json', '.git' },
				on_attach = on_attach,
				capabilities = capabilities,
			})

			-- Configure gopls for Go
			vim.lsp.config('gopls', {
				cmd = { 'gopls' },
				filetypes = { 'go', 'gomod', 'gowork', 'gotmpl' },
				root_markers = { 'go.work', 'go.mod', '.git' },
				on_attach = on_attach,
				capabilities = capabilities,
				settings = {
					gopls = {
						analyses = {
							unusedparams = true,
						},
						staticcheck = true,
					}
				}
			})

			-- Configure clangd for C/C++
			vim.lsp.config('clangd', {
				cmd = { 'clangd', '--background-index' },
				filetypes = { 'c', 'cpp', 'objc', 'objcpp', 'cuda' },
				root_markers = { 'compile_commands.json', 'compile_flags.txt', '.git' },
				on_attach = on_attach,
				capabilities = capabilities,
			})

			-- Configure yamlls for YAML/Kubernetes
			vim.lsp.config('yamlls', {
				cmd = { 'yaml-language-server', '--stdio' },
				filetypes = { 'yaml', 'yaml.docker-compose', 'yaml.gitlab' },
				root_markers = { '.git' },
				on_attach = on_attach,
				capabilities = capabilities,
				settings = {
					yaml = {
						schemas = {
							kubernetes = '*.yaml',
							["http://json.schemastore.org/github-workflow"] = '.github/workflows/*',
							["http://json.schemastore.org/github-action"] = '.github/action.{yml,yaml}',
							["http://json.schemastore.org/chart"] = 'Chart.yaml',
							["https://json.schemastore.org/dependabot-2.0"] = '.github/dependabot.{yml,yaml}',
							["https://json.schemastore.org/gitlab-ci"] = '*gitlab-ci*.{yml,yaml}',
							["https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/schemas/v3.1/schema.json"] = '*api*.{yml,yaml}',
						},
						format = { enable = true },
						validate = true,
					}
				}
			})

			-- Configure bashls for Bash/Zsh
			vim.lsp.config('bashls', {
				cmd = { 'bash-language-server', 'start' },
				filetypes = { 'sh', 'bash', 'zsh' },
				root_markers = { '.git' },
				on_attach = on_attach,
				capabilities = capabilities,
			})

			-- Enable LSP servers
			vim.lsp.enable('pyright')
			vim.lsp.enable('lua_ls')
			vim.lsp.enable('ts_ls')
			vim.lsp.enable('gopls')
			vim.lsp.enable('clangd')
			vim.lsp.enable('yamlls')
			vim.lsp.enable('bashls')
		end,
	},


}
