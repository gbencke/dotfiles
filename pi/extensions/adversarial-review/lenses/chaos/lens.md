---
name: chaos
description: Static resilience review — timeouts, retries, circuit breakers, idempotency — plus proposed chaos experiments.
signals:
  - always
---

# chaos lens

Always applies to service code. Statically reviews failure-tolerance
patterns and proposes chaos experiments (steady-state hypothesis + fault +
expected behavior). Never executes anything, never generates manifests
(ADR 0002).
