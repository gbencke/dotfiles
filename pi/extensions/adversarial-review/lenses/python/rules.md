# python rules — semantics that bite at runtime

## Evaluation-time traps (the code reads correctly and is wrong)

- **Mutable default argument** — `def f(x=[])` / `={}` / `=set()` /
  `=SomeObject()`: the default is created once at def time and shared by
  every call. Confirm by checking whether the body mutates it. Fix:
  `=None` + `x = x if x is not None else []`. `py#mutable-default`
- **Late-binding closure** — lambda/def inside a loop capturing the loop
  variable (`[lambda: i for i in range(3)]`, handlers registered in a loop):
  every closure sees the final value. Bind with a default arg or
  `functools.partial`. `py#late-binding-closure`
- **Class-body mutable attribute used as instance state** — `class C:
  items = []` then `self.items.append(...)`: shared across all instances.
  `py#class-level-mutable`
- **Decorator without `functools.wraps`** — loses `__name__`, `__doc__`,
  signature; breaks introspection, Sphinx, and framework routing that reads
  the wrapped function. `py#decorator-no-wraps`
- **Module-import side effects** — network/DB/file IO, env reads, or client
  construction at module top level: import order becomes load-bearing and
  tests can't run offline. `py#import-side-effects`

## Identity, equality, copying

- **`is` on values** — `x is 0`, `s is "abc"`, `x is ()`: works by interning
  accident and breaks silently. `is` is only for `None`/sentinels/identity.
  `py#is-on-value`
- **Truthiness where existence was meant** — `if not x:` guarding a value
  that can legitimately be `0`, `""`, `[]`, or `False`; use `if x is None:`.
  Same defect in `or`-defaults: `timeout = arg or 30` swallows `0`.
  `py#falsy-vs-none`
- **`__eq__` without `__hash__`** — defining `__eq__` sets `__hash__ = None`
  (unhashable) or, if hash is inherited, breaks the hash/eq contract and
  corrupts dict/set lookups. Same for `@dataclass(eq=True)` used as a key
  without `frozen=True`. `py#eq-hash-contract`
- **Shallow copy of nested structure** — `dict(d)` / `d.copy()` /
  `list(rows)` then mutating an inner element, and the caller's data changes
  with it. `py#shallow-copy`
- **Mutating a caller-owned argument** — function mutates a passed
  list/dict/DataFrame without saying so in the name or docstring; the caller
  has no way to know. `py#argument-mutation`

## async / await (blocking the loop is the #1 asyncio defect)

- **Blocking call inside `async def`** — `requests.*`, `time.sleep`,
  `open()/read()`, `subprocess.run`, sync DB drivers (`psycopg2`, `boto3`,
  sync SQLAlchemy), CPU-heavy loops. One of these stalls *every* task on
  the loop. Confirm: the call has no `await` and isn't wrapped in
  `asyncio.to_thread` / `run_in_executor`. `py#blocking-in-async`
- **Unawaited coroutine** — a call to an `async def` whose result is
  discarded or truthiness-tested: nothing runs, no error, `RuntimeWarning`
  at best. `py#unawaited-coroutine`
- **Fire-and-forget task with no strong reference** — `asyncio.create_task(...)`
  whose handle is dropped: the task can be garbage-collected mid-flight and
  its exception is never retrieved. Keep the reference (or a task set) and
  await it. `py#orphan-task`
- **`gather` without `return_exceptions` handling** — first exception
  propagates while siblings keep running unmonitored; or
  `return_exceptions=True` and the results list is never inspected for
  `Exception` members. `py#gather-error-loss`
- **No timeout on an awaited IO call** — `await client.get(...)` /
  `await conn.execute(...)` with no `asyncio.timeout` / `timeout=`: one slow
  peer pins the task forever. `py#missing-async-timeout`
- **Sync/async duplication drift** — a sync and an async version of the same
  logic maintained side by side; one will get the bug fix. `py#sync-async-drift`

