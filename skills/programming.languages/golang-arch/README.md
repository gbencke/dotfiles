# Go Monorepo Architecture

Advice on Go monorepo architecture for 10–50 service codebases using a single `go.mod`, DDD/hexagonal (ports-and-adapters) design, GitHub Actions CI/CD, and monorepo-wide releases.

## Topics covered

- Module layout following `go.dev/doc/modules/layout`.
- DDD package structure: domain, application, adapter, port.
- Dependency rules and linting boundaries.
- Testing strategy.
- CI/CD patterns.
- Modern Go patterns.

## Files

- `SKILL.md` — the full architecture guide and decision framework.
