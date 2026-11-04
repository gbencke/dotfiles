# Review Skills

Skills for analyzing code, diagnosing bugs, and running structured reviews.

## Skills

| Skill | What it does |
|-------|--------------|
| `change-amplification` | Detect architectural debt by analyzing merged PRs for scattered changes forced by one conceptual decision. |
| `codegraph` | Read a repo through its pre-indexed knowledge graph instead of grepping: source, call paths, blast radius, and covering tests in one call. Needs the `codegraph` pi extension. |
| `diagnose` | Run a disciplined diagnosis loop for hard bugs and performance regressions. |
| `pinned-eslint` | Lint any JS/TS repo with a pinned ESLint 9 and plugin set inside a bubblewrap sandbox with no network access. Bundles its own runner; macOS uses a Lima VM with shared folders. |
| `pinned-debt` | Measure technical debt and cognitive load (cognitive complexity, duplication, change amplification, hotspots) in JS/TS and Python repos with pinned tools inside a bubblewrap sandbox, repos read-only. macOS uses the same Lima VM as pinned-eslint. |
| `possibility-analysis` | Explore the solution space before committing to a decision. |
| `thermo-nuclear-code-quality-review` | Run an extremely strict maintainability review focused on abstraction quality and structural simplification. |
| `zoom-out` | Step back and provide broader context for unfamiliar code. |

## Common use cases

- Code review
- Debugging
- Architecture assessment
- Pre-decision exploration

## Runner checks

Run `python3 -B -m unittest discover -s skills/review -p 'test_pinned_*.py'` from the repo root. These tests check macOS dispatch, Linux sandbox use, editor cache paths, and formatter lookup without starting a VM or installing packages.
