-- ch.6.3/13.6: jsonls + schemastore, formatting disabled (prettier owns it)
return {
  on_init = function(client)
    client.server_capabilities.documentFormattingProvider = false
  end,
  settings = {
    json = {
      schemas = require("schemastore").json.schemas(),
      validate = { enable = true },
    },
  },
}
