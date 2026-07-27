# golang rules — idiomatic, leak-free Go

## Errors (the language's whole point)

- **Unchecked errors** — `f()` or `_ = f()` on an error-returning call;
  `resp, _ :=`. Every discarded error needs a comment saying why it's safe.
  `go#unchecked-error`
- **Error swallowed by wrap-loss** — `fmt.Errorf("failed: %v", err)` instead
  of `%w` — callers can no longer `errors.Is/As` into the cause.
  `go#unwrap-error`
- **Sentinel/typed error confusion** — comparing errors with `==` against a
  message string; define sentinel (`var ErrNotFound = errors.New`) or a
  typed error, and check with `errors.Is/As`. `go#error-comparison`
- **panic in library code** — panic crossing a package boundary; return an
  error. Also `log.Fatal` anywhere but `main` — it kills the caller's
  process. `go#panic-in-library`

## Concurrency (the leak factory)

- **Goroutine without a stop** — a goroutine started with no path to
  termination: no context, no done channel, no WaitGroup the owner waits
  on. Ask "what makes this goroutine exit?" — no answer = leak.
  `go#goroutine-leak`
- **Loop-variable capture** — goroutine/closure inside a loop capturing the
  loop variable (pre-Go-1.22 semantics; still a finding if go.mod declares
  <1.22). `go#loop-var-capture`
- **Shared state without synchronization** — a struct field or package var
  written by one goroutine and read by another with no mutex/channel/atomic.
  If you can't prove single-goroutine ownership from the code, it's a
  finding. `go#data-race`
- **Mutex copied by value** — struct containing `sync.Mutex` passed or
  returned by value; the copy shares nothing but the name. Methods on such
  structs need pointer receivers. `go#copied-mutex`
- **`time.After` in a loop/select** — each iteration allocates a timer that
  lives until it fires; use `time.NewTimer` + Reset. `go#time-after-loop`
- **Unbuffered channel assumption** — send that blocks forever when the
  receiver is gone (select with default/ctx, or document the contract).
  `go#blocking-send`

## defer & resources

- **defer in a loop** — `defer f.Close()` inside a loop body: defers run at
  *function* return, so descriptors pile up until then. Wrap the iteration
  in a func. `go#defer-in-loop`
- **HTTP body not closed** — `http.Get`/client.Do without
  `defer resp.Body.Close()` on ALL paths (including redirect-error paths
  where resp can be non-nil). `go#body-not-closed`
- **defer with evaluated args** — `defer log(x)` evaluates `x` NOW; the
  classic `defer fmt.Println(err)` prints the nil from declaration time.
  `go#defer-args`

## Slices, maps, types

- **Slice capacity leak** — returning/slicing a small window of a huge
  backing array keeps the whole array alive; `copy` out when the big buffer
  should be freed. `go#slice-capacity-leak`
- **Range element address** — taking `&v` of the range variable or storing
  it; every element ends up the last one (pre-1.22). `go#range-address`
- **Map iteration assumptions** — logic depending on range order, or
  writing to a map while ranging over it. `go#map-iteration`
- **`interface{}`/`any` without need** — public APIs taking `any` where a
  concrete type or a small interface exists; type switches on the caller
  side multiply. `go#any-abuse`
- **Interface on the wrong side** — exported interface defined next to the
  implementation "for mockability" with a single implementation (Google:
  accept interfaces, return structs; define interfaces at the consumer, when
  needed). `go#premature-interface`

## Structure & stdlib

- **init() with side effects** — init that does IO, reads env, or depends
  on ordering; makes import order load-bearing and tests brittle.
  `go#init-side-effects`
- **Global mutable state** — package-level `var` that's mutated after
  init (config, caches, registries) — hidden coupling, untestable.
  `go#global-state`
- **context misuse** — context stored in a struct, context not the first
  parameter, `context.Background()` deep in a call chain severing
  cancellation from the caller. `go#context-misuse`
- **Naked returns in long functions** — named results + bare `return` past
  ~10 lines; the reader can't see what's returned. `go#naked-return`

Severity: goroutine leaks, data races, body-not-closed, panic-in-library =
P1 (production incidents, not style). defer-in-loop under load = P1, else
P2. Unchecked errors = P1 on IO/write paths, P2 elsewhere. Structure items
= P2/P3.
