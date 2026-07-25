---
name: tests
description: Test coverage gaps and test quality — untested code, and tests that assert nothing.
signals:
  - always
---

# tests lens

Always applies. Reads existing coverage reports (coverage.xml, lcov.info,
.nyc_output/, coverage/ dirs) when present; otherwise statically maps source
files to test files by naming convention and imports. NEVER runs the test
suite (ADR 0002).
