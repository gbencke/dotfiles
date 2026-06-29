---
name: platformsync-error-deep-dive
description: >
  Analyse ERROR rows in the platformsync-{env}-inbound-events DynamoDB table
  for one or more tenants over a given time window, then produce a deep-dive
  markdown report per tenant. Each report includes a full error breakdown by
  message_type and root cause, a code path trace through
  322.PlatformSync-Logic-Service and the relevant downstream microservice
  resolvers, and a prioritised action table. Reports are written to
  331.obsidian-scripts/01.Technical/deployments/YYYY.MM.DD.{ENV}/ and the repo
  is committed and pushed automatically.
  Use when asked to "analyse inbound errors", "create error deep dive",
  "generate error report for tenant", "deep dive inbound errors",
  "what errors does tenant X have", or invokes /platformsync-error-deep-dive.
---

# PlatformSync Error Deep Dive Skill

Produces one structured markdown report per tenant containing the full
analysis of ERROR rows in the `platformsync-{env}-inbound-events` DynamoDB
table for a given time window.

---

## Inputs — collect before starting

Ask for any missing inputs before proceeding:

| Input | Description | Example |
|---|---|---|
| **env** | Target environment | `prod`, `uat`, `sqa` |
| **tenants** | One or more tenant UUIDs | `6e52f420-6cbb-4b30-aa06-b8d63bd1fa02` |
| **start time** | UTC timestamp (inclusive) | `2026-06-29T16:00:00` or `today 4:00 PM UTC` |
| **end time** | UTC timestamp (exclusive) | optional — defaults to *now* |

AWS profile is derived as `rt-{env}` (e.g. `rt-prod`). Region is always
`us-east-1`.

---

## Infrastructure

| Setting | Value |
|---|---|
| Table | `platformsync-{env}-inbound-events` |
| GSI | `platformsync-{env}-inbound-status-creation-index` |
| GSI hash key | `status` |
| GSI sort key | `creation` (ISO-8601 string) |
| PK format | `{tenantId}#{entityType}#{entityId}` |

---

## Step 1 — Collect raw data

Run `analyze_errors.py` (next to this SKILL.md) once per tenant:

```bash
SKILL_DIR="$HOME/git.work/000.INFRA/dotfiles/skills/platformsync/platformsync-error-deep-dive"

AWS_PROFILE=rt-{env} python3 "$SKILL_DIR/analyze_errors.py" {env} \
    --tenant {tenant_uuid} \
    --min-date {start_time} \
    [--max-date {end_time}] \
    > /tmp/errors_{tenant_short}_{env}.json
```

Replace `{tenant_short}` with the first 8 characters of the UUID.

The script paginates the GSI in parallel 15-minute windows (up to 32
threads), normalises error messages (collapses UUIDs, entity IDs, S3 URIs,
payor codes), and emits a JSON report to stdout with this shape:

```json
{
  "total": 3465,
  "window": { "min": "...", "max": "..." },
  "tenant": "...",
  "env": "prod",
  "by_type": { "visitPlan": 3063, "visitNote": 394, ... },
  "groups": [
    { "message_type": "visitPlan", "error": "<normalised>", "count": 3059 },
    ...
  ],
  "payor_codes": { "10238": 8065, ... },
  "visitplan_close_months": { "2026-01": 38, "2026-02": 70, ... }
}
```

---

## Step 2 — Code deep dive

After collecting the JSON, trace every error class present through the
codebase. Always do this — do not skip the code analysis.

### Primary repos to inspect

| Repo | Role |
|---|---|
| `~/git.work/322.PlatformSync-Logic-Service` | Inbound Lambda — dispatches all mutations, handles retries, classifies errors |
| `~/git.work/326.micro-tenant-service-resolver` | GraphQL resolver for tenant entities (`case`, `appointment`, `patientDemo`, `user`, …) |
| `~/git.work/337.micro-planofcare-service-backend` | `visitPlan` mutations (`ingestVisitPlan`, `createPlanOfCare`, finalized-plan guard) |
| `~/git.work/367.micro-treatment-service-backend` | `visitNote` treatment mutations (`bulkCreateTreatment`, DTO validation) |
| `~/git.work/368.micro-clinical-notes-service-backend` | `visitNote` note mutations (`createClinicalNote`) |

Grep the error message text across repos to find the throw site:

```bash
grep -rn "<keyword from error>" ~/git.work/ --include="*.ts" 2>/dev/null \
  | grep -v "node_modules\|\.d\.ts\|test/"
```

### Key files in 322.PlatformSync-Logic-Service

