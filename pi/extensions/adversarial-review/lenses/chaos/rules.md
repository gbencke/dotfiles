# chaos rules — failure tolerance, reviewed statically

Frame every finding as: which real-world turbulent condition breaks this code,
and how. Every finding should end with a **proposed experiment**: steady-state
hypothesis, fault to inject, expected resilient behavior.

## Outbound calls

- HTTP/RPC/DB calls with no timeout (language default is often infinite).
- Retries without exponential backoff + jitter (thundering herd on recovery).
- Retries on non-idempotent operations without idempotency keys (double-charge,
  double-send).
- No circuit breaker on a dependency whose failure mode is "slow, not down" —
  slow dependencies exhaust thread/connection pools.
- Fallback paths that call ANOTHER network dependency (fallback as reliable
  as the primary — no fallback at all).

## Inbound / boundaries

- Request handlers that do unbounded work per request (no pagination cap,
  unbounded IN-clauses, read-entire-file/request-body into memory).
- Missing bulkheads: one shared connection/thread pool for both critical and
  best-effort work — the best-effort traffic can starve the critical path.

## State & lifecycle

- Resource cleanup that only runs on the happy path (connections, temp files,
  locks, subscriptions leaked on error/panic/exception paths).
- Non-atomic multi-write sequences without compensation (write A, crash,
  B never written — system now inconsistent).
- Startup that hard-fails when a non-critical dependency is down (config
  fetch, feature-flag service) vs. degraded start with safe defaults.

## Proposed experiment format

For each finding append:

```
experiment:
  steady_state: <observable, e.g. "p99 < 500ms, error rate < 0.1%">
  fault: <what to break, e.g. "10s latency on POST /payments">
  expected: <resilient behavior, e.g. "circuit opens in 2s, 503 with retry-after">
```

Cite as `chaos#no-timeout`, `chaos#retry-no-jitter`, `chaos#no-idempotency`, …
