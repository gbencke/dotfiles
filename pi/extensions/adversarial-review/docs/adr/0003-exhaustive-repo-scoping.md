# Repo reviews are exhaustive, not prioritized

Whole-repo reviews chunk the entire repository (minus the skip list:
`.git`, vendored deps, build output, lock files, generated code, binaries)
and review every chunk under every matched lens. The recommended
alternative was map-then-prioritize: rank hotspots by churn, fan-in, and
entry points, and review only those.

The user chose exhaustive deliberately: prioritized sampling silently
declares part of the codebase unreviewed by heuristic, and the heuristic
(churn, fan-in) is exactly what a fresh adversarial review cannot trust —
quiet, low-churn modules are where undocumented rot lives. The costs are
accepted and mitigated: agent count scales with lenses × chunks (mitigated
by batched background waves and the Agent tool's background queue), and cross-chunk
duplicate/noise findings flood the report (mitigated by the judge's dedup
and severity audit, and by the `## Not reviewed` section that keeps the
exhaustiveness claim honest).

**Consequences**: budget-sensitive users should aim change reviews at
branches/PRs rather than running repo reviews on monorepos. If a real
budget ceiling becomes necessary later, add it as an explicit user-set
option — never as silent heuristic pruning.