| File | What to look for |
|---|---|
| `src/functions/inbound/index.ts` | Entry point — Lambda handler, dispatcher call |
| `src/functions/inbound/services/mutationExecutor.ts` | `executeWithRetry`, `nonRetryableValidationError` guard, `DEFAULT_MAX_MUTATION_ATTEMPTS`, `handleFinalFailure` |
| `src/functions/inbound/services/visitPlanService.ts` | `processVisitPlanDeletionLogic`, `validateAndDeleteExistingPlan`, finalized-plan throw |
| `src/functions/inbound/services/visitNoteService.ts` | `executeProceduresAndTreatmentsIfNeeded`, treatment mutation calls |
| `src/functions/inbound/services/errorHandling.ts` | `handleFinalFailure`, DLQ write, error classification |

### Retry behaviour (mutationExecutor.ts)

Understand for every error class whether it is:

| Behaviour | Trigger | Implication |
|---|---|---|
| **Fail fast (0 retries)** | Error text contains `Code: VALIDATION_ERROR` or `coerced Null value` | Non-retryable; safe to DLQ immediately |
| **Exhaust retries (5 attempts)** | Anything else | Retried `DEFAULT_MAX_MUTATION_ATTEMPTS` times before DLQ |
| **Explicit re-throw** | Specific `catch` blocks re-throw without retry | Check for `if (error.message.includes(...)) throw error` patterns |

For each error class in the report, state the retry behaviour and its cost
(e.g. "5× live GraphQL calls per row" or "0 retries, fails fast").

---

## Step 3 — Write the report

Write one file per tenant to:

```
~/git.work/331.obsidian-scripts/01.Technical/deployments/{YYYY.MM.DD}.{ENV}/
DEEP_DIVE_inbound_ERROR_rows_{YYYY-MM-DD}_{window_label}_tenant_{tenant_short}.md
```

Where:
- `{YYYY.MM.DD}` = date of the analysis run (today).
- `{ENV}` = uppercase env, e.g. `PROD`.
- `{window_label}` = compact label for the start time, e.g. `1600UTC`.
- `{tenant_short}` = first 8 characters of the tenant UUID.

Example:
```
01.Technical/deployments/2026.06.29.PROD/
  DEEP_DIVE_inbound_ERROR_rows_2026-06-29_1600UTC_tenant_6e52f420.md
```

### Report structure

```markdown
# Deep Dive: ERROR rows in `platformsync-{env}-inbound-events`

**Date:** {YYYY-MM-DD}
**Tenant:** `{full tenant UUID}`
**Window analysed:** rows with `creation >= {start}` (UTC), through ~{end} UTC
**Environment:** {env} (`AWS_PROFILE=rt-{env}`, us-east-1)
**Author:** Guilherme Bencke

---

## Headline

**{total} ERROR rows for this tenant {window context}.** {N} root causes
account for {pct}% of them:

1. **{dominant error class} ({count} rows — {pct}%)** — one-sentence
   summary. State reprocessability: "Not reprocessable — …" or "Retriable once …".
2. … (list top causes, highest-count first)

---

## Method

1. Queried `platformsync-{env}-inbound-status-creation-index` …
2. Paginated all {total} rows; projected `message_type`, `errorMessage`, `creation`, `payload`.
3. Normalised error messages …
4. Traced each error class through `322.PlatformSync-Logic-Service` and downstream microservice repos.

Script: `analyze_errors.py` (skill directory).

---

## Part 1 — ERROR count by message_type

| message_type | ERROR | % of total |
|---|---:|---:|
| {type} | {n} | {pct}% |
| **TOTAL** | **{total}** | **100%** |

---

## Part 2 — Error breakdown by root cause

One sub-section per error class, ordered by count descending.

### 2.N `{message_type}` — {short label} ({count} rows) [— DOMINANT / — KEYSTONE]

**Error (example):** `{raw error message from data}`

{If visitPlan close-time distribution is relevant, include a table:}
| Close time month | Rows |
|---|---:|

**Code path ({repo}):**
```
{file}: {function}
  → {call chain}
    → {throw site} — throws "{error text}"
```

**Retry behaviour:** {0 retries — fails fast / 5 attempts — exhausts retries}

**Root cause:** {1–3 sentences}

**Action required:** {concrete next steps}

{Optional: Representative payload as JSON code block}

---

## Part 3 — Prioritised actions

| Priority | Error class | Rows | Reprocessable? | Action |
|---|---|---:|---|---|
| 1 | {label} | {n} | No / Yes | {action} |
```

### Tagging rules

- Mark the highest-count single error class **DOMINANT** in its sub-section header.
- Mark any error class that blocks a large downstream cascade **KEYSTONE** (e.g. `payor` failures that cause all `patientInsurance` failures).
- State "Not reprocessable" whenever retrying will re-fail identically (replay, validation, source-data issue). State "Retriable" for transient failures (timeouts, transaction rollbacks, throttling).

---

## Step 4 — Commit and push

After writing all reports, commit and push the 331 repo automatically:

```bash
cd ~/git.work/331.obsidian-scripts

git add 01.Technical/deployments/{YYYY.MM.DD}.{ENV}/

git commit -m "Add {env} error deep dive(s) for {YYYY-MM-DD} {window_label} window

{N} tenant report(s) for platformsync-{env}-inbound-events ERROR rows
since {start_time} UTC:

{For each tenant:}
- tenant {tenant_short}: {total} errors — {one-line summary of dominant issue}
"

git push
```

