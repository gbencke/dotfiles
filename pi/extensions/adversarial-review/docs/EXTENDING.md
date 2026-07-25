# Extending adversarial-review

Lenses are data. Every extension below is "add markdown, run again" — no
TypeScript, no registration, no restart of anything except the review itself.

## Add rules to an existing lens

Edit `lenses/<name>/rules.md`. Rules are a checklist the reviewer walks and
the challenger consults. Effective rules have three parts: the defect
pattern, how to confirm it, and a cite id.

```markdown
- **Pagination missing on list endpoints** — handler returns the full
  collection; confirm by checking for limit/offset params. Cite
  `mylens#no-pagination`.
```

Keep rules adversarial-review-shaped: each must be checkable by reading
code. Rules that require runtime data belong in a comment saying what a
human must check (the challenger will route them to AMBIGUOUS).

## Project-level overrides (per reviewed repo)

Create `.gbencke/adversarial-review/lenses/` in the repo being reviewed:

```
your-repo/.gbencke/adversarial-review/lenses/
├── aws/
│   └── rules.md          ← appended AFTER the global aws rules
└── pci-dss/              ← a repo-only lens
    ├── lens.md
    └── rules.md
```

Same-named lenses merge (global rules first, project rules appended — use
this for team conventions). New names add lenses that exist only for that
repo. No config file; the directory is the config.

## Add a new lens

1. `mkdir lenses/<name>` in the extension (or in the repo overlay).
2. Write `lens.md`:

```markdown
---
name: my-lens
description: One line — what this lens hunts.
signals:
  - "*.proto"        # globs, dependency names, or "always" / "change-only"
---

# my-lens

When it applies and what it reviews. The orchestrator reads this to decide.
```

3. Write `rules.md` — the domain checklist, with cite ids.
4. Run a review. The lens is picked up by signal match. No other step.

Signals: strings are matched against file paths and dependency names in the
repo. `always` = every review. `change-only` = skipped for repo reviews.

## Add a new skill (a new review shape)

The two skills are markdown procedures. To add a third shape (e.g.
`review-infra-plan`), copy `skills/review-change/SKILL.md`, adjust the
phases, and register one command in `index.ts` following the existing
two-line pattern.

## Tune the agent stances

`agents/reviewer.md`, `agents/challenger.md`, `agents/judge.md` are the
shared constitution every lens inherits: the finding contract, the kill
strategies, the verdict rules. Change them deliberately — every lens feels
it. Template slots: `{{LENS_NAME}}`, `{{RULES}}`, `{{SCOPE}}`,
`{{TARGET_DIR}}`, `{{FINDINGS}}`, `{{MODE}}`, `{{INTENT}}`, `{{CONTEXT}}`.

## Model and concurrency

Reviewers/challengers/judge run on pi's default model with the subagents
extension's queue (default concurrency 4). For higher-stakes reviews, run
pi with a stronger default model rather than hardcoding one here — see
ADR 0001 for why the judge's model matters most.

## Guidelines

- Prefer many narrow rules over few broad ones — narrow rules produce
  specific, killable findings.
- Every rule needs a cite id; findings cite them, and cite ids are how you
  measure which rules fire.
- Test a new lens on a repo with known issues before trusting it in CI.
- If a lens's findings keep dying to the challenger, the lens's rules are
  too speculative — tighten them; the false-positive budget is the whole
  point (ADR 0001).
