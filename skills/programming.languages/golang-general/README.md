# Go Code Review Checklist

A structured checklist for reviewing Go code during PR review, design review, or self-review.

## Topics covered

- Style & idioms
- Error handling
- Design patterns
- Project architecture
- Concurrency
- Testing
- Performance
- Security

## Severity tags

Each item is tagged:

- **MUST** — blocks merge.
- **SHOULD** — needs justification if not followed.
- **CONSIDER** — advisory.

## Output

Findings are reported as a markdown table:

```markdown
| Severity | Section | Finding | Suggestion |
```

## Files

- `SKILL.md` — the complete checklist and application instructions.