---

## Known error patterns

Use these to quickly classify errors without grepping the repos every time.
Always verify against live code if the pattern looks stale.

### `visitPlan` — already finalized

- **Error text:** `Visit plan for visitNoteId <ID> is already finalized … and cannot be updated`
- **Source:** `visitPlanService.ts: validateAndDeleteExistingPlan` (feature flag OFF) or `planOfCare.ts: ingestVisitPlan` (feature flag ON, `337.micro-planofcare-service-backend`)
- **Retry:** 5 attempts (not in `nonRetryableValidationError` list — improvement opportunity)
- **Fix:** Stop source replay job. Consider adding `"already finalized"` to the non-retryable guard.

### `visitPlan` — null required field on segment

- **Error text:** `segment[n].<field> is a required field and it shouldn't be null (Code: VALIDATION_ERROR)`
- **Source:** plan-of-care service DTO validation
- **Retry:** 0 (fails fast — VALIDATION_ERROR code)
- **Fix:** Source must populate the required segment field.

### `visitNote` — `skillInterventionDetails` length

- **Error text:** `skillInterventionDetails must of length between 1 to 1000 (Code: VALIDATION_ERROR)`
- **Source:** `TreatmentDto` `@Length(1, 1000)` in `367.micro-treatment-service-backend`
- **Retry:** 0 (fails fast — VALIDATION_ERROR code)
- **Fix:** Source must send a non-empty string ≤ 1,000 characters, or transformer must truncate/strip the field.

### `visitNote` — treatment transaction rolled back

- **Error text:** `Error while creating treatments. Transaction rolled back. (Code: ROLLBACK_ERROR)`
- **Source:** `367.micro-treatment-service-backend` DB transaction failure
- **Retry:** 5 attempts
- **Fix:** Retriable once Aurora stabilises. Investigate treatment payload for constraint violations if rollback persists.

### `visitNote` — Lambda timeout

- **Error text:** `Task timed out after 20.00 seconds`
- **Source:** AWS Lambda 20-second function timeout; large notes with many sequential GraphQL calls
- **Retry:** 5 attempts
- **Fix:** Retriable once load subsides.

### `patientInsurance` — payor not found

- **Error text:** `Payor not found for payorCode: <CODE> … Cannot create patient insurance without a resolved payorId`
- **Source:** `326.micro-tenant-service-resolver` payor resolution step
- **Retry:** 5 attempts
- **Fix:** Payor records must be created first (`payor` messages must succeed). Marks as **KEYSTONE** when payor failures are also present.

### `payor` — CreatePayorInput schema mismatch

- **Error text:** `The variables input contains a field that is not defined for input object type 'CreatePayorInput'`
- **Source:** AppSync schema validation, rejected before reaching the resolver
- **Retry:** 5 attempts
- **Fix:** Reconcile payload with `CreatePayorInput` schema — drop or map the extra field. **KEYSTONE** — unblocks all downstream `patientInsurance` failures.

### `patientDemo` — email format

- **Error text:** `Invalid email format at patient.email[0]`
- **Source:** `326.micro-tenant-service-resolver` input validation
- **Retry:** 0 (fails fast — VALIDATION_ERROR code)
- **Fix:** Source must send a valid RFC-5322 email. Not reprocessable until corrected.

### `medicalHistory` — S3 file not found

- **Error text:** `The specified key does not exist` / `NoSuchKey`
- **Source:** S3 `GetObject` call in medicalHistory handler before GraphQL mutation
- **Retry:** 5 attempts
- **Fix:** S3 object must be present at the referenced key. Source data issue.

### Entity not found (dependency ordering race)

- **Error text:** `<Entity type> not found` (e.g. `Appointment not found`, `Case not found`)
- **Source:** Resolver lookup of a parent entity that has not yet completed
- **Retry:** 5 attempts
- **Fix:** Retriable once parent completes. Use `/platformsync-inbound-queue` → WAIT promotion after parent reaches COMPLETE.

### `workingHours` / unsupported message type

- **Error text:** `Unsupported message type: workingHours` (or similar)
- **Source:** `322.PlatformSync-Logic-Service` dispatcher — no handler registered
- **Retry:** 0 (fails fast — classified as non-retryable unsupported type)
- **Fix:** Either add a handler or suppress at the source/dispatcher level.

---

## Tips

- **Multiple tenants in one session** — run `analyze_errors.py` for each tenant, save to separate `/tmp/errors_<tenant_short>_<env>.json` files, then write all reports before the single commit.
- **Very large windows** — reduce `--chunk-minutes` to `5` if the table is heavily populated; increase to `60` for sparse windows.
- **Custom AWS profile** — pass `--profile <name>` to override the `rt-{env}` default.
- **No errors found** — still write the report stating zero errors in the window; commit and push.
