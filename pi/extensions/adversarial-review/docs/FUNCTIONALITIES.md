# Functionalities — deep dive

## 1. The adversarial loop

Every review, both shapes, runs the same loop:

1. **Propose** — per-lens reviewers find candidate findings. The finding
   contract: `file:line` + failure condition + evidence + severity (P0–P3).
2. **Kill** — per-lens challengers try to disprove each candidate against
   the actual code. Verdicts: VALID / INVALID / AMBIGUOUS.
3. **Judge** — dedup, severity audit, epistemic labels, verdict, artifacts.

Why not one smart reviewer? Published production data (500+ PRs,
`gaurav-yadav/adversarial-ai-review`): single-pass AI review produces
30–60% false positives; the propose/kill split produces ~7%. Research
consensus (Huang et al. 2023; Kamoi et al. 2024): LLMs cannot reliably
self-correct — the agent that raises a concern must never be the one that
resolves it. See `docs/adr/0001-adversarial-loop.md`.

### Epistemic labels

| Label | Meaning |
|-------|---------|
| `[CONFIRMED]` | Challenger validated it, with cited kill attempts |
| `[CONSENSUS]` | Raised independently by ≥2 lenses |
| `[NEEDS-HUMAN]` | AMBIGUOUS — says exactly what a human must check |

### Severity rubric

- **P0** — ship-blocker: correctness, data integrity, security
- **P1** — real defect, real cost, not a blocker
- **P2** — structural / future-rot
- **P3** — nit

## 2. Repo review (`/review-repo`)

Exhaustive by design (ADR 0003). The orchestrator chunks the repo along
directory boundaries (splitting oversized directories mechanically),
matches lens signals, and runs propose → kill → judge per lens across all
chunks. Always skips: `.git`, vendored dependencies, build output, lock
files, generated code, binaries. The report's `## Not reviewed` section
lists everything skipped — exhaustiveness claims stay honest.

Verdict: per-lens HEALTHY / NEEDS-ATTENTION / CRITICAL.

## 3. Change review (`/review-change`)

Targets: PR number/URL (via `gh`), branch diff (`git diff base...branch`),
or a patch file. The PR description / commit messages become the *change
intent* for the solution-fit verdict; anonymous patches get
correctness-only verdicts.

Verdict: **dual** — IMPLEMENTATION_CORRECTNESS × SOLUTION_FIT →
SHIP / FIX-THEN-SHIP / DO-NOT-SHIP. Perfect code implementing the wrong
approach gets REVISE — the most expensive defect class in software.

## 4. The lenses

### aws

Reviews Terraform/CDK/CloudFormation/Serverless/Pulumi and AWS-SDK code
against Well-Architected practices and **documented service limits**:
API Gateway's 29s ceiling vs Lambda timeouts behind it, SQS 256KB /
visibility-timeout vs processing time, DynamoDB 400KB items and hot
partition keys, unpaginated SDK list calls (silent truncation at 1000),
public buckets, wildcard IAM, missing DLQs, missing encryption at rest.
Static knowledge only — no AWS credentials, no live API calls (ADR 0002).

### docs

Documentation-drift detection: docstrings that document removed
parameters, promised behavior the code no longer implements ("retries
three times" — retries once), stale examples calling old signatures,
copy-pasted docs on diverged functions, aged TODOs. The lens fights lies,
not brevity — missing docs on obvious code are explicitly out of scope.

### tests

Reads existing coverage reports (`coverage.xml`, `lcov.info`) when
present; otherwise statically maps source files to test files. Flags
untested modules (weighted by criticality), hollow tests (no assertions,
tautologies, mock-only verification), skipped critical tests, order
dependence, sleep-based synchronization. Never runs the suite.

### chaos

Static failure-tolerance review: missing timeouts, retries without
backoff/jitter, retries on non-idempotent operations, missing circuit
breakers, unbounded per-request work, cleanup that only runs on the happy
path. Every finding carries a **proposed chaos experiment**: steady-state
hypothesis, fault to inject, expected resilient behavior. Never executes
experiments, never generates manifests.

### test-surface (change-only)

Enumerates the diff's behavior surface — touched public APIs, new
branches, changed boundaries, new error paths — and asks the kill
question for each: *if this changed line were deleted or inverted, which
test goes red?* Also flags assertions weakened inside the same diff
(deleted asserts, widened tolerances) — the change hiding its own
breakage.

### blast-radius (change-only)

Starts from the orchestrator's mechanical reverse import/caller graph
(changed symbols → dependents via ast-grep/grep), then adds the couplings
imports cannot see: event/topic consumers, HTTP/RPC contract clients, DB
schema readers (including raw SQL), config/flag consumers, serialization
formats. Classifies change kind (schema/API > shared module > logic >
cosmetic) and assigns a risk tier (HIGH/MEDIUM/LOW) with the required
mitigation (migration plan, staged rollout, downstream notification).

### security

Reachable attack paths only: injection (SQL, command, template, path),
missing authz (IDOR/BOLA via path-param fetches without ownership
checks), JWT verification gaps, hardcoded or logged secrets, weak crypto,
unsafe deserialization. Every finding names the entry point and the
payload shape that reaches the defect.

### performance

Defects with a scaling variable: N+1 queries (loop bound × query),
unbounded fetches, application-side filtering of database-sized data,
sync-in-async blocking of event loops, O(n²) in request paths, unbounded
caches keyed by unbounded input, locks held across I/O.

### error-handling

Failure-path correctness: swallowed exceptions (empty catch, catch-all
that masks programming errors), lost exception causes, log lines without
identifiers, partial writes without compensation, ack-before-durable-done
message loss, 200-status-on-failure, stack traces leaked to clients.

## 5. Artifacts

Every review writes into the reviewed repo:

```
.gbencke/adversarial-review/reports/<yyyymmdd-hhmmss>-<target>.md
.gbencke/adversarial-review/reports/<yyyymmdd-hhmmss>-<target>.findings.json
```

The markdown is PR-comment-ready (change mode: verdict first). The JSON
sidecar schema:

```json
{
  "target": "...", "mode": "change", "date": "...",
  "verdict": { "implementation": "...", "solution_fit": "...", "overall": "..." },
  "counts": { "P0": 0, "P1": 0, "P2": 0, "P3": 0 },
  "findings": [ { "id", "severity", "lenses", "labels", "file", "line",
                  "title", "failure_condition", "evidence", "suggestion" } ]
}
```

CI gate example: fail when `counts.P0 > 0` or `verdict.overall ==
"DO-NOT-SHIP"`.

## 6. Known limits

- **Same-model bias**: reviewers and challengers may share one base model;
  unanimous agreement can reflect shared blind spots. The judge flags thin
  evidence with `⚠️ HUMAN REVIEW RECOMMENDED`, but this is structured
  self-critique, not independent verification.
- **Static only**: no runtime behavior, no live quota data, no real
  coverage execution (ADR 0002). Findings about runtime state cap at
  AMBIGUOUS.
- **Cost scales with lenses × chunks**: a large repo is many agents. The
  orchestrator batches and the queue schedules, but budget reviews belong
  on change targets, not monorepos.
