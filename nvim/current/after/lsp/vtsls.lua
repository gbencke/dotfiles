-- ch.11/12: vtsls + Vue hybrid-mode plugin wiring
local vue_plugin_path = vim.fn.expand("$MASON/packages/vue-language-server")
  .. "/node_modules/@vue/language-server"

return {
  settings = {
    complete_function_calls = true,
    vtsls = {
      enableMoveToFileCodeAction = true,
      autoUseWorkspaceTsdk = true,
      experimental = {
        completion = { enableServerSideFuzzyMatch = true },
      },
      tsserver = {
        globalPlugins = {
          {
            name = "@vue/typescript-plugin",
            location = vue_plugin_path,
            languages = { "vue" },
            configNamespace = "typescript",
          },
        },
      },
    },
    typescript = {
      format = { enable = false },  -- prettier owns formatting (ch.6.3)
      updateImportsOnFileMove = { enabled = "always" },
      suggest = { completeFunctionCalls = true, autoImports = true },
      preferences = {
        importModuleSpecifier = "non-relative",
        includePackageJsonAutoImports = "auto",
      },
      inlayHints = {
        parameterNames = { enabled = "literals" },
        parameterTypes = { enabled = true },
        variableTypes = { enabled = false },
        propertyDeclarationTypes = { enabled = true },
        functionLikeReturnTypes = { enabled = true },
        enumMemberValues = { enabled = true },
      },
    },
    javascript = {
      format = { enable = false },
      updateImportsOnFileMove = { enabled = "always" },
      inlayHints = {
        parameterNames = { enabled = "literals" },
        parameterTypes = { enabled = true },
        variableTypes = { enabled = false },
        functionLikeReturnTypes = { enabled = true },
      },
    },
  },
}
