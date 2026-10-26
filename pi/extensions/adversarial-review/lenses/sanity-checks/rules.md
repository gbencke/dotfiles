# sanity-checks rules — verify dependencies before you mutate

One-actor test: if the defect needs two concurrent actors to break, it is
a concurrency finding. If a single actor, running alone, writes on top of
a missing or wrong-state dependency, it belongs here.

First pass — map mutations: every insert, update, delete, state
transition, overwrite, DDL statement, and bulk loop. For each, list the
dependencies it assumes (parent entity, target row, current status,
schema version, environment, tool, input shape) and demand the witness:
the check, constraint, or conditional write that enforces each one, and
the unit test that proves it refuses the write.

Every finding ends with a two-part fix line:
`fix: guard = <check to add>; test = <test name — arrange / act / assert>`.

## A. Dependency exists

- **Parent not verified** — writes a child, foreign key, or reference
  without confirming the parent exists or is COMPLETE. Example: promoting
  a WAIT row to REQUEST without confirming every parent is COMPLETE.
  Confirm no lookup, FK, or condition on the path. Cite
  `sanity#parent-not-verified`.
- **Target not verified** — update/delete on an entity never looked up,
  with no condition that requires it to exist (DynamoDB `UpdateItem`
  without `attribute_exists(pk)` creates the item). Cite
  `sanity#target-not-verified`.
- **Zero rows reported as success** — affected-row count,
  `ConditionalCheckFailedException`, or an empty result ignored; the
  caller is told the change happened. Cite `sanity#zero-rows-success`.

## B. Dependency in expected state

- **State not guarded** — transition with no predicate on the current
  state: `UPDATE ... SET status='REQUEST'` without `AND status='WAIT'`;
  setting COMPLETE on a row that is ERROR. Cite `sanity#state-not-guarded`.
- **Unconditional write** — `PutItem`/`UpdateItem` with no
  `ConditionExpression`, S3/file overwrite with no existence or
  version/ETag check, upsert where only insert was intended. Cite
  `sanity#unconditional-write`.
- **Version assumed** — code assumes a schema, payload, or config version
  it never reads or checks. Cite `sanity#version-assumed`.

## C. The check is weak

- **Check after write** — validation runs after the mutation it should
  guard. Cite `sanity#check-after-write`.
- **Check swallowed** — failed check logs a warning and the write
  proceeds. Cite `sanity#check-swallowed`.
- **Wrong source** — the check reads an eventually consistent source (GSI,
  read replica, cache, search index) and the write trusts it. Confirm the
  read is not strongly consistent. Cite `sanity#check-wrong-source`.
- **Partial check** — only some dependencies checked: one parent of N,
  first page only (DynamoDB Query/Scan without `LastEvaluatedKey` loop,
  1 MB page), first item of a list. Cite `sanity#partial-check`.

## D. Scripts, migrations, ops tooling

- **Environment not asserted** — script mutates without confirming the
  account, `AWS_PROFILE`, region, DB host, or tenant it targets. Cite
  `sanity#env-not-asserted`.
- **Tooling not checked** — uses `aws`, `jq`, `psql`, etc. without
  `command -v`, or a shell script lacks `set -euo pipefail`, so it keeps
  going after a failed step. Cite `sanity#tool-not-checked`.
- **Input not validated up front** — a batch starts writing before every
  input ID/row is validated; a bad row fails it halfway. Cite
  `sanity#input-unvalidated`.
- **Migration assumes schema** — drop/alter/rename with no `IF EXISTS`,
  or a destructive change with no data check first (column not empty,
  table still referenced). Cite `sanity#migration-assumes-schema`.
- **No dry run** — destructive or bulk ops script with no plan/dry-run
  mode showing what would change. Ops scripts only. Cite
  `sanity#no-dry-run`.

## E. Every guard has a unit test

Applies to every guard found or demanded in A–D. Search the test files
for the guard's failure input before reporting; list the files searched.

Minimum test set per guard:

| Case | Arrange | Assert |
|---|---|---|
| Dependency missing | parent/target absent | error returned, **0 writes** |
| Wrong state | dependency exists, unexpected status | error returned, **0 writes** |
| Check source fails | the lookup itself errors/times out | error propagated, **0 writes** |
| Valid | dependency present, expected state | exactly 1 write, guard in its params |

- **Guard untested** — a guard exists but no unit test drives a failing
  case (missing, wrong state, wrong environment). Cite
  `sanity#guard-untested`.
- **Happy path only** — tests cover only "dependency present and valid".
  Cite `sanity#happy-path-only`.
- **Refusal not asserted** — the test triggers the bad precondition but
  asserts only "throws" / "returns error", not that no mutation happened
  (write mock called 0 times, row unchanged). Cite
  `sanity#refusal-not-asserted`.
- **Mock bypasses the guard** — the check is stubbed to always pass, or
  mocked below the guard so it never runs; or a mocked DynamoDB/SQL
  client where no test asserts the `ConditionExpression` / state
  predicate is in the call params. Cite `sanity#mock-bypasses-guard`.
- **Zero rows untested** — no test for "0 rows affected" or
  `ConditionalCheckFailedException`. Cite `sanity#zero-rows-untested`.
- **Partial check untested** — no test with N > 1 dependencies where
  exactly one is bad, or, for paginated sources, the bad item on page 2+.
  Cite `sanity#partial-check-untested`.
- **Script guard untested** — a script's pre-flight block (environment,
  tools, input validation) has no test: bats/pytest, or an assert-based
  self-check when the repo has no harness. Cite
  `sanity#script-guard-untested`.