## Threads, processes, GIL

- **Threads for CPU-bound work** — `ThreadPoolExecutor` over pure-Python
  compute: the GIL serializes it, so this adds overhead and no speedup. Use
  processes (or a native lib that releases the GIL). Mirror finding:
  processes for pure IO fan-out = needless pickling and memory.
  `py#gil-wrong-executor`
- **Shared mutable state across threads** — module global, class attribute,
  or shared dict/list written from worker threads with no lock. `+=` and
  `d[k] = d[k] + 1` are not atomic. `py#thread-shared-state`
- **Unbounded pool / queue** — worker count or `queue.Queue()` with no
  `maxsize`, i.e. no backpressure: memory grows until the OOM killer wins.
  `py#unbounded-concurrency`
- **Executor without shutdown** — pool created outside a `with` block and
  never `shutdown()`; also `multiprocessing` without a join, leaving
  zombies. `py#executor-not-closed`
- **Non-fork-safe object crossing a process boundary** — DB connection,
  socket, or client created pre-fork and used in the child. `py#fork-unsafe-handle`

## Resources & lifecycle

- **File/socket/connection opened without a context manager** — `open()`,
  `connect()`, `Session()` assigned and closed manually (or not at all) on
  paths where an exception skips the close. `py#missing-context-manager`
- **Cleanup outside `finally`** — release/rollback/close after code that can
  raise, with no `try/finally` or `contextlib.ExitStack`. `py#cleanup-not-guaranteed`
- **Unbounded materialization** — `.fetchall()`, `.read()`, `list(...)` over
  a source whose size is caller- or data-controlled; use iteration/chunking.
  `py#unbounded-read`
- **Generator consumed twice** — a generator/`map`/`zip` iterated, then
  iterated again (second pass is empty) or `len()`-ed. `py#exhausted-iterator`

## Exceptions (Python-specific shapes; taxonomy lives in error-handling lens)

- **`except Exception` / bare `except` swallowing** — no re-raise, no
  logging with `exc_info`, control continues as if nothing happened. Bare
  `except:` additionally catches `KeyboardInterrupt`/`SystemExit`.
  `py#broad-except`
- **Context lost on re-raise** — `raise NewError(str(e))` instead of
  `raise NewError(...) from e`; the original traceback is gone.
  `py#lost-exception-chain`
- **`return` inside `finally`** — silently discards the pending exception or
  the try-block's return value. `py#return-in-finally`
- **Retry without idempotency or backoff** — a retry loop around a
  non-idempotent write, or `while True` retry with no cap and no sleep.
  `py#unsafe-retry`
- **Assert as a runtime check** — `assert` validating input or invariants:
  removed entirely under `python -O`. `py#assert-as-validation`

## Typing & public API

- **`Any` as an escape hatch** — annotation, `cast(Any, ...)`, or an untyped
  boundary (`json.loads`, `yaml.safe_load`, `**kwargs: Any`) whose value
  flows into typed code unvalidated. Validate at the boundary (pydantic /
  dataclass + parse), then let types flow. `py#any-escape-hatch`
- **`# type: ignore` without a reason** — and blanket
  `ignore_errors`/`ignore_missing_imports` widening in config.
  `py#unexplained-type-ignore`
- **Optional not handled** — a value typed/documented as `T | None` used
  without a `None` branch (attribute access, arithmetic, indexing).
  `py#unchecked-optional`
- **Concrete container in a parameter type** — `list[str]`/`dict[...]`
  parameters where `Sequence`/`Iterable`/`Mapping` is the honest contract
  (accept broad, return concrete). `py#narrow-param-type`
- **`Protocol` opportunity / one-implementation ABC** — an abstract base
  class or interface with a single implementation, existing only for
  mockability. `py#speculative-abstraction`
- **Stringly-typed domain** — `str` parameters where a `Literal[...]` union
  or `enum` models the real set of values; magic numbers/strings inline.
  `py#stringly-typed`
