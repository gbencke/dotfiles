# PlatformSync Inbound Table Capacity Skill

Checks consumed vs provisioned RCU and WCU for the
`platformsync-{env}-inbound-events` DynamoDB table and all its GSIs.
Also reports read and write throttle events over the lookback window.

---

## Environment & Table Config

| Setting | Value |
|---|---|
| Default environment | `sqa` |
| AWS profile | `rt-{env}` |
| Region | `us-east-1` |
| Table | `platformsync-{env}-inbound-events` |

Supported environments: `sqa`, `uat`, `dev`, `prod`.

---

## Data Collection Script

```bash
python3 /home/gbencke/.pi/agent/skills/platformsync-inbound-capacity/capacity_check.py sqa --minutes 15
```

Replace `sqa` with the target environment. `--minutes` controls the CloudWatch lookback window (default: 5, recommended: 15).

The script prints CSV to stdout:

```
name, prov_rcu, avg_rcu, rcu_pct, read_throttles,
      prov_wcu, avg_wcu, wcu_pct, write_throttles
```

- `avg_rcu` / `avg_wcu` — average consumed CU/s over the window (Sum ÷ seconds).
- `rcu_pct` / `wcu_pct` — consumed as a percentage of provisioned.
- `read_throttles` / `write_throttles` — total throttle events over the window.

---

## Output Format

### Part 1 — Capacity table

Render as a markdown table, sorted by `wcu_pct` descending:

| name | prov_rcu | avg_rcu | rcu% | r_throttles | prov_wcu | avg_wcu | wcu% | w_throttles |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| … | … | … | … | … | … | … | … | … |

- Right-align all numeric columns.
- Strip the `platformsync-{env}-inbound-` prefix from GSI names for readability.
- Highlight rows where `wcu_pct > 80` or `rcu_pct > 80` with a ⚠️ prefix.
- Highlight rows where throttles > 0 with a 🔴 prefix.

### Part 2 — Written analysis

**vs. previous check** — if a prior check exists in this session, call out
meaningful changes in utilisation or throttle counts per row. Use plain
language: "WCU pressure easing", "throttling spiked on status-creation-index".

**Overall utilisation** — one sentence on whether the table is comfortably
provisioned, approaching limits, or over-provisioned.

**Throttle hotspots** — call out any GSI or table row with throttle events > 0.
Explain the likely cause:
- `status-creation-index` write throttles → status update storms during bulk
  processing (common during load tests or reprocessing runs).
- `entityid-status-index` read throttles → heavy parent-lookup activity from
  the promote_wait script or OOO Lambda.
- Table-level write throttles → aggregate write rate exceeding base table WCU.

**Recommended action:**
- Any throttle > 0 → identify the GSI and consider increasing its WCU, or
  check if a bulk operation (reprocess, promote_wait) is still running.
- wcu_pct > 80 on a GSI → raise that GSI's WCU before throttling begins.
- All throttles = 0, all pct < 50 → "table is comfortably provisioned".
- All throttles = 0, all pct < 10 → "table may be over-provisioned; consider
  reducing capacity or switching to PAY_PER_REQUEST".

---

## Known Behaviours

- **`status-creation-index` write storms** — every status transition
  (REQUEST → PROCESSING → COMPLETE) writes to this GSI. During bulk
  processing of tens of thousands of rows it absorbs the highest WCU pressure
  of any GSI. Throttles here are the first sign of capacity stress.

- **`entityid-status-index` read spikes** — the `promote_wait.py` script and
  the OOO fault-tolerance Lambda both query this GSI heavily to check parent
  COMPLETE status. A promote run over thousands of WAIT rows will spike RCU on
  this GSI.

- **Table-level write throttles** — the base table WCU caps the aggregate
  write rate across all GSIs. If table-level throttles appear alongside clean
  GSI numbers, the base table WCU is the constraint.

- **avg_rcu/wcu reflects the window average** — a 5-minute window during an
  active bulk run will show peak load; a 15-minute window smooths spikes.
  Use `--minutes 5` when actively monitoring a run, `--minutes 15` for a
  steady-state health check.
