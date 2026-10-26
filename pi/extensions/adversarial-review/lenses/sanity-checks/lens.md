---
name: sanity-checks
description: Preconditions before mutation — dependencies exist and are in the expected state before any write, update, delete, or state transition, and every guard has a unit test proving it refuses the write.
signals:
  - always
---

# sanity-checks lens

Always applies. Reviews every path that changes data — DB writes, queue
or table state transitions, file/S3 overwrites, migrations, ops scripts —
and asks: before this write, did the code confirm that what it depends on
exists and is in the state it assumes? And is there a unit test that
proves the guard refuses the write when it is not?

Evidence standard: every finding names (1) the write, (2) the dependency
it assumes, (3) the assumed state, (4) the path showing no check, or an
ineffective one, and (5) the consequence — orphan row, invalid
transition, wrong-environment write, half-applied batch. Every finding
also names the unit test to add: name, arrange/act/assert, and which row
of the minimum test set it covers. Test-gap findings list the test files
searched. The lens reads tests; it never runs them (ADR 0002).

Kill the finding when a DB constraint (FK, unique, check), a conditional
write (`ConditionExpression`, `WHERE status = ...`), or a traced upstream
caller already enforces the precondition.

Boundaries — not this lens:
- The state changes between check and write (needs two actors) →
  concurrency (`#toctou`, `#check-then-act`).
- Timeouts, retries, circuit breakers → chaos.
- What happens after the write fails → error-handling.
- Permission checks → security.
- General coverage gaps unrelated to a precondition guard → tests /
  test-surface. Gaps on a precondition guard cite `sanity#…` here, not
  `tests#…` or `test-surface#unverified-branch`.
