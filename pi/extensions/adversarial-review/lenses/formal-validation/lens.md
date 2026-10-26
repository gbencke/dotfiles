---
name: formal-validation
description: Input-domain correctness — for every possible input, entry points and core logic either return the correct result or reject cleanly; every reviewed function has property-based or fuzz tests.
signals:
  - always
---

# formal-validation lens

Always applies. Reviews entry points (HTTP handlers, queue/stream
consumers, CLI, file/CSV imports) and core domain logic (mappers,
parsers, serializers, money, state machines). Skips internal helpers
whose callers are already typed and validated.

The question for every reviewed function: across all possible inputs,
does it return the correct result or reject cleanly — typed error, no
crash, no hang, no partial write?

Evidence standard: a concrete counterexample. Every finding gives the
exact input (`""`, `null`, `2^53+1`, `"2024-02-30"`,
`message_type="NEW_TYPE"`) and traces it to the wrong output, crash, or
hang. No counterexample, no finding. Exceptions: test-gap findings
(group E) list the test files searched; `formal#needs-model-check` is
advisory and names the invariants a spec must state.

Kill the finding when an upstream schema, validator, or type provably
rejects the input before it reaches the code.

Boundaries — not this lens:
- Dependencies missing or in the wrong state before a write →
  sanity-checks.
- Type escape hatches (`as any`, `!`, `Any`) → typescript / python.
- Malicious input (injection, unsafe deserialization) → security.
- What happens after an exception is thrown → error-handling.
- A concrete interleaving bug → concurrency.
- A changed boundary in a diff (`>` → `>=`) → test-surface.
The lens reads code and tests; it never runs them (ADR 0002).
