-- ch.13.14: yamlls + schemastore (GH Actions, compose, k8s)
return {
  settings = {
    yaml = {
      schemaStore = { enable = false, url = "" },
      schemas = require("schemastore").yaml.schemas(),
      validate = true,
      completion = true,
      hover = true,
      format = { enable = false },  -- prettier owns yaml
    },
  },
}
