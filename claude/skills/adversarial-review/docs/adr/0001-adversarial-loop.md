# Propose → Kill → Judge as the adversarial loop

> **Mechanism superseded by ADR 0004**: the three roles now run as sequential
> phases inside one process instead of separate subagents. The loop itself, and
> every reason below for keeping proposal and refutation apart, still hold.

Each review runs a reviewer that proposes findings, a challenger that tries to
kill each finding (VALID/INVALID/AMBIGUOUS), and a judge that dedups and rules. We chose this over the better-known panel +
debate pattern (N persona reviewers debate, then a judge) because the
published production evidence favors it: ~7% false positives vs 30–60% for
single-pass review (`gaurav-yadav/adversarial-ai-review`, 500+ PRs), at a
fraction of panel-debate cost (debate is sequential cross-talk and the most
expensive phase in panel systems). It also maps cleanly onto lenses: each
lens is a self-contained propose/kill pair, so adding a topic adds no
cross-lens debate machinery. Research basis: LLMs cannot reliably
self-correct (Huang et al. 2023), so proposal and refutation must be
separate agents.

**Considered options**: panel + debate (higher ceiling on contested
judgment calls, much higher cost and anti-groupthink complexity — rejected
for v1, a debate phase can be inserted between Kill and Judge later without
changing lenses); single global challenger (cheapest, but re-introduces the
generalist context-dilution the lenses exist to avoid — rejected).

**Consequences**: model quality matters most at the judge; run high-stakes
reviews on a strong default model rather than adding machinery here.
