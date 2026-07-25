# test-surface rules — is every changed behavior verified?

Input: the diff, plus (from the orchestrator) the map of test files
referencing changed symbols.

## Enumerate the surface

From the diff, list every behavior-surface element:

- **New/modified public API**: exported functions, endpoints, message
  handlers, CLI flags whose signature or contract changed.
- **New branches**: every added `if`/`switch`/`match` arm, ternary, guard
  clause, default case.
- **Changed conditions**: modified comparison operators, boundary values
  (`>` → `>=` is a classic silent bug).
- **New error paths**: added throw/raise/return-err, new catch handling.
- **Removed behavior**: deleted branches/handlers — was the deletion
  intentional, and does anything still depend on it?

## For each element, answer the kill question

"If I deleted or inverted this changed line, which test goes red?"

- No test references the changed symbol at all → UNVERIFIED (P1 on
  money/auth/data paths, P2 elsewhere).
- A test calls the code but no assertion discriminates the new behavior
  (would pass with the line deleted) → HOLLOW COVERAGE (P2). Example:
  new `if (retry)` branch, tests exercise only the non-retry path.
- Changed boundary (`>` → `>=`) with no test at the boundary value →
  P2; P1 if the boundary is a limit/threshold.
- Error path added but no test triggers the error → P2.

## Also check

- Tests changed in the diff: were assertions WEAKENED to make the change
  pass (deleted asserts, widened tolerances, updated snapshots without
  explanation)? That is the change hiding its own breakage — P1.
- New dependencies/config the tests mock away entirely — nothing verifies
  the real wiring (config keys, env vars, serialization).

Cite as `test-surface#unverified-branch`, `test-surface#hollow-coverage`,
`test-surface#weakened-assert`, …
