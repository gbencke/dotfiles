---
name: platformsync-inbound-queue
description: >
  Check the current row counts of the PlatformSync inbound events DynamoDB
  table, broken down by status (REQUEST, REPROCESS, PROCESSING, ERROR, WAIT)
  and message_type. Renders a single consolidated markdown table with per-type
  counts and row/column totals, followed by a written analysis of pipeline
  health, bottlenecks, and trends vs. the previous check in the same session.
  Also promotes eligible WAIT rows to REQUEST by verifying all parent
  dependencies are COMPLETE via the entityid-status GSI.
  Use when asked to "check inbound queue", "check event row status",
  "check REQUEST/PROCESSING/ERROR rows", "check the queue",
  "promote WAIT rows", "unblock WAIT rows", "check if WAIT rows can be
  promoted", or invokes /platformsync-inbound-queue or /promote-wait.
---

# PlatformSync Inbound Queue Status Skill

Queries the `platformsync-{env}-inbound-events` DynamoDB table via its
`platformsync-{env}-inbound-status-creation-index` GSI (hash key: `status`)
to count rows by status and `message_type` without performing an expensive
full-table scan.

---

## Environment & Table Config

| Setting | Value |
|---|---|
| Default environment | `sqa` |
| AWS profile | `rt-{env}` |
| Region | `us-east-1` |
| Table | `platformsync-{env}-inbound-events` |
| GSI | `platformsync-{env}-inbound-status-creation-index` |

Supported environments: `sqa`, `uat`, `dev`, `prod`.

---

## Statuses Tracked

| Status | Meaning |
|---|---|
| `REQUEST` | Awaiting first pick-up by the Inbound Lambda |
| `REPROCESS` | Queued for retry after a transient failure |
| `PROCESSING` | Currently being handled by the Inbound Lambda |
| `COMPLETE` | Successfully processed (not tracked — terminal, excluded) |
| `ERROR` | Failed after exhausting retries |
| `WAIT` | Blocked on a parent entity dependency |

---

## Data Collection Script

Use the helper script at `queue_status.py` (relative to this skill file).
Run it via the `bash` tool:

```bash
python3 /home/gbencke/.pi/agent/skills/platformsync-inbound-queue/queue_status.py sqa
```

Replace `sqa` with the target environment. The script prints CSV to stdout
with columns: `message_type, REQUEST, REPROCESS, PROCESSING, ERROR, WAIT, TOTAL`.

---

## Output Format

### Part 1 — Consolidated table

Render the CSV output as a right-aligned markdown table:

| message_type | REQUEST | REPROCESS | PROCESSING | ERROR | WAIT | TOTAL |
|---|---:|---:|---:|---:|---:|---:|
| … | … | … | … | … | … | … |
| **TOTAL** | **…** | **…** | **…** | **…** | **…** | **…** |

- Sort rows by TOTAL descending.
- Bold the TOTAL row.
- Right-align all numeric columns.

### Part 2 — Written analysis

Always include the following after the table:

**vs. previous check** — if a prior check exists in this session, state the
total delta (e.g. "612k → 545k, -67k") and highlight meaningful changes per
status or message_type. Use plain language: "draining fast", "pipeline stalled",
"new wave arrived".

**Pipeline health** — one or two sentences on overall state. Is it draining,
stalled, or growing?

**Bottlenecks** — call out any message_type dominating ERROR or WAIT. Explain
the likely cause (e.g. throttling, parent-not-found ordering race, Lambda stall).

**Recommended action** — suggest next steps only when warranted:
- ERROR rows present → suggest reprocessing.
- PROCESSING frozen across checks → suggest resetting to REQUEST.
- ERROR = 0, REQUEST = 0, PROCESSING low → "nearly done, monitor one more cycle".
- All zeros → "table fully drained".

---

## Known Behaviours

- **`case` errors cascade** — `case` failures block all child entities
  (`visitNote`, `appointment`, `visitPlan`, `patientInsurance`, `questionnaire`,
  `surgery`, `medicalCondition`) which pile up in WAIT. Reprocessing `case`
  errors unblocks the entire downstream chain.

- **Throttling pattern** — bulk `case` errors with message
  `API failure after 8 retries: GraphQL mutation error: The request was throttled`
  indicate AppSync/Aurora pressure. These self-resolve as load eases; reprocessing
  accelerates recovery.

- **Parent-not-found ordering races** — `visitNote → Appointment not found` and
  `appointment/visitPlan → Case not found` are ordering races where a child
  arrived before its parent completed. Safe to reprocess once PROCESSING = 0.

- **PROCESSING frozen** — if PROCESSING count is identical across two consecutive
  checks with REQUEST = 0, the Lambda is likely stalled. Reset PROCESSING → REQUEST
  to re-trigger the DynamoDB stream event and re-queue via the dispatcher.

- **GSI throttling on bulk updates** — when resetting thousands of rows in
  parallel, the `status` GSI may throttle. Use exponential backoff (up to 5
  retries) and chunk updates in batches of 200 with 20 workers max.

---

## WAIT → REQUEST Promotion

### How it works

A WAIT row has one or more parent columns (e.g. `parentCaseId`, `parentPersonId`)
holding the full entity_id key of a dependency. The row can only be promoted to
REQUEST when **every** non-null parent has at least one COMPLETE record in the
`entityid-status-index` GSI. COMPLETE is a terminal state, so confirmed results
are cached in-process to avoid redundant GSI round-trips.

### Parent columns checked

| Column | Parent entity |
|---|---|
| `parentPersonId` | PERSON |
| `parentCaseId` | CASE |
| `parentLocationId` | LOCATION |
| `parentProviderId` | PROVIDER |
| `parentAppointmentId` | APPOINTMENT |
| `parentNoteId` | CLINICAL_NOTE |
| `parentProcedureId` | PROCEDURE |
| `parentFclassId` | FCLASS |

### Promotion script

Run via the `bash` tool:

```bash
nohup python3 /home/gbencke/.pi/agent/skills/platformsync-inbound-queue/promote_wait.py sqa \
  > /tmp/promote_wait.log 2>&1 &
echo "PID: $!"
```

Then tail the log for progress:

```bash
tail -f /tmp/promote_wait.log
```

### Output

```
Collecting WAIT rows...
Found 1589 WAIT rows — checking parent dependencies...
  Progress: 100/1589 — promoted=70, skipped=30, errors=0
  ...
Done — promoted: 576 (new=451, race=125), skipped (deps not met): 1013, errors: 0

Promoted by type:
  visitNote: 238
  appointment: 72
  ...

Skipped by type (parents not COMPLETE):
  visitNote: 549
  ...
```

- **promoted** — rows whose parents are all COMPLETE; reset to REQUEST.
- **race** — `already_promoted` via `ConditionalCheckFailedException`; the OOO Lambda or a concurrent thread got there first — still a success.
- **skipped** — at least one parent not yet COMPLETE; left in WAIT.
- **errors** — genuine failures (throttling after retries, IAM, etc.).

### When to run

- PROCESSING = 0, REQUEST = 0, but WAIT > 0 → parents may all be COMPLETE now.
- After reprocessing ERRORs that were parent rows (e.g. `case`) — children in WAIT may unblock.
- After the OOO fault-tolerance Lambda interval (10 min) passes without WAIT count dropping.

### Known behaviour

- **`already_promoted`** rows are counted as promoted successes — not failures.
- **Skipped rows** with genuine unmet dependencies will remain in WAIT until either the parent completes or the OOO Lambda promotes them on its next 10-minute cycle.
- COMPLETE cache is per-process only. Re-run after a long gap if new parents have completed in the meantime.
