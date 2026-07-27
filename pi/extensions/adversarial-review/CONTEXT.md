# CONTEXT — adversarial-review

Glossary for the adversarial-review pi extension. No implementation details.

## Terms

- **Extension** — the self-contained package at `~/.pi/agent/extensions/adversarial-review/`. Bundles docs, skills, agent definitions, and lenses. Requires the `@tintinweb/pi-subagents` extension (provides the `Agent` tool used to spawn reviewers).
- **Lens** — one review domain (aws, docs, tests, chaos, test-surface, blast-radius, …). Physically a directory of markdown rule packs (`lens.md` manifest with apply-when signals, `rules.md` checklist, optional `conventions.md`) under `lenses/`. Lenses are discovered by scanning; no code, no registration. Lenses are the unit of extensibility: adding a topic = adding a directory.
- **Finding** — a single review issue. To count as a finding it must name a specific code path, a specific failure condition, and specific evidence. "Consider adding error handling" is not a finding.
- **Review** — one adversarial pass over a target. Two shapes: **repo review** (whole repository) and **change review** (patch, PR, or branch diff).
- **Adversarial loop** — the fixed pipeline every review runs: **Propose → Kill → Judge**. Lens reviewers propose findings in parallel; a per-lens challenger tries to kill each finding; a judge dedups, assigns severity, and delivers the verdict.
- **Challenger** — the adversarial counterpart to a lens reviewer. Tries to disprove each proposed finding by checking it against the actual code. Verdicts: **VALID** (real, survives), **INVALID** (disproven, dropped), **AMBIGUOUS** (needs human judgment, reported with lower confidence).
- **Judge** — the final arbiter across all lenses. Deduplicates surviving findings, assigns severity (P0–P3), and issues the review verdict. Never reviews code itself; rules only on challenger-verified input.
- **Project lens overlay** — a `.gbencke/adversarial-review/lenses/` directory in the reviewed repo, same format as global lenses. Same-named lenses merge (project rules append after global); new names add repo-only lenses.
- **Chaos lens** — static resilience review (timeouts, retries/backoff, circuit breakers, idempotency, graceful degradation, cleanup) plus *proposed* chaos experiments (steady-state hypothesis + fault + expected behavior). Never executes anything; no manifests, no live calls.
- **tests lens** — coverage gaps and test quality. Reads existing coverage reports (coverage.xml, lcov.info) when present; otherwise statically maps code files to test files. Never runs the test suite.
- **test-surface lens** — for a change: enumerates the behavior surface (touched public APIs, new branches, error paths) and checks each element has a test that would actually fail if it broke. Change reviews only.
- **blast-radius lens** — for a change: reverse-dependency impact — who imports/calls the changed symbols, what breaks downstream, risk tier.
- **aws lens** — static review of IaC (Terraform/CDK/CloudFormation) and AWS-SDK code against Well-Architected pillars and documented service quotas/limits. No AWS credentials, no live API calls.
- **Execution boundary** — reviews never execute repo code, test suites, chaos experiments, or cloud API calls. Static analysis and reading existing artifacts only.
- **Repo review scoping** — exhaustive: every source file is reviewed, chunked along module/directory boundaries (oversize directories split mechanically by token budget). Generated, vendored, and lock files are always skipped. Cross-chunk duplicate findings are the Judge's problem, not the user's.
- **Change review scoping** — the diff is the scope; all lenses apply (including the change-only test-surface and blast-radius lenses). Blast radius = mechanical reverse import/caller graph (ast-grep, grep fallback) plus an agent semantic pass for couplings imports can't see (events, queues, HTTP contracts, DB schemas).
- **Dual verdict** — change reviews rule on IMPLEMENTATION_CORRECTNESS (is the code right?) × SOLUTION_FIT (is this the right approach, given the stated intent?). Repo reviews get a per-lens health verdict instead.
- **Report** — every review writes `.gbencke/adversarial-review/reports/<timestamp>-<target>.md` plus a `findings.json` sidecar (CI-gateable) into the reviewed repo. Chat gets only verdict, severity counts, top findings, and the report path.
- **v1 lenses** — aws, design, docs, tests, chaos, test-surface, blast-radius, security, performance, error-handling, typescript, golang, python.
- **Language lens** — a lens whose signals are file globs (`*.go`, `*.ts`). Language lenses review only the chunks (repo review) or diff files (change review) that match their language; other lenses (`always`) review everything.
- **Lens picker** — the mandatory prompt at the start of every review: the orchestrator lists matched lenses and waits for ENTER (run matched) / 'all' / 'skip X, add Y' before spawning any agent. Skipped only when `--lenses a,b,c` is passed in the command args (the CI path).
- **design lens** — reviews code against the structural chapters of Ousterhout's *A Philosophy of Software Design* (complexity, deep modules, information hiding, abstraction layers, names, obvious code). Error-handling (ch10) and comments (ch12–13) belong to their own lenses and are excluded to avoid double-reporting.
- **Blast radius** — the set of code, tests, and downstream consumers affected by a change.
