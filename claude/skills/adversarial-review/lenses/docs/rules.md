# docs rules — comments must agree with code

Documentation drift: the comment describes a behavior the code no longer has.
This lens verifies docs AGAINST code, not docs for style.

## Drift detection (highest value)

- **Parameter drift**: docstring documents a parameter that no longer exists,
  or misses one that does (renames, added options).
- **Return-value drift**: doc says "returns null when not found" but code
  throws; doc says "list of X" but code returns Optional/dict.
- **Behavior drift**: "retries three times" — code retries once. "Thread-safe"
  — no synchronization. "Caches results" — cache removed. The comment asserts
  a mechanism the code doesn't implement.
- **Stale examples**: code examples in comments/README that call APIs with old
  signatures, renamed types, or removed options.
- **TODO/FIXME/HACK age**: TODOs referencing removed code, closed tickets, or
  names of people who left; TODO older than the surrounding code's last
  meaningful edit (check git blame if available) — flag as P3 rot.
- **Copy-paste docs**: identical docstring on functions with different
  behavior (the tell of a duplicated block where only the code was edited).

## Missing-where-it-matters

- Public/exported API surface with zero doc while internal helpers are
  documented (inverted priority).
- Non-obvious invariants, units (ms vs s), units of money (cents vs dollars),
  timezone assumptions, and coordinate reference systems with NO comment —
  these are the comments that prevent 3am pages.
- "Why" absent on deliberate workarounds: magic numbers, unusual ordering,
  sleep/backoff constants, version pins.

## Noise (do NOT report)

- Missing docs on self-evident getters/setters/constructors.
- Style/format nits (docstring format wars).
- Requests to document every function — this lens fights lies, not brevity.

Cite as `docs#param-drift`, `docs#behavior-drift`, etc.
