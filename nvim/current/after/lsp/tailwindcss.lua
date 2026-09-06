-- ch.13.3: tailwind class intelligence
return {
  settings = {
    tailwindCSS = {
      classAttributes = { "class", "className", "class:list", "ngClass" },
      lint = {
        cssConflict = "warning",
        invalidApply = "error",
        invalidScreen = "error",
        invalidVariant = "error",
        recommendedVariantOrder = "warning",
      },
      experimental = {
        classRegex = {
          { "clsx\\(([^)]*)\\)", "(?:'|\"|`)([^'\"`]*)" },
          { "cn\\(([^)]*)\\)", "(?:'|\"|`)([^'\"`]*)" },
        },
      },
    },
  },
}
