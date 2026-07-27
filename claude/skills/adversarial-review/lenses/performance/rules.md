# performance rules — defects that scale badly

Every finding names the scaling variable (rows, users, file size, req/s)
and the complexity/cost it triggers. "Could be faster" is not a finding.

## Data access

- N+1: queries/HTTP calls inside a loop over a result set — the loop bound
  is the multiplier; cite both the loop and the call.
- Missing pagination: unbounded `SELECT *` / full-table scans / `find()`
  with no limit on collections that grow.
- Filters applied in application code after fetching everything (DB could
  do it; the network pays for the difference).
- Missing index evidence: queries filtering/sorting on non-indexed columns
  in migration-visible schemas (only flag when the schema is in-repo).

## Hot paths

- Sync-in-async: blocking calls (`readFileSync`, `time.sleep`,
  synchronous HTTP) inside async handlers/event loops — stalls ALL
  concurrent work, not just this request.
- O(n²)+ in request paths: nested loops over the same collection,
  `list.contains` inside a loop (use a set), repeated regex compilation
  per call/row.
- Redundant work per request: config re-parsed, clients re-instantiated,
  connections re-opened per call instead of pooled/reused.

## Memory & payloads

- Reading entire files/streams/request bodies into memory when a streaming
  API exists and sizes are unbounded.
- Unbounded caches (no eviction/max size) keyed by unbounded input (user
  ids, query strings) — a slow memory leak.
- Serialization of large object graphs per request when a projection/DTO
  would do.

## Concurrency

- Locks held across I/O; coarse global locks around per-entity work.
- Fire-and-forget tasks without a bound (unlimited goroutines/tasks under
  load) — no semaphore, no queue.

Cite as `performance#n-plus-1`, `performance#sync-in-async`,
`performance#unbounded-fetch`, …
