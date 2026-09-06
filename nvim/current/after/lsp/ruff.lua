-- ch.9: ruff language server (lint, format, import actions)
return {
  init_options = {
    settings = {
      configurationPreference = "filesystemFirst",
      organizeImports = true,
      fixAll = true,
      showSyntaxErrors = true,
    },
  },
}
