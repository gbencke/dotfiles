-- ch.13.1: official eslint server (flat config native)
return {
  settings = {
    eslint = {
      -- useFlatConfig = false,   -- legacy .eslintrc projects only
      workingDirectories = { mode = "auto" },
      format = false,            -- prettier owns formatting
      run = "onType",
    },
  },
}
