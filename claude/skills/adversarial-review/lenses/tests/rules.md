# tests rules — coverage gaps and hollow tests

## Coverage gaps

- Source files with NO matching test file (`foo.ts` without `foo.test.ts` /
  `test_foo.py` / `foo_test.go` — adapt to the repo's convention). Weight by
  criticality: money, auth, data-mutation paths untested = P1; leaf utils
  untested = P3.
- Coverage report present: files/functions under the repo's own apparent
  floor, especially files with <50% line coverage in critical paths.
- Test files that exist but don't import the module they claim to test
  (zombie test files left after a rename).

## Hollow tests (assert nothing)

- Test bodies with no assertions (no `assert`/`expect`/`*_EQ`).
- Assertions only on "does not throw" or on mocks (`verify` that a mock was
  called — never that the result is right).
- `expect(true).toBe(true)`, tautological asserts, commented-out assertions.
- Tests that catch and swallow the exception they should assert on.
- Snapshot-only tests on business logic — any change passes by updating the
  snapshot; flag when snapshots are the ONLY assertion on critical paths.

## Test smells that predict pain

- Shared mutable fixtures mutated across tests; order-dependent tests
  (test B fails if run before test A).
- Sleeps instead of synchronization (`sleep(1000)` to "wait for" async work).
- Tests that hit network/DB/filesystem without marking/seam — the flakiness
  factories.
- `it.skip` / `test.skip` / `@pytest.mark.skip` without a linked reason,
  especially on tests covering critical paths (someone disabled a red test).
- Giant setup blocks: the test needs 200 lines of arrangement to call the
  function — the code under test is untestable-by-design; flag the design,
  not the test.

Cite as `tests#no-test-file`, `tests#hollow-assert`, `tests#skipped-critical`, …
