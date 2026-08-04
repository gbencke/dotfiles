# Roles run inline; parallelism is processes, not subagents

Reviews no longer spawn subagents. One claude process runs propose → kill → judge
itself, adopting `agents/reviewer.md`, `agents/challenger.md`, and
`agents/judge.md` as sequential role packs, and is normally scoped to a single
lens (`--lenses <one>`). Parallelism moved one level out:
`BASE_DIR/bin/run-matrix.sh` launches one `claude -p` process per (repo × lens), all at once,
and `/review-consolidate` drives it and merges the resulting `findings.json`
sidecars into one cross-repo document.

This supersedes the *mechanism* of ADR 0001, not its finding. The adversarial
loop and the reason for it stand: proposal and refutation stay separate phases,
because LLMs cannot reliably self-correct (Huang et al. 2023). What changed is
who executes the phases.

Why: fan-out was multiplying. Under subagents, a matrix of 3 repos × 14 lenses
was 42 orchestrators each spawning (lenses × chunks) agents — hundreds of
concurrent agents, an orchestrator context that grew with every returned
payload, and failures that surfaced as a silent partial result. Process-level
fan-out gives what the agent layer did not: an exit code, a log file, and a
report path per pairing, so a failed lens is visible in the consolidated
document instead of missing from it.

**Considered options**: keep subagents and cap concurrency (still no per-lens
exit code or log, and the orchestrator context problem remains — rejected);
subagents for chunks within one lens (halves the process count, reintroduces
the invisible-failure mode — rejected).

**Consequences**: the reviewing process's own context is now the scaling limit,
so repo reviews process chunks sequentially and keep only challenger JSON
between them (see `skills/review-repo/SKILL.md` Phase 3). Reports carry the lens
in the basename (`<stamp>-repo-<lens>.md`) because concurrent processes write
into the same reports directory. Every skill prints its artifact path on a
final `REPORT: ` / `CONSOLIDATED: ` line — that line is the contract batch
callers parse, instead of guessing from directory mtimes.
