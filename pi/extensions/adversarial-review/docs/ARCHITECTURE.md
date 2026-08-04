# Architecture

## The pipeline

```
                ┌────────────────────────── lenses (markdown rule packs) ─────────────────────────┐
                │ aws · docs · tests · chaos · security · performance · error-handling            │
                │ test-surface · blast-radius (change-only)                                       │
                └─────────────────────────────────────────────────────────────────┬───────────────┘
                                                                                  │ rules injected
 target ──► one pi process, one lens ──► PROPOSE ──► KILL ──► JUDGE ──► report.md
 (repo | diff)   (skill = the procedure)     │          │        │       + findings.json
                                             │  chunk by chunk   │
                                             ▼          ▼        ▼
                                    three role packs, no subagents (ADR 0004)

 /review-consolidate <repos…> --out doc.md
        │
        ├── bin/run-matrix.sh ──► N × M `pi -p` processes, all parallel ──► manifest.tsv
        │       (one per repo × lens: exit code + log + REPORT: path each)
        └── merge every findings.json ──► one doc, severity then repo
```

**Propose** — the reviewer role (`agents/reviewer.md` + the lens's merged
`rules.md` + scope) produces findings as strict JSON. Every finding must cite
`file:line`, a concrete failure condition, and evidence — unverifiable opinions
die at birth.

**Kill** — the challenger role tries to disprove each finding against the actual
code (checks callers, middleware, framework defaults). Verdicts: `VALID`
(survives), `INVALID` (dropped with disproof), `AMBIGUOUS` (escalated to the
human). The challenger never raises new findings — separating proposal from
refutation is what keeps false positives down (LLMs cannot reliably
self-correct; see ADR 0001), and the separation is by phase, not by process.

**Judge** — drops INVALID, dedups across lenses/chunks, audits severity,
attaches epistemic labels (`[CONFIRMED]`, `[CONSENSUS]`, `[NEEDS-HUMAN]`),
delivers the verdict, writes both artifacts.

## Components

| Path | Role |
|------|------|
| `index.ts` | Registers `/review-repo`, `/review-change`, `/review-consolidate`. Loads the matching SKILL.md, injects it with the extension's absolute base path and the target argument. The only TypeScript — everything else is data. |
| `skills/review-repo/SKILL.md` | Whole-repo procedure: required path → lens selection → exhaustive chunking → propose → kill → judge. |
| `skills/review-change/SKILL.md` | PR/branch/patch procedure: diff resolution → mechanical blast-radius graph → propose → kill → judge (dual verdict). |
| `skills/review-consolidate/SKILL.md` | Multi-repo procedure: required repos + `--out` → run the matrix via `bin/run-matrix.sh` → merge every findings.json into one document. |
| `bin/run-matrix.sh` | The fan-out. One `pi -p` process per (repo × lens), all parallel, then `manifest.tsv` (repo, lens, exit, seconds, report, log). |
| `bin/test-run-matrix.sh` | Self-check for the launcher (`--dry-run`, starts no pi process). |
| `agents/reviewer.md` | Reviewer role pack (finding contract, severity rubric, adversarial self-check, JSON output). |
| `agents/challenger.md` | Challenger role pack (kill strategies, VALID/INVALID/AMBIGUOUS, JSON output). |
| `agents/judge.md` | Judge role pack (dedup, labels, severity audit, dual verdict, artifact schemas). |
| `lenses/<name>/lens.md` | Lens manifest: name, description, apply-when signals. |
| `lenses/<name>/rules.md` | The lens's domain checklist — the actual review knowledge. |

The `agents/*.md` files are role packs, not pi-registered agent types and no
longer subagent prompts: the reviewing process reads them and adopts one per
phase (ADR 0004).

## Data flow

1. `index.ts` never touches review logic. It reads a SKILL.md and sends it to
   the agent with `triggerTurn`. Skills are the unit of behavior.
2. The agent runs the skill: scans lenses, matches signals, merges the repo
   overlay (`.gbencke/adversarial-review/lenses/`), then runs **every matched
   lens without asking** (`--lenses` narrows it; there is no lens picker, which
   is what makes `pi -p` batch runs possible). Language lenses (`*.go`, `*.ts`
   signals) review only matching chunks; `always` lenses review every chunk.
3. Phases hand terse JSON to each other. Source files are dropped after each
   chunk and only challenger JSON survives — with no subagents to absorb
   context, the reviewing process's own context is the scaling limit.
4. The judge writes the only two files: `reports/<ts>-<target>-<lens>.md` and
   `reports/<ts>-<target>-<lens>.findings.json`, then prints the path on a final
   `REPORT: ` line. The lens is in the basename because concurrent processes
   share the directory.
5. `/review-consolidate` sits above all of it: required repo list and `--out`,
   one bash call to `bin/run-matrix.sh`, then a merge of every sidecar into one
   document ordered by severity then repo. It reads no source files.

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

1. Proposal and refutation are separate phases, never merged. (ADR 0001)
2. No subagents. Parallelism is processes, one per (repo × lens). (ADR 0004)
3. Reviews execute nothing in the reviewed repo. (ADR 0002)
4. Every finding is specific: code path + failure condition + evidence.
5. Lenses are data. Adding a topic is adding a directory, never code.

## Research basis

Architecture synthesized from: `wan-huiyan/agent-review-panel` (panel +
debate + judge), `gaurav-yadav/adversarial-ai-review` (propose/kill pairs,
~7% FP in production), diffray and Ellipsis write-ups (specialization vs
context dilution, decomposition), AWS Well-Architected (SEC11-BP04, REL01),
and the change-impact/blast-radius literature. Full reasoning in
`docs/adr/0001-adversarial-loop.md`.
