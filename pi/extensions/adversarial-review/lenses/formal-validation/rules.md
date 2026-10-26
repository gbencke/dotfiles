# formal-validation rules — every input, correct result or clean rejection

First pass — map the input domain: for each reviewed function, list its
inputs and where they come from (request, message, file, CLI, caller).
For each input, enumerate the classes in group B and demand the witness:
the schema, guard, or code path that gives the correct result or a clean
rejection for that class, and the test that proves it.

Every finding states the counterexample and ends with a fix line:
`fix: handle = <guard / schema / branch to add>; test = <table row or
property to add>`.

## A. Input contract

- **No contract** — entry point with no declared schema (zod, pydantic,
  JSON Schema, OpenAPI, struct tags); the accepted domain is implicit.
  Cite `formal#no-contract`.
- **Contract drift** — schema and code disagree: field optional in the
  schema, dereferenced unconditionally; enum value in the schema the
  code never handles. Cite `formal#contract-drift`.
- **Raw re-read** — input is validated, then the code reads the raw
  unvalidated object instead of the parsed result. Cite
  `formal#revalidated-raw`.

## B. Input classes

- **Absent** — `null`, `undefined`, `None`, missing key, missing header.
  Cite `formal#absent-value`.
- **Empty** — `""`, `[]`, `{}`, 0-byte file; `x[0]`, `max([])`, divide by
  `len`. Cite `formal#empty-value`.
- **Boundary** — off-by-one, min/max, inclusive vs exclusive ranges, the
  value exactly at a limit. Cite `formal#boundary-value`.
- **Numeric edge** — zero divisor, negatives, overflow, `NaN`/`Infinity`,
  JS numbers above 2^53 (IDs), parse quirks (`"012"`, `" 12"`, `"1e3"`).
  Cite `formal#numeric-edge`.
- **String edge** — Unicode, multibyte cut mid-sequence, BOM,
  whitespace, case, very long strings, separators inside values (CSV,
  pipe). Cite `formal#string-edge`.
- **Temporal edge** — timezone without offset, DST, Feb 29, end of
  month, epoch seconds vs milliseconds, invalid dates. Cite
  `formal#temporal-edge`.
- **Collection edge** — duplicates, assumed ordering, single element,
  huge size, deep nesting. Cite `formal#collection-edge`.
- **Unknown variant** — enum/discriminator from external data the code
  does not handle (new `message_type` upstream): switch with no default,
  or a default that carries on silently. Cite `formal#unknown-variant`.
- **Runtime type confusion** — untyped input of the wrong runtime type:
  `"123"` vs `123`, string `"false"` truthy, array where an object was
  expected. Cite `formal#runtime-type-confusion`.

## C. Clean failure

- **Crash on invalid** — bad input causes an uncaught exception, 500, or
  panic instead of a typed rejection (400, DLQ, skip and record). Cite
  `formal#crash-on-invalid`.
- **Poison loop** — an invalid message is retried forever and blocks the
  queue or partition. Cite `formal#poison-loop`.
- **Silent coercion** — bad input becomes a valid-looking value:
  `Number("")` → 0, `parseInt` → `NaN` that spreads, `Invalid Date`,
  silent truncation. Cite `formal#silent-coercion`.
- **Unactionable rejection** — the rejection does not name the field,
  the value, or why. Cite `formal#rejection-unactionable`.

## D. Invariants

- **Non-total function** — inputs the function does not handle: falls
  through, implicit `undefined`/`None`, missing case. Cite
  `formal#non-total-function`.
- **Invariant unstated** — core transforms whose invariants are never
  asserted: round-trip (`parse(serialize(x)) == x`), idempotence,
  conservation (splits sum to the total), monotonic or ordered output.
  Cite `formal#invariant-unstated`.
- **State-machine gap** — (state, event) pairs with no transition and no
  explicit rejection. Cite `formal#state-machine-gap`.
- **Needs a model check** (advisory) — a protocol or state machine that
  crosses processes or services, with retries, ordering, or partial
  failure (e.g. WAIT → REQUEST → PROCESSING → COMPLETE/ERROR with
  parent/child dependencies and inbound/outbound sync), and no formal
  spec. Propose a TLA+, Alloy, or P spec naming its safety invariants
  ("a child is never COMPLETE before its parents") and liveness
  properties ("no row stays PROCESSING forever"). A concrete
  interleaving bug is a concurrency finding instead. Cite
  `formal#needs-model-check`.

## E. Tests

- **Partition untested** — a group B class reachable at an entry point
  has no test. Table-driven tests are the expected form. Cite
  `formal#partition-untested`.
- **Example only** — tests use only happy, mid-range examples: no
  boundary values, no invalid inputs. Cite `formal#example-only`.
- **No property test** — every reviewed function needs a property-based
  or fuzz test (fast-check, Hypothesis, Go native fuzzing, rapid, …)
  generating inputs across the group B classes and checking the group D
  invariants. The finding names the tool for that language and the
  properties to assert. Cite `formal#no-property-test`.
- **Rejection not asserted** — a test sends invalid input but asserts
  only "throws": it must also assert the error type/fields and that no
  side effect happened. Cite `formal#rejection-not-asserted`.

## Severity

- **P1** — crash, poison loop, or silent coercion on an entry point or in
  money logic; a missing property test at those same places.
- **P2** — a missing input class; a missing property test elsewhere in
  reviewed code.
- **P3** — unactionable rejection; `formal#needs-model-check`.
