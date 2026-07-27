# concurrency rules — provable interleavings only

For every finding, name the two (or more) execution paths (threads,
goroutines, tasks, requests, signal handlers, agent workers) and the
schedule that breaks: `T1: line A → preempted; T2: line B; T1: line C →
broken state`. If you cannot write the trace, it is not a finding.

First pass — map shared state: every variable, field, map, file, cache
entry, DB row, or closure capture touched by more than one execution
path. For each, demand the witness: the lock, atomic, channel, queue,
happens-before edge, or single-thread confinement proof that protects it.

## Data races

- **Unsynchronized shared mutable access** — field/global/map/slice/
  closure capture written by one path, read or written by another, no
  common lock/atomic/channel. Confirm by tracing both paths to the same
  storage. Cite `concurrency#data-race`.
- **Map/dict concurrent write** — Go map, JS object shared across workers,
  Python dict under threads with mutation during iteration. Maps panic or
  corrupt without a mutex even when each access looks trivial. Cite
  `concurrency#map-race`.
- **Loop-variable / closure capture** — goroutine/async callback captures
  a loop variable or local that the parent mutates after spawn. Confirm
  the parent writes (or returns, leaving the variable to the next
  iteration) after the child can run. Cite `concurrency#capture-race`.
- **Sentinel/counter without atomic** — `requests++`, `if (!initialized)`,
  stats counters, feature flags written on one path read on another. Cite
  `concurrency#counter-race`.

## Atomicity violations

- **Check-then-act** — `if (!map.contains(k)) map.put(k, v)`,
  `if (err == nil) { ... }` on shared state, upsert-by-hand. The check and
  the act must hold the same lock; a gap between them is the finding.
  Cite `concurrency#check-then-act`.
- **Read-modify-write split** — read value, compute, write back
  (`balance = balance + delta` via two statements, ORM read-then-save).
  Lost update: two paths read the same base value. Cite
  `concurrency#lost-update`.
- **Compound op assumed atomic** — iterate-then-mutate, test-then-log-then-
  return on shared state, lazy-init double assignment. Cite
  `concurrency#compound-assumed-atomic`.

## Order violations & publication

- **Initialization race** — path B uses a resource (client, cache, config,
  listener) that path A initializes, with no join/ready signal/
  happens-before edge forcing A first. Fast-startup timing makes it
  flaky, not absent. Cite `concurrency#init-order`.
- **Unsafe publication** — object stored to a shared field before its
  fields are fully set (assign pointer, then fill), so a reader sees a
  half-built object. Includes broken double-checked locking (missing
  volatile/atomic on the instance field). Cite `concurrency#unsafe-publication`.
- **Stale flag loop** — `while (!done) {}` where `done` is a plain field
  written by another thread: no volatile/atomic/chan ⇒ reader may spin
  forever on a cached value. Cite `concurrency#stale-flag`.

## Deadlock & liveness

- **Lock-order inversion** — two paths acquire the same two locks in
  opposite order (directly, or via lock held across a call that grabs the
  second). Build the acquisition graph from the diff; a cycle is the
  finding. Cite `concurrency#lock-order`.
- **Lock held across blocking/yielding call** — mutex held over I/O,
  network call, `await`, channel send/recv, or user callback: the callee
  can re-enter and self-deadlock, or stall all lock-holders. Cite
  `concurrency#lock-over-blocking`.
- **Channel/queue lifecycle** — send on closed channel, close with live
  senders, unbuffered send whose receiver exited on an earlier error path,
  `WaitGroup.Add` after `Wait` can start. Cite `concurrency#channel-lifecycle`.
- **Re-entrant callback** — code invokes a callback/listener while holding
  a lock the callback (or its callees) also takes. Cite
  `concurrency#reentrant-lock`.

## TOCTOU

- **Validate-then-use gap** — permissions/existence/quota checked, then
  the resource used later without re-checking under the same lock or
  transaction. File existence checks before open are the classic case;
  confirm a mutation path exists between check and use. Cite
  `concurrency#toctou`.

## Memory visibility (C/C++/Rust/Java low-level)

- **Missing release/acquire pairing** — atomic stores with
  `memory_order_relaxed` (or plain non-atomic write) publish data another
  thread reads; the producing writes can be observed out of order. Cite
  `concurrency#missing-release-acquire`.
- **ABA on CAS** — compare-and-swap loop where the value can cycle A→B→A
  (freed-then-realloc'd pointer, counter wrap), making CAS succeed on
  logically-changed state. Cite `concurrency#aba`.

## Async / event-loop hazards

- **State mutated across await** — read shared state, `await`, then use
  the pre-await value to decide or write. Another task ran in between.
  Each `await` is a preemption point; treat it like one. Cite
  `concurrency#await-boundary`.
- **Fire-and-forget task** — goroutine/task/promise spawned with no
  cancellation, no error propagation, no join: failures vanish, shutdown
  races in-flight work. Confirm by absence of errgroup/await/cancel
  plumbing. Cite `concurrency#orphan-task`.
- **Event-order assumption** — handler assumes event/registration order
  (listener registered after event can fire, message processed before its
  dependency). Cite `concurrency#event-order`.

## Distributed / application-level concurrency

- **Non-idempotent write under retry/concurrency** — concurrent requests
  or retries execute INSERT (not UPSERT), increment, or side-effecting
  call twice with no idempotency key or unique constraint as backstop.
  Cite `concurrency#non-idempotent-write`.
- **Application-level distributed lock** — lock without TTL/expiry
  (crashed holder wedges everyone), lock released by non-owner, critical
  section extending past lock expiry. Cite `concurrency#dist-lock`.
- **Cache-aside race** — read-through cache: miss → DB read → populate,
  where a concurrent writer invalidates between DB read and populate,
  caching a stale value. Cite `concurrency#cache-aside-race`.

## Test surface (concurrency-specific)

- **Concurrent code without race-enabled test** — diff introduces
  goroutines/threads/shared state but no test exercising the concurrent
  paths, and the repo has a race detector available (`go test -race`,
  TSan, Loom, Coyote). Report as the missing guard, naming the detector
  the ecosystem provides. Cite `concurrency#no-race-test`.
