# Pi AI Coding Agent Configuration

This directory contains the configuration, extensions, and custom skills for the Pi AI Coding Agent.

## Directory Structure

- **`SYSTEM.md`**: Core system instructions and developer guidelines loaded by the agent.
- **`settings.json`**: Global agent settings (e.g., default provider and model).
- **`auth.json`**: Credentials and keys for various services used by the agent (e.g., Anthropic, Gemini, Tavily, Context7). Keep this file ignored from version control if it contains real secrets.
- **`skills/`**: Metadata and instructions for specialized tools the agent can use.
  - `context7/`: Integration for context documentation retrieval.
  - `lsp/`: Integration for structural code analysis via ast-grep.
  - `obscura/`: Web scraping capabilities using the Obscura headless browser.
  - `tavily/`: AI-powered web search capabilities.
- **`extensions/`**: TypeScript implementations for the tools exposed by the skills.
- **`bin/`**: Helper scripts or binaries used by the agent.
- **`sessions/`**: Stores chat history and context for past sessions.

## Usage

These configurations are loaded automatically when you run the Pi AI Coding Agent from the terminal. 
Make sure your API keys are correctly set either in your environment variables or in `auth.json` for skills like Tavily and Context7 to function properly.
