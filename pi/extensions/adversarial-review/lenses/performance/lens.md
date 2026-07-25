---
name: performance
description: Code-level performance defects — N+1, unbounded work, hot-path waste.
signals:
  - always
---

# performance lens

Always applies. Reviews code-level performance defects with a concrete
trigger (input size, request rate). Not micro-optimization nits — the
defect must scale badly with something real.
