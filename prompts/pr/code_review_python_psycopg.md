# Psycopg Code Review Checklist

*A Zinsser-method checklist: each item earns its place by being clear, necessary, and actionable. No filler.*

---

## 1 — Boundary Safety: How Data Enters the Query

The single most important principle in database code: **the query structure and the data it operates on must travel separately**. Psycopg3 enforces this at the protocol level via server-side parameter binding — but only if you let it.

- [ ] **No string formatting in queries.** No f-strings, no `%` formatting, no `.format()` to inject values into SQL. Ever.
- [ ] **Placeholders used correctly.** Values use `%s` (positional) or `%(name)s` (named) — never manually quoted.
- [ ] **`sql.SQL` used for dynamic structure.** Table names, column names, and other identifiers use `sql.Identifier()`, not string concatenation.
- [ ] **Template strings (3.3+) used correctly.** If using Python 3.14 t-strings: values are plain `{var}`, identifiers use `{var:i}`, literals use `{var:l}`. The *format specifier* determines how psycopg treats the expression — this is the safety contract.
- [ ] **`sql.Literal()` used sparingly.** Client-side literal embedding bypasses server-side binding. Justify every use.

**The principle:** The PostgreSQL wire protocol separates parse and bind phases. Server-side binding means the SQL parser *never sees* your data. This is not escaping — it's structural separation. Psycopg3 defaults to this. Your job is to not circumvent it.

---

## 2 — Connection Lifecycle: Who Owns What, and For How Long

A connection is a stateful TCP session with a PostgreSQL backend process. It's expensive to create, dangerous to leak, and carries implicit transaction state. Treat it like a scarce resource with clear ownership.

- [ ] **Connections used as context managers.** `with psycopg.connect(...) as conn:` ensures cleanup on both success and failure. No orphaned connections.
- [ ] **Connection scope is minimal.** The connection is held only as long as needed. No "open at import time, close never" patterns (unless pool-managed).
- [ ] **`autocommit` set deliberately.** The default is `False` (transactional). If `autocommit=True` is set, there's an explicit reason (DDL, VACUUM, LISTEN/NOTIFY). The reviewer understands *why*.
- [ ] **No bare `connect()` without cleanup.** If not using `with`, there must be explicit `close()` in a `finally` block. This is non-negotiable.
- [ ] **Async connections use `async with`.** `AsyncConnection` follows the same ownership rules but in the async world. Be aware: `async with` on `AsyncConnection` has subtleties around event loop ownership.

**The principle:** A connection is a lease on a backend process. Like any lease, it should have a clear start, a clear end, and a responsible party. Context managers are the Pythonic lease contract.

---

## 3 — Transaction Boundaries: Making Intent Explicit

Psycopg3 changed the transaction model from psycopg2. The `with connection` block now commits-and-closes (not just commits). Explicit transaction blocks via `conn.transaction()` are the intended way to express transactional intent.

- [ ] **`conn.transaction()` used for multi-statement atomicity.** If two or more statements must succeed or fail together, they're inside `with conn.transaction():`.
- [ ] **Nested transactions use savepoints correctly.** `conn.transaction()` inside another `conn.transaction()` creates a savepoint. The reviewer confirms this nesting is intentional.
- [ ] **No long-held transactions.** Transactions hold locks. If a transaction spans a network call, a user interaction, or any unbounded wait — flag it.
- [ ] **Error handling doesn't swallow rollbacks.** A bare `except: pass` inside a transaction block silently commits on exit. Ensure exceptions propagate to trigger rollback.
- [ ] **Read-only transactions declared when appropriate.** `conn.read_only = True` or isolation level set for read-heavy workloads signals intent and enables PostgreSQL optimizations.

**The principle:** A transaction is a promise to the database: "these changes are atomic." Psycopg3 makes you *spell out* that promise rather than hiding it inside connection context. This is a feature, not a burden.

---

## 4 — Connection Pooling: Amortizing the Expensive Thing

Creating a TCP connection, authenticating, and spawning a backend process takes tens of milliseconds. A pool amortizes this cost across requests. But a pool is a shared mutable resource — it demands discipline.

