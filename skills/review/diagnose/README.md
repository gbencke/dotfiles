# Diagnose

A disciplined diagnosis loop for hard bugs and performance regressions.

## The loop

1. Build a feedback loop.
2. Reproduce the bug.
3. Minimise the failing case.
4. Hypothesise.
5. Instrument.
6. Fix.
7. Regression-test.

## Feedback loops

The skill prioritises creating a deterministic, agent-runnable pass/fail signal. Loops include:

- Failing test
- Curl / HTTP script
- CLI invocation with snapshot diff
- Headless browser script
- Replay of a captured trace
- Throwaway harness
- Property / fuzz loop
- Bisection harness
- Differential loop
- HITL bash script (last resort)

## Files

- `SKILL.md` — the full diagnosis procedure.
- `scripts/hitl-loop.template.sh` — template for human-in-the-loop structured feedback.