- **Accidental public surface** — new module-level names with no `__all__`,
  positional args that should be keyword-only (`*`), or a signature change
  to an existing public function (silent break for callers).
  `py#unstable-public-api`

## Data & correctness

- **Float for money** — `float`/`round()` on currency; use `Decimal` with an
  explicit quantize and rounding mode. `py#float-money`
- **Naive datetime** — `datetime.now()` / `utcnow()` / naive parsing used
  where an aware UTC instant is meant; naive-vs-aware comparison raises.
  `py#naive-datetime`
- **`dict` order / `set` order as logic** — output, hashing, or IDs derived
  from set iteration order (not deterministic across runs with hash
  randomization). `py#nondeterministic-order`
- **f-string / `%` SQL or shell** — query built by interpolation instead of
  parameters; `subprocess(..., shell=True)` with interpolated input. Reach
  for parameter binding and an argv list. `py#interpolated-command`
- **Unsafe deserialization** — `pickle.loads`, `yaml.load` without
  `SafeLoader`, `eval`/`exec`, `marshal`, or `torch.load` on data that
  crosses a trust boundary (request body, S3 object, cache, queue message).
  Arbitrary code execution, not a style nit. `py#unsafe-deserialization`
- **Secret or PII in logs/exceptions** — token, password, connection string,
  or full request body passed to `logger`/`repr`/exception message.
  `py#secret-in-logs`

## Performance, Python-shaped

- **Membership test against a list** — `x in big_list` in a loop → O(n·m);
  build a `set`/`dict` once. `py#linear-membership`
- **String concatenation in a loop** — `s += ...`; use `"".join`.
  `py#string-concat-loop`
- **Repeated work inside the loop** — attribute/global lookup, `re.compile`,
  config parse, client construction, or a query per iteration that is
  loop-invariant. `py#loop-invariant-work`
- **Hand-rolled stdlib** — a custom cache instead of `functools.lru_cache`
  /`cache`, custom counting instead of `collections.Counter`, manual
  grouping instead of `defaultdict`/`itertools.groupby`, manual retry
  instead of an installed `tenacity`/`urllib3.Retry`. `py#reinvented-stdlib`
- **Row-by-row DB/API work** — a call per item where the driver offers
  `executemany`/batch/bulk endpoints. `py#no-batching`
- **Missing `__slots__` on a high-cardinality class** — only a finding when
  the code shows >~10k instances alive at once. `py#missing-slots`

## Tests (Python-specific; coverage strategy lives in the tests lens)

- **Order-dependent test state** — module-level fixture data, class
  attributes, `monkeypatch` replaced by direct assignment, or a
  session-scoped mutable fixture: passes alone, fails under `-p xdist`
  or reordering. `py#test-shared-state`
- **`mock.patch` on the wrong target** — patching where the symbol is
  *defined* rather than where it's *looked up*, so the real thing still
  runs. `py#patch-wrong-target`
- **Over-mocked internals** — mocks asserting private call sequences instead
  of behavior; the test breaks on every refactor and catches no bug.
  `py#mock-implementation-coupling`
- **Non-deterministic test** — real clock, real network, real random, or
  `sleep`-based synchronization. `py#flaky-test-source`

Severity: unsafe deserialization, interpolated SQL/shell, secrets in logs,
blocking-in-async on a request path, thread-shared-state on a write path,
float-money = **P0/P1**. Mutable defaults, late-binding closures, missing
context managers, unbounded reads/queues, lost exception chains,
unchecked optionals = **P1**. Typing hatches, stringly-typed APIs,
reinvented stdlib, loop-invariant work, test smells = **P2**.
`__slots__`, naming, narrow param types = **P3**.

Findings must name the file, the symbol, and the input or interleaving that
triggers the defect. "Could be slow" without a hot path, or "should use
`Decimal`" on a non-money float, dies to the challenger.
