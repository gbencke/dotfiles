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

Values are derived from SQA load-test CloudWatch metrics (2026-05-29/30).
All provisioned values = observed peak + 30% safety buffer, rounded up.

### Table
| Capacity | Peak Observed | Provisioned |
|---|---:|---:|
| Write (WCU) | 2,502 /s | **15,000** |
| Read  (RCU) |   724 /s |  **1,000** |

> Table WCU raised from 3,500 → 15,000 on 2026-05-31 after a bulk-delete
> operation confirmed 3,500 WCU is the hard ceiling at 100 workers.

### GSIs
| GSI (suffix only) | WCU | RCU |
|---|---:|---:|
| `status-creation-index`         | 6,000 | 1,000 |
| `pk-status-index`               | 6,000 |   500 |
| `entityid-status-index`         | 6,000 |   500 |
| `parentpersonid-status-index`   | 6,000 |   500 |
| `parentcaseid-status-index`     | 5,500 |   500 |
| `parentlocationid-status-index` | 4,500 |   500 |
| `parentproviderid-status-index` | 4,500 |   500 |
| `parentappointmentid-status-index` | 4,500 | 500 |
| `messageid-index`               | 3,500 |   500 |
| `creation-index`                | 3,500 |   500 |
| `parentnoteid-status-index`     | 3,500 |   100 |
| `parentprocedureid-status-index`| 3,500 |   100 |
| `parentfclassid-status-index`   | 3,500 |   100 |

> `status-creation-index` is the hottest GSI — it recorded 5.1 M throttle
> events during the load test and receives every status-change write.
>
> `parentnoteid`, `parentprocedureid`, `parentfclassid` GSIs raised from
> 100 → 3,500 WCU on 2026-05-31. At 100 WCU they were the first to throttle
> under any parallel write load, even though they hold few items.

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
