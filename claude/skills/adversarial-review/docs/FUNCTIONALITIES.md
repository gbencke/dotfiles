# Functionalities — deep dive

## 1. The adversarial loop

Every review, both shapes, runs the same loop — three phases, one process, no
subagents (ADR 0004):

1. **Propose** — the reviewer role finds candidate findings for one lens. The
   finding contract: `file:line` + failure condition + evidence + severity
   (P0–P3).
2. **Kill** — the challenger role tries to disprove each candidate against
   the actual code. Verdicts: VALID / INVALID / AMBIGUOUS.
3. **Judge** — dedup, severity audit, epistemic labels, verdict, artifacts.

Why not one smart reviewer? Published production data (500+ PRs,
`gaurav-yadav/adversarial-ai-review`): single-pass AI review produces
30–60% false positives; the propose/kill split produces ~7%. Research
consensus (Huang et al. 2023; Kamoi et al. 2024): LLMs cannot reliably
self-correct — whoever raises a concern must never be the one who resolves it,
which is why the phases stay separate even inside one process. See
`docs/adr/0001-adversarial-loop.md`.

### Where the parallelism lives

Not in subagents — in processes. `BASE_DIR/bin/run-matrix.sh` launches one `claude -p`
review per (repo × lens), all at once, each scoped to a single lens, and each
leaves an exit code, a log, and a report path behind. `/review-consolidate`
drives that fan-out and merges the sidecars. Rationale:
`docs/adr/0004-no-subagents.md`.

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

Exhaustive by design (ADR 0003). **The repo path is required** — there is no
cwd fallback, because batch runs invoke this from an unrelated directory.
The review chunks the repo along directory boundaries (splitting oversized
directories mechanically), matches lens signals, **runs every matched lens
without asking** (`--lenses a,b,c` narrows it; there is no lens picker), and
runs propose → kill → judge chunk by chunk, keeping only challenger JSON
between chunks. Language lenses review only their language's chunks. Always
skips: `.git`, vendored dependencies, build output, lock files, generated code,
binaries. The report's
`## Not reviewed` section lists everything skipped — exhaustiveness
claims stay honest.

Verdict: per-lens HEALTHY / NEEDS-ATTENTION / CRITICAL.

## 3. Change review (`/review-change`)

Targets: PR number/URL (via `gh`), branch diff (`git diff base...branch`),
or a patch file. The PR description / commit messages become the *change
intent* for the solution-fit verdict; anonymous patches get
correctness-only verdicts. Runs every matched lens without asking
(`--lenses` narrows it); language lenses apply only when the diff
touches their files.

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

### design

Ousterhout's *A Philosophy of Software Design* (2nd ed.), structural
chapters: complexity as change-amplification / cognitive load / unknown
unknowns (ch2), tactical vs strategic programming (ch3), deep vs shallow
modules and classitis (ch4), information leakage and temporal
decomposition (ch5), general-purpose interfaces (ch6), pass-through
methods and redundant layers (ch7), pull complexity down (ch8), together
or apart (ch9), designing twice (ch11), names (ch14), consistency (ch17),
obvious code (ch18). Excludes ch10 (errors → error-handling lens) and
ch12–13 (comments → docs lens) by design. Severity guidance is built in:
design findings cap at P1 unless they produce unknown unknowns.

### typescript

Type safety and async correctness for `.ts`/`.tsx` chunks: escape hatches
(`any`, unsafe `as`, `as any as T`, non-null `!`, unexplained
`@ts-ignore`), boundary assertion instead of validation, missing
discriminated unions, boolean traps, stringly-typed APIs, floating
promises, `forEach(async …)`, falsy-default `||` vs `??`. Style owned by
formatters/linters is out of scope.

### golang

Distilled from Effective Go, go.dev CodeReviewComments, Google + Uber
style guides, and *100 Go Mistakes*: unchecked/swallowed errors,
`%w`-loss, panic in library code, goroutines with no stop path, data
races, copied mutexes, `defer` in loops, unclosed HTTP bodies, defer arg
evaluation, slice capacity leaks, range-address capture (pre-1.22),
`any` abuse, premature interfaces, init side effects, global mutable
state, context misuse. Applies to `.go` chunks only.

### python

Advanced Python semantics for `.py` chunks: evaluation-time traps
(mutable defaults, late-binding closures, class-level mutables, missing
`functools.wraps`, import side effects), identity/equality/copy defects
(`is` on values, falsy-vs-`None`, broken `__eq__`/`__hash__`, shallow
copies), asyncio correctness (blocking calls in `async def`, unawaited
coroutines, orphaned tasks, `gather` error loss, missing timeouts),
GIL-blind threading and unbounded pools, resource lifecycle (missing
context managers, cleanup outside `finally`, unbounded reads), Python
exception shapes (`return` in `finally`, lost `raise ... from`, `assert`
as validation), typing escape hatches (`Any`, unexplained
`# type: ignore`, unchecked `Optional`), data correctness (float money,
naive datetimes), Python-specific security (`pickle`, `yaml.load`,
`shell=True`, f-string SQL), and mock/fixture test smells. Formatting is
ruff/black's job and out of scope.

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

Every review writes into the reviewed repo, with the lens in the basename so
concurrent per-lens runs cannot overwrite each other:

```
.gbencke/adversarial-review/reports/<yyyymmdd-hhmmss>-<target>-<lens>.md
.gbencke/adversarial-review/reports/<yyyymmdd-hhmmss>-<target>-<lens>.findings.json
```

`<lens>` is the single lens's name, or `multi` when one run covered several.
The last line of the chat summary is the absolute report path prefixed
`REPORT: ` — batch callers parse that instead of scanning mtimes.

`/review-consolidate` adds one more artifact, outside the repos, at the
required `--out` path: a cross-repo document ordered by severity then repo,
with a summary table (repo × lens × counts), a coverage table built from the
matrix manifest, cross-repo themes, and a `## Not consolidated` section listing
failed pairings with their logs.

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
