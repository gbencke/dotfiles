# Pi Extensions

This directory contains the TypeScript implementations for the custom tools and capabilities provided to the Pi AI Coding Agent. 

These extensions are loaded dynamically and register various functions that the agent can invoke during its reasoning process.

## Available Extensions

- **`context7.ts`**: Implements tools to search the Context7 library index and fetch high-quality documentation snippets.
- **`lsp.ts`**: Implements Language Server Protocol features (diagnostics, definitions, hover) using `ast-grep` and `typescript-language-server`.
- **`obscura.ts`**: Provides web scraping and headless browser capabilities via the Obscura engine.
- **`tavily.ts`**: Integrates Tavily AI search to allow the agent to search the web for recent documentation or solutions.
- **`tools-command.ts`**: Implements a `/tools` slash command to list all available tools to the user in the agent's UI.
