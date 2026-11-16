# Review Skills

Skills for analyzing code, diagnosing bugs, and running structured reviews.

## Skills

| Skill | What it does |
|-------|--------------|
| `ai-reverse-engineering` | Reverse-engineer an authorized app into an evidence-backed blueprint: modules, workflows, rules, data, APIs, and user journeys. |
| `change-amplification` | Detect architectural debt by analyzing merged PRs for scattered changes forced by one conceptual decision. |
| `codegraph` | Read a repo through its pre-indexed knowledge graph instead of grepping: source, call paths, blast radius, and covering tests in one call. Needs the `codegraph` pi extension. |
| `diagnose` | Run a disciplined diagnosis loop for hard bugs and performance regressions. |
| `pinned-eslint` | Lint JS/TS in a network-isolated bubblewrap sandbox; macOS uses a Lima VM. Require explicit TypeScript return types. Review React code for no `useEffect`, separate visual and HOC files, HOC-owned types and globals, and no explanatory comments. |
| `pinned-debt` | Measure technical debt and cognitive load (cognitive complexity, duplication, change amplification, hotspots) in JS/TS and Python repos with pinned tools inside a bubblewrap sandbox, repos read-only. macOS uses the same Lima VM as pinned-eslint. |
| `possibility-analysis` | Explore the solution space before committing to a decision. |
| `thermo-nuclear-code-quality-review` | Run an extremely strict maintainability review focused on abstraction quality and structural simplification. |
| `zoom-out` | Step back and provide broader context for unfamiliar code. |

## Common use cases

- Code review
- Debugging
- Architecture assessment
- Reverse-engineering an existing app
- Pre-decision exploration

## Runner checks

Run `python3 -B -m unittest discover -s skills/review -p 'test_pinned_*.py'` from the repo root. These tests check macOS dispatch, Linux sandbox use, editor cache paths, and formatter lookup without starting a VM or installing packages.

Run `python3 -B skills/review/pinned-eslint/test_explicit_returns.py` to check explicit return annotations. This runs pinned ESLint against 15 pairs of valid and invalid TypeScript fixtures. On macOS, it requires the Lima VM.
