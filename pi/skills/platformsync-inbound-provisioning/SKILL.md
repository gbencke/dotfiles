---
name: platformsync-inbound-provisioning
description: >
  Switch the platformsync-{env}-inbound-events DynamoDB table between
  PAY_PER_REQUEST (on-demand) and PROVISIONED billing modes. Apply uses
  capacity values derived from load-test peak metrics to eliminate throttling.
  Revert restores on-demand mode. Always shows a dry-run plan and asks for
  confirmation before making any change. Use when asked to "apply provisioned
  capacity", "switch inbound table to provisioned", "revert inbound table to
  on-demand", "fix throttling on inbound events table", or invokes
  /platformsync-inbound-provisioning.
---

# PlatformSync Inbound Events — DynamoDB Provisioning Skill

Two operations on `platformsync-{env}-inbound-events`:

| Operation | Trigger phrase |
|---|---|
| **Apply** — switch to PROVISIONED | "apply provisioned", "fix throttling", "switch to provisioned" |
| **Revert** — switch back to PAY_PER_REQUEST | "revert to on-demand", "revert provisioned", "switch back to on-demand" |

Both scripts are environment-aware (`sqa` · `uat` · `dev` · `prod`).
Default environment: `sqa`.

---

## Environment & Table Config

| Setting | Value |
|---|---|
| AWS profile | `rt-{env}` |
| Region | `us-east-1` |
| Table | `platformsync-{env}-inbound-events` |

---

## Capacity Rationale

All values doubled on 2026-05-31 following AWS account quota increase approval
(provisioned WCU limit raised 80,000 → 200,000). Base values derived from
live provisioned state verified via `capacity_check.py`, with
`status-creation-index` at 9,000 WCU before doubling.
Account WCU limit: **200,000**.
Total across table + 13 GSIs: **157,000 WCU** (43,000 headroom).

### Table
| Capacity | Provisioned |
|---|---:|
| Write (WCU) | **30,000** |
| Read  (RCU) |  **2,000** |

### GSIs
| GSI (suffix only) | WCU | RCU |
|---|---:|---:|
| `status-creation-index` ⚠️ hottest GSI | **18,000** | 2,000 |
| `pk-status-index`                      | 12,000 | 2,000 |
| `entityid-status-index`                | 12,000 | 2,000 |
| `parentpersonid-status-index`          | 12,000 | 2,000 |
| `parentcaseid-status-index`            | 11,000 | 2,000 |
| `parentlocationid-status-index`        |  9,000 | 2,000 |
| `parentproviderid-status-index`        |  9,000 | 2,000 |
| `parentappointmentid-status-index`     |  9,000 | 2,000 |
| `messageid-index`                      |  7,000 | 2,000 |
| `creation-index`                       |  7,000 | 2,000 |
| `parentnoteid-status-index`            |  7,000 | 2,000 |
| `parentprocedureid-status-index`       |  7,000 | 2,000 |
| `parentfclassid-status-index`          |  7,000 | 2,000 |

> `status-creation-index` is the hottest GSI — recorded 223,541 write
> throttle events during the 2026-05-31 migration run. Provisioned at 18,000
> WCU (9,000 base × 2) to absorb burst spikes without throttling.
>
> Account WCU quota raised 80,000 → 200,000 on 2026-05-31 (AWS Support
> case approved). 43,000 WCU headroom remains.

---

## Operation: Apply Provisioned

### When to use
Before a load test or any high-throughput batch operation on the inbound
table. Pre-provision to the peak values so DynamoDB never throttles.

### Script
```bash
python3 /home/gbencke/.pi/agent/skills/platformsync-inbound-provisioning/apply_provisioned.py sqa
```

Flags:
- `--yes` — skip the confirmation prompt (use in automated pipelines)
- `--dry-run` — print the plan without making any AWS call

### What the script does
1. Fetches the current billing mode and throughput from `describe-table`.
2. Prints a **before / after** plan for the table and all 13 GSIs.
3. Prompts for confirmation (skipped with `--yes`).
4. Calls `update-table` with `BillingMode=PROVISIONED`, table throughput,
   and all GSI throughput values in a single API call.
5. Polls `describe-table` every 10 s until `TableStatus = ACTIVE` and all
   GSI statuses are `ACTIVE`.
6. Prints the confirmed final state.

### Expected output (excerpt)
```
Environment : sqa
Table       : platformsync-sqa-inbound-events
Current mode: PAY_PER_REQUEST

Planned changes
  Table  WCU 0 → 3500   RCU 0 → 1000
  GSI status-creation-index          WCU 0 → 6000  RCU 0 → 1000
  GSI pk-status-index                WCU 0 → 6000  RCU 0 →  500
  ...

Proceed? [y/N]:
Applying...
Waiting for ACTIVE (attempt 1/30)...
...
Done. Table is ACTIVE. Billing mode: PROVISIONED
```

---

## Operation: Revert to On-Demand

### When to use
After the load test completes. On-demand is cheaper at normal traffic levels
and removes the need to manage capacity values.

### Script
```bash
python3 /home/gbencke/.pi/agent/skills/platformsync-inbound-provisioning/revert_to_ondemand.py sqa
```

Flags:
- `--yes` — skip confirmation
- `--dry-run` — print plan only

### What the script does
1. Fetches current billing mode.
2. If already `PAY_PER_REQUEST`, exits with a notice — nothing to do.
3. Prints a summary of the revert.
4. Prompts for confirmation.
5. Calls `update-table` with `BillingMode=PAY_PER_REQUEST`.
   (GSI throughput is managed automatically by DynamoDB in on-demand mode —
   no GSI updates are needed.)
6. Polls until `TableStatus = ACTIVE`.
7. Prints confirmed final state.

### Expected output (excerpt)
```
Environment : sqa
Table       : platformsync-sqa-inbound-events
Current mode: PROVISIONED  (WCU=3500, RCU=1000)

Planned change: PROVISIONED → PAY_PER_REQUEST

Proceed? [y/N]:
Reverting...
Waiting for ACTIVE (attempt 1/30)...
Done. Table is ACTIVE. Billing mode: PAY_PER_REQUEST
```

---

## Warnings

- **4 decreases per day limit** — DynamoDB allows at most 4 provisioned-capacity
  decreases per calendar day per table. The revert counts as a decrease on the
  table (not the GSIs). Plan your test/revert cycles within this budget.

- **Auto Scaling is NOT configured by these scripts** — the scripts set static
  provisioned values. If you want Auto Scaling on top, configure it separately
  via `application-autoscaling` after the table reaches ACTIVE.

- **Transition time** — switching billing modes takes 1–5 minutes. The table
  remains fully available during this window but shows `TableStatus = UPDATING`.

- **GSI throttles are independent** — in PROVISIONED mode each GSI has its own
  capacity. A spike that exhausts a GSI's WCU will still cause throttling even
  if the table has capacity to spare.

- **`prod` guard** — both scripts will print an extra confirmation line when
  `env = prod` to prevent accidental production changes.
