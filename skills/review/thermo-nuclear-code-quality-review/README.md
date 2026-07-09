# Thermo-Nuclear Code Quality Review

Run an extremely strict maintainability review focused on abstraction quality, structural simplification, and codebase health.

## Core rules

- Be ambitious about structural simplification.
- Do not let a PR push a file from under 1k lines to over 1k lines without a strong reason.
- Do not allow random spaghetti growth.
- Bias toward cleaning the design, not just accepting working code.
- Prefer direct, boring, maintainable code over magical code.
- Push hard on type and boundary cleanliness.

## When to use

Use this skill for an especially harsh maintainability review, deep code quality audit, or thermonuclear review.

## Files

- `SKILL.md` — the full review prompt and non-negotiable standards.
