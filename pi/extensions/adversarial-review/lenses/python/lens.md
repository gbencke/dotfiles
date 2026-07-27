---
name: python
description: Advanced Python review — mutable defaults, closure/identity traps, asyncio blocking, GIL misuse, typing escape hatches, resource lifecycle, unsafe deserialization.
signals:
  - "*.py"
  - "pyproject.toml"
  - "requirements.txt"
  - "setup.py"
---

# python lens

Applies to chunks containing `.py` files (or a repo with `pyproject.toml`
/ `requirements.txt` / `setup.py`). Reviews the defects that are *specific
to Python semantics* — code that imports clean, passes a happy-path test,
and fails in production: evaluation-time surprises, `async` that blocks the
loop, GIL-blind parallelism, typing escape hatches, unclosed resources.

Out of scope: formatting and import order (black/ruff own them), generic
N+1 and hot-path waste (performance lens), swallowed-error taxonomy
(error-handling lens), injection/authz (security lens) — except where the
defect only exists because of a Python feature (`pickle`, `yaml.load`,
`shell=True`, f-string SQL), which stays here.