- [ ] **Pool exists for multi-request workloads.** Web apps, APIs, workers — yes. One-shot scripts — probably not.
- [ ] **`pool.connection()` used as a context manager.** This is the only safe checkout/return pattern. The connection goes back to the pool on block exit.
- [ ] **`min_size` and `max_size` set with intent.** These aren't arbitrary. `min_size` reflects baseline concurrency; `max_size` reflects the database's `max_connections` budget divided across all clients.
- [ ] **`max_lifetime` configured.** Connections go stale (DNS changes, credential rotation, server restarts). `max_lifetime` forces recycling. Cloud databases particularly need this.
- [ ] **Pool opened and closed with application lifecycle.** `open=False` at creation, explicit `open()` at startup, `close()` at shutdown. FastAPI lifespan events, Flask `before_first_request` / `teardown_appcontext`, etc.
- [ ] **`configure` callback used for adapter registration.** If custom types are registered, they're done in the pool's `configure` callback so every connection gets them.
- [ ] **`check` callback considered.** For resilience, `check_connection` validates connections before handing them to callers.
- [ ] **`drain()` used after type registration changes (3.3+).** New in 3.3: if you change adapters, `drain()` refreshes all pooled connections.

**The principle:** A pool is a cache of pre-authenticated, ready-to-use database sessions. Like any cache, it needs eviction policies (max_lifetime), sizing strategy (min/max), and invalidation discipline (drain).

---

## 5 — Type Adaptation: The Bridge Between Two Type Systems

Python and PostgreSQL have different type systems. Psycopg3's adaptation layer maps between them. The default mappings are sensible, but the seams show when you work with UUIDs, JSON, arrays, enums, composites, or custom types.

- [ ] **Binary transfer preferred where possible.** `psycopg` defaults to text transfer for compatibility, but binary is faster and avoids parsing ambiguities. For performance-critical paths: `cursor.execute(query, params, binary=True)`.
- [ ] **JSON handled explicitly.** Python dicts don't auto-become `jsonb`. Use `psycopg.types.json.Jsonb(data)` to wrap values destined for `jsonb` columns.
- [ ] **Custom type adapters registered at the right scope.** Connection-level (`conn.adapters`) for per-connection types, or context-level for broader registration. Not registered inside a hot loop.
- [ ] **Row factories match the consumption pattern.** `dict_row` for dict access, `class_row(MyModel)` for typed objects, `namedtuple_row` for lightweight access. The choice is deliberate, not default.
- [ ] **Composite types use dataclass mapping (3.3+).** For PostgreSQL composite types, the new `from_db`/`to_db` protocol with dataclasses is cleaner than raw tuple mapping.
- [ ] **`prepare_threshold` understood.** After 5 executions (default), psycopg3 auto-prepares statements. This is usually good, but can cause issues with changing schemas or connection proxies (PgBouncer in transaction mode). Set to `None` to disable if needed.

**The principle:** Adaptation is a codec. Like character encoding, it's invisible when it works and catastrophic when it doesn't. Be explicit about the boundary between Python types and PostgreSQL types.

---

## 6 — Async Correctness: Concurrency Without Corruption

Psycopg3 offers first-class `async` support. But async database code has its own failure modes beyond regular async pitfalls.

- [ ] **`AsyncConnection` never shared across tasks.** A connection is not task-safe. Each task should get its own from the pool. Sharing a connection across `asyncio.gather()` calls is a race condition.
- [ ] **`AsyncConnectionPool` used (not sync pool in async code).** Mixing sync pool with async connections creates event loop conflicts.
- [ ] **`await` on every database operation.** Missing an `await` on `execute()`, `fetchone()`, `commit()` returns a coroutine object, not a result. If the test suite isn't async-aware, this silently passes.
- [ ] **Pipeline mode considered for batch operations.** `async with conn.pipeline():` batches multiple queries into a single network round-trip. Significant latency win for multi-query sequences.
- [ ] **Cursors closed in async code.** Async cursors hold server resources. Ensure `async with conn.cursor()` or explicit `await cur.close()`.

**The principle:** Async is about cooperative multitasking over I/O. A database connection is a stateful I/O channel. Two coroutines sharing one channel is like two people talking into the same phone — the other end hears gibberish.

---

## 7 — COPY Protocol: Bulk Data Done Right

`COPY` is PostgreSQL's bulk data protocol. It's orders of magnitude faster than INSERT for large datasets because it bypasses the query planner entirely and streams raw data.

