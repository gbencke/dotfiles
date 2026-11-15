# AI-Assisted Development Tools

Prompts, guidelines, and shell functions for AI-assisted code review and development.

## Structure

### Guidelines (`guidelines/`)
- **bootstrap.prompt.md** - Development principles (incremental progress, learning from code, testing first)
- **good_general_guideline.md** - Writing guidelines (Zinsser method: brevity, clarity, active voice)

### PR review prompts (`pr/`)
- **general/pr_guidelines_architecture.md** - Code review checklist (SOLID, naming, anti-patterns, architecture)
- **general/pyramid_refactoring.md** - Refactoring checklist (micro-refactorings, design, architecture)
- **general/pull_request_review_template.md** - Pull request review template
- **golang/** - Go review prompt (`prompt/golang.review.md`) and review agent (`agents/agent-golang-review.md`)
- **python/** - Python review prompts: general, argparse, args, psycopg, pydantic, requests

### Spec-driven development (`spec-driven-dev/`)
Templates for each phase: business requirements, technical requirements, technical design, implementation, and a quality-gate assessment.

### Tool configs (`tools/`)
- **claude/** - Claude Code agents (senior code reviewer, software architect, test automation engineer) and commands (`commit`, `review-code`, `check-names-*` for C++, C#, Python, TypeScript)
- **copilot/** - The same commands as GitHub Copilot prompt files
- **litellm/litellm.config.yaml** - LiteLLM proxy config for OpenRouter models (Qwen, Claude, DeepSeek)

### Shell functions (`scripts/`, zsh)
- **prompts.sh** - Generate PR descriptions and code reviews via AI
- **summarize.sh** - Summarize YouTube videos and PDFs via AI

## Usage

`shells/zshrc` sources both scripts:
```bash
source ~/git.work/000.INFRA/dotfiles/prompts/scripts/prompts.sh
source ~/git.work/000.INFRA/dotfiles/prompts/scripts/summarize.sh
```

Review code changes (context window, command prompt, persona):
```bash
review_code_pr staged pr_guidelines_architecture.md bootstrap.prompt.md
```
Context windows: `staged`, `staged_dependencies`, `staged_diff`, `all`.

Generate a PR description from a short summary of the change:
```bash
generate_pr_description "Short description of the change"
# create_pr_only_description and create_pr_complete take the same argument
```

Summarize a YouTube video or PDF:
```bash
summarize_yt <video_url>
summarize_pdf <pdf_path>     # or summarize_pdf_lmstudio, summarize_pdf_openrouter
```
