# Reviews execute nothing

Reviews never execute repo code, test suites, builds, chaos experiments, or
cloud/API calls. Static analysis plus reading existing artifacts (diffs,
coverage reports already on disk) only. The sole exceptions are input
gathering: `git diff` and `gh pr view/diff`.

Three reasons. **Safety**: a review tool that runs arbitrary repo code (or
injects faults into live systems) needs sandboxing, credentials, and trust
decisions far beyond a reviewer's remit. **Determinism**: a finding that
depends on a flaky suite or live account state is not reproducible.
**Zero-setup**: the tool works on any repo without its toolchain,
dependencies, or credentials installed.

The accepted cost is accuracy: no real coverage numbers when no report
exists (static file mapping instead), no live AWS quota data (documented
defaults instead), no observed chaos behavior (static resilience review
plus proposed experiments). Findings that genuinely require runtime state
are routed to AMBIGUOUS with instructions for a human, which keeps them
honest instead of guessed.

**Consequences**: a future "live" lens (Service Quotas API, coverage
execution) is a new lens with explicit opt-in, not a loosening of this
boundary for existing lenses.
