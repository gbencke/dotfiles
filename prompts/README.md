# AI-Assisted Development Tools

Prompts, guidelines, and shell functions for AI-assisted code review and development.

## Structure

### Guidelines
- **guidelines/bootstrap.prompt.md** - Development principles (incremental progress, learning from code, testing first)
- **guidelines/good_general_guideline.md** - Writing guidelines (Zinsser method: brevity, clarity, active voice)

### PR Review
- **pr.guides/pr_guidelines_architecture.md** - Code review checklist (SOLID, naming, anti-patterns, architecture)
- **pr.guides/pyramid_refactoring.md** - Refactoring checklist (micro-refactorings, design, architecture)

### Shell Functions
- **prompts.sh** - Generate PR descriptions and code reviews via AI
- **summarize.sh** - Summarize YouTube videos and PDFs via AI

### Configuration
- **litellm/litellm.config.yaml** - LiteLLM proxy config for OpenRouter models (Qwen, Claude, DeepSeek)
- **claude/** - Claude-specific prompts and configurations

## Usage

Source the functions:
```bash
source ~/dotfiles/prompts/prompts.sh
source ~/dotfiles/prompts/summarize.sh
```

Review code changes:
```bash
review_code_pr stash pr_guidelines_architecture.md
```

Generate PR description:
```bash
create_pr_description
```

Summarize YouTube video:
```bash
summarize_youtube <video_url>
```

Summarize PDF:
```bash
summarize_pdf <pdf_path>
```
