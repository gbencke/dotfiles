---
name: test-surface
description: Change-only — every element of the change's behavior surface must have a test that would fail if it broke.
signals:
  - change-only
---

# test-surface lens

Change reviews only. Enumerates the behavior surface of the diff and checks
each element against the test suite. The question is never "are there tests?"
but "would any test FAIL if this changed line were deleted or inverted?"
(mutation-style adequacy).