- [ ] **COPY used for bulk inserts (>1000 rows).** If inserting many rows, `copy_from` is not just faster — it's the right tool.
- [ ] **`cursor.copy()` used as context manager.** Ensures the COPY operation is properly terminated.
- [ ] **`write_row()` preferred over raw `write()`.** `write_row()` handles type adaptation; `write()` requires pre-formatted data.
- [ ] **Error handling around COPY is robust.** A failed COPY leaves the connection in a broken state. The connection must be discarded or the transaction rolled back.

**The principle:** INSERT goes through parse, plan, execute for *each row*. COPY streams formatted data directly into the table's storage layer. Different tools for different scales.

---

## 8 — Error Handling: Recovering Without Lying

Database errors carry rich information: SQLSTATE codes, constraint names, detail messages. Psycopg3 exposes all of this. Don't discard it.

- [ ] **Specific exceptions caught.** `psycopg.errors.UniqueViolation`, not bare `except Exception`. The error hierarchy maps directly to PostgreSQL's SQLSTATE codes.
- [ ] **`OperationalError` triggers connection recovery.** Network failures, server restarts — these make the connection unusable. Code must reconnect (or the pool must discard and recreate).
- [ ] **`InterfaceError` signals programming mistakes.** Using a closed cursor, double-committing — these are bugs, not runtime conditions. Don't catch and retry; fix.
- [ ] **`conn.info.transaction_status` checked when ambiguous.** After an error, the transaction might be `INTRANS` (still open, needs rollback) or `INERROR` (failed, must rollback). Don't guess.
- [ ] **Error context preserved in logging.** `err.diag` provides `constraint_name`, `detail`, `hint`, `table_name`. Log these. They're the database telling you what went wrong.

**The principle:** PostgreSQL doesn't just say "error" — it tells you the category (SQLSTATE), the object (constraint, table), and often the fix (hint). Psycopg3 passes all of this through. Catching `Exception` throws it all away.

---

## 9 — Observability: What You Can't See Will Hurt You

Code that talks to a database runs in two places simultaneously. You need visibility into both sides.

- [ ] **Query execution time tracked.** Either via application-level timing, psycopg3's `execute` event callbacks, or PostgreSQL's `log_min_duration_statement`.
- [ ] **Connection pool metrics exposed.** `pool.get_stats()` returns pool size, idle/active connections, requests waiting. Wire this to your monitoring.
- [ ] **`notice` handlers configured.** PostgreSQL sends notices (warnings, deprecation messages) through the connection. Capture them: `conn.add_notice_handler(handler)`.
- [ ] **Prepared statement cache understood.** If `prepare_threshold` is active, know that statement planning cost shifts from per-execution to per-connection-lifecycle. Monitor plan cache hits.

**The principle:** A query is a network RPC to a separate stateful system. Like any RPC, you need latency tracking, error rates, and resource utilization metrics. The database driver is your first instrumentation point.

---

## 10 — Migration from psycopg2: The Things That Changed Silently

If the codebase migrated from psycopg2, these are the behavioral changes that break without compile errors.

- [ ] **`with conn` now closes the connection.** In psycopg2, it committed. In psycopg3, it commits *and closes*. Use `conn.transaction()` for commit-only semantics.
- [ ] **Server-side binding by default.** Parameters are bound on the server, not client. This means `%s` placeholders work differently with certain edge cases (e.g., `IN (...)` clauses need `= ANY(%s)` with an array).
- [ ] **`RealDictCursor` replaced by `dict_row`.** Set `row_factory=dict_row` on the connection or cursor.
- [ ] **`mogrify()` is gone.** There's no way to preview the "final SQL" because the final SQL is assembled *on the server*. This is correct behavior, not a missing feature.
- [ ] **`cursor.description` available immediately after execute.** No need to fetch first.
- [ ] **`next(cursor)` instead of `fetchone()` for type-safe iteration (3.3+).** `fetchone()` returns `Optional[Row]`, `next()` never returns None. Cleaner for type checkers.

**The principle:** psycopg3 isn't psycopg2 with async bolted on. It's a redesign that moves safety guarantees from "developer discipline" to "protocol enforcement." The migration friction is the cost of that upgrade.

---

*Built for psycopg 3.3.x (December 2025). Each item traces back to a concept: protocol safety, resource lifecycle, type boundaries, or observability. If an item doesn't connect to a principle, it doesn't belong here.*
