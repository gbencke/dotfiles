---
name: error-handling
description: Error-handling correctness — swallowed exceptions, lost context, data loss on error paths.
signals:
  - always
---

# error-handling lens

Always applies. Reviews what happens when things FAIL: whether errors are
swallowed, stripped of context, or leave data/systems in a worse state.
Distinct from chaos (failure tolerance of the system) — this lens is about
correctness and diagnosability of error paths.
