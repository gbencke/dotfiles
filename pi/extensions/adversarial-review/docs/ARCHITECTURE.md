# Architecture

## The pipeline

```
                ┌────────────────────────── lenses (markdown rule packs) ─────────────────────────┐
                │ aws · docs · tests · chaos · security · performance · error-handling            │
                │ test-surface · blast-radius (change-only)                                       │
                └─────────────────────────────────────────────────────────────────┬───────────────┘
                                                                                  │ rules injected
 target ──► orchestrator (skill, runs in your pi session) ──► PROPOSE ──► KILL ──► JUDGE ──► report.md
 (repo | diff)                                                 │           │        │        + findings.json
                                          per lens × chunk     │  per lens │   1 agent
                                          background agents    ▼           ▼
                                          Agent tool (pi-subagents required)
```

**Propose** — one reviewer subagent per (lens × chunk). Prompt = shared
reviewer stance (`agents/reviewer.md`) + the lens's merged `rules.md` + scope.
Returns findings as strict JSON. Every finding must cite `file:line`, a
concrete failure condition, and evidence — unverifiable opinions die at birth.

**Kill** — one challenger subagent per lens. Tries to disprove each finding
against the actual code (checks callers, middleware, framework defaults).
Verdicts: `VALID` (survives), `INVALID` (dropped with disproof), `AMBIGUOUS`
(escalated to the human). Killers never raise new findings — separating
proposal from refutation is what keeps false positives down (LLMs cannot
reliably self-correct; see ADR 0001).

**Judge** — one agent. Drops INVALID, dedups across lenses/chunks, audits
severity, attaches epistemic labels (`[CONFIRMED]`, `[CONSENSUS]`,
`[NEEDS-HUMAN]`), delivers the verdict, writes both artifacts.

## Components

| Path | Role |
|------|------|
| `index.ts` | Registers `/review-repo` and `/review-change`. Loads the matching SKILL.md, injects it with the extension's absolute base path and the target argument. The only TypeScript — everything else is data. |
| `skills/review-repo/SKILL.md` | Orchestrator procedure for whole-repo reviews: lens selection → exhaustive chunking → propose → kill → judge. |
| `skills/review-change/SKILL.md` | Orchestrator procedure for PR/branch/patch reviews: diff resolution → mechanical blast-radius graph → propose → kill → judge (dual verdict). |
| `agents/reviewer.md` | Reviewer prompt template (finding contract, severity rubric, adversarial self-check, JSON output). |
| `agents/challenger.md` | Challenger prompt template (kill strategies, VALID/INVALID/AMBIGUOUS, JSON output). |
| `agents/judge.md` | Judge prompt template (dedup, labels, severity audit, dual verdict, artifact schemas). |
| `lenses/<name>/lens.md` | Lens manifest: name, description, apply-when signals. |
| `lenses/<name>/rules.md` | The lens's domain checklist — the actual review knowledge. |

Subagents are spawned as `general-purpose` with the template injected into
the prompt. The `agents/*.md` files are prompt building blocks read by the
orchestrator, not pi-registered agent types.

## Data flow

1. `index.ts` never touches review logic. It reads a SKILL.md and sends it to
   the agent with `triggerTurn`. Skills are the unit of behavior.
2. The orchestrating agent (your pi session) runs the skill: scans lenses,
   matches signals, merges the repo overlay (`.gbencke/adversarial-review/lenses/`),
   then spawns subagents in batched background waves.
3. Subagents return terse JSON. The orchestrator forwards it between phases
   without interpreting it (context discipline — the orchestrator's context
   is the cost driver in multi-agent systems; it stays thin).
4. The judge writes the only two files: `reports/<ts>-<target>.md` and
   `reports/<ts>-<target>.findings.json`.

## Scoping

- **Repo review**: exhaustive chunking (ADR 0003). Skip list always applied:
  `.git`, vendored deps, build output, lock files, generated code, binaries.
  Chunks follow top-level directory boundaries; oversized directories split
  mechanically. `test-surface` and `blast-radius` are skipped (change-only).
- **Change review**: the diff is the scope. Blast radius is computed
  mechanically first (changed symbols → reverse import/caller graph via
  ast-grep/grep), then the blast-radius lens adds semantic couplings
  (events, HTTP contracts, DB schemas, config) that imports cannot see.

## Verdicts

- **Change**: dual verdict — IMPLEMENTATION_CORRECTNESS × SOLUTION_FIT
  (judged against the PR description / commit messages; degrades to
  correctness-only for anonymous patches) → SHIP / FIX-THEN-SHIP /
  DO-NOT-SHIP. Thin evidence appends `⚠️ HUMAN REVIEW RECOMMENDED`.
- **Repo**: per-lens HEALTHY / NEEDS-ATTENTION / CRITICAL.

## Design invariants

1. The orchestrator never reviews code. (Context dilution is the enemy.)
2. Proposal and refutation are separate agents. (ADR 0001)
3. Reviews execute nothing. (ADR 0002)
4. Every finding is specific: code path + failure condition + evidence.
5. Lenses are data. Adding a topic is adding a directory, never code.

## Research basis

Architecture synthesized from: `wan-huiyan/agent-review-panel` (panel +
debate + judge), `gaurav-yadav/adversarial-ai-review` (propose/kill pairs,
~7% FP in production), diffray and Ellipsis write-ups (specialization vs
context dilution, decomposition), AWS Well-Architected (SEC11-BP04, REL01),
and the change-impact/blast-radius literature. Full reasoning in
`docs/adr/0001-adversarial-loop.md`.
