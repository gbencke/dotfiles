-- ch.8: basedpyright (types, nav, inlay hints). Ruff owns lint/format/imports.
return {
  settings = {
    basedpyright = {
      analysis = {
        typeCheckingMode = "standard",
        diagnosticMode = "workspace",
        autoImportCompletions = true,
        useLibraryCodeForTypes = true,
        autoSearchPaths = true,
        inlayHints = {
          variableTypes = false,
          callArgumentNames = true,
          functionReturnTypes = true,
          pytestParameters = true,
        },
        diagnosticSeverityOverrides = {
          reportUnusedImport = "warning",
          reportImplicitStringConcatenation = false,
        },
      },
    },
    pyright = {
      disableOrganizeImports = true,  -- ruff owns imports (ch.9.2)
    },
  },
}
