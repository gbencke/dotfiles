---
name: sqa-aurora-health
description: >
  Check the current health of all Aurora Serverless v2 clusters in the SQA
  environment (AWS_PROFILE=rt-sqa) for the new-gen microservices platform.
  Reports ACU (min/avg/max), CPU utilisation, and active connections for all
  26 clusters over the last 15 minutes, with trend analysis vs. the previous
  check. Use when asked to "check ACU", "check Aurora health", "check SQA
  clusters", or invokes /sqa-aurora-health.
---

# SQA Aurora Health Skill

Produces a full health snapshot of all 26 Aurora Serverless v2 clusters that
back the new-gen microservices platform in the SQA AWS account. Metrics are
pulled from CloudWatch over a 15-minute sliding window. Output includes a
formatted table and a written analysis of active clusters, anomalies, and
trends vs. the previous check in the same session.

---

## Cluster Registry

All clusters live in `us-east-1` under `AWS_PROFILE=rt-sqa`.

| Service | Cluster Identifier | Min ACU | Max ACU |
|---|---|---|---|
| Appointment | `rt-micro-common-infra-sqa-appointmentrdsrtmicrocom-dhvcrhk9elhw` | 4 | 256 |
| Authorization | `rt-micro-common-infra-sqa-authorizationrdsrtmicroc-sm2nk64sdofq` | 4 | 256 |
| Calendar | `rt-micro-common-infra-sqa-calendarrdsrtmicrocommon-x0o8fetpekqn` | 4 | 256 |
| Case | `rt-micro-common-infra-sqa-caserdsrtmicrocommoninfr-hqnv1kery93m` | 4 | 256 |
| ClinicalNote | `rt-micro-common-infra-sqa-clinicalnoterdsrtmicroco-ycpcr3dpxn7o` | 4 | 256 |
| Config | `rt-micro-common-infra-sqa-configrdsrtmicrocommonin-qcda0doggdrl` | 4 | 256 |
| Configuration | `rt-micro-common-infra-sqa-configurationrdsrtmicroc-shfyieivotj4` | 4 | 256 |
| Document | `rt-micro-common-infra-sqa-documentrdsrtmicrocommon-mwcebsvuxv0c` | 4 | 256 |
| Fax | `rt-micro-common-infra-sqa-faxrdsrtmicrocommoninfra-rauo4up86leq` | 4 | 256 |
| FormDocuments | `rt-micro-common-infra-sqa-formdocumentsrdsrtmicroc-fbjvzd5whfzk` | 4 | 256 |
| Hierarchy | `rt-micro-common-infra-sqa-hierarchyrdsrtmicrocommo-nlsnendbinv7` | 4 | 256 |
| IDMapping | `rt-micro-common-infra-sqa-idmappingrdsrtmicrocommo-hkmrinkg2bnx` | 4 | 256 |
| Ledger | `rt-micro-common-infra-sqa-ledgerrdsrtmicrocommonin-erszfhcpbn94` | 4 | 256 |
| Location | `rt-micro-common-infra-sqa-locationrdsrtmicrocommon-k9uceagzurs6` | 4 | 256 |
| MedicalForm | `rt-micro-common-infra-sqa-medicalformrdsrtmicrocom-lw8wlsxlqome` | 4 | 256 |
| NewGenLogs | `rt-micro-common-infra-sqa-newgenlogsrdsrtmicrocomm-ou3hvoxsxdjd` | 4 | 256 |
| PatientInsurance | `rt-micro-common-infra-sqa-patientinsurancerdsrtmic-fge9bfenpox8` | 4 | 256 |
| Payor | `rt-micro-common-infra-sqa-payorrdsrtmicrocommoninf-zokbzhx7jbtq` | 4 | 256 |
| Person | `rt-micro-common-infra-sqa-personrdsrtmicrocommonin-0ncwbxpkxdwr` | 4 | 256 |
| PlanOfCare | `rt-micro-common-infra-sqa-planofcarerdsrtmicrocomm-evglylltcfpe` | 4 | 256 |
| Provider | `rt-micro-common-infra-sqa-providerrdsrtmicrocommon-kawozfqmj4s4` | 4 | 256 |
| Referral | `rt-micro-common-infra-sqa-referralrdsrtmicrocommon-hup53cie3fxk` | 4 | 256 |
| Treatment | `rt-micro-common-infra-sqa-treatmentrdsrtmicrocommo-l1ouvmmwhb8o` | 4 | 256 |
| User | `rt-micro-common-infra-sqa-userrdsrtmicrocommoninfr-t19bszm5y58j` | 4 | 256 |
| PlatformSync | `platformsync-sqa-aurora` | 1 | 256 |
| MockData | `micro-mockdata-service-database` | 4 | 256 |

> **Note:** PlatformSync has a min of 1 ACU (all others are 4). All clusters
> were raised to 256 ACU max on 2026-05-21 after Appointment and Hierarchy
> repeatedly hit the previous 64 ACU ceiling during load testing.

---

## Metrics Collected

All three metrics are pulled from the `AWS/RDS` CloudWatch namespace using a
900-second period over a 15-minute window, reporting Minimum / Average / Maximum:

| Metric | What it measures |
|---|---|
| `ServerlessDatabaseCapacity` | Current ACU allocation (Serverless v2 capacity units) |
| `CPUUtilization` | CPU % of the underlying instance(s) |
| `DatabaseConnections` | Active connections to the cluster |

---

## Data Collection Script

Run this verbatim via `bash` tool with `AWS_PROFILE=rt-sqa`:

```bash
CLUSTERS=(
  "rt-micro-common-infra-sqa-appointmentrdsrtmicrocom-dhvcrhk9elhw:Appointment"
  "rt-micro-common-infra-sqa-authorizationrdsrtmicroc-sm2nk64sdofq:Authorization"
  "rt-micro-common-infra-sqa-calendarrdsrtmicrocommon-x0o8fetpekqn:Calendar"
  "rt-micro-common-infra-sqa-caserdsrtmicrocommoninfr-hqnv1kery93m:Case"
  "rt-micro-common-infra-sqa-clinicalnoterdsrtmicroco-ycpcr3dpxn7o:ClinicalNote"
  "rt-micro-common-infra-sqa-configrdsrtmicrocommonin-qcda0doggdrl:Config"
  "rt-micro-common-infra-sqa-configurationrdsrtmicroc-shfyieivotj4:Configuration"
  "rt-micro-common-infra-sqa-documentrdsrtmicrocommon-mwcebsvuxv0c:Document"
  "rt-micro-common-infra-sqa-faxrdsrtmicrocommoninfra-rauo4up86leq:Fax"
  "rt-micro-common-infra-sqa-formdocumentsrdsrtmicroc-fbjvzd5whfzk:FormDocuments"
  "rt-micro-common-infra-sqa-hierarchyrdsrtmicrocommo-nlsnendbinv7:Hierarchy"
  "rt-micro-common-infra-sqa-idmappingrdsrtmicrocommo-hkmrinkg2bnx:IDMapping"
  "rt-micro-common-infra-sqa-ledgerrdsrtmicrocommonin-erszfhcpbn94:Ledger"
  "rt-micro-common-infra-sqa-locationrdsrtmicrocommon-k9uceagzurs6:Location"
  "rt-micro-common-infra-sqa-medicalformrdsrtmicrocom-lw8wlsxlqome:MedicalForm"
  "rt-micro-common-infra-sqa-newgenlogsrdsrtmicrocomm-ou3hvoxsxdjd:NewGenLogs"
  "rt-micro-common-infra-sqa-patientinsurancerdsrtmic-fge9bfenpox8:PatientInsurance"
  "rt-micro-common-infra-sqa-payorrdsrtmicrocommoninf-zokbzhx7jbtq:Payor"
  "rt-micro-common-infra-sqa-personrdsrtmicrocommonin-0ncwbxpkxdwr:Person"
  "rt-micro-common-infra-sqa-planofcarerdsrtmicrocomm-evglylltcfpe:PlanOfCare"
  "rt-micro-common-infra-sqa-providerrdsrtmicrocommon-kawozfqmj4s4:Provider"
  "rt-micro-common-infra-sqa-referralrdsrtmicrocommon-hup53cie3fxk:Referral"
  "rt-micro-common-infra-sqa-treatmentrdsrtmicrocommo-l1ouvmmwhb8o:Treatment"
  "rt-micro-common-infra-sqa-userrdsrtmicrocommoninfr-t19bszm5y58j:User"
  "platformsync-sqa-aurora:PlatformSync"
  "micro-mockdata-service-database:MockData"
)

START=$(date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%SZ)
END=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "Fetched at: $(date -u '+%Y-%m-%d %H:%M UTC')"
printf "%-20s %8s %8s %8s %8s %8s %8s %8s %8s %8s\n" \
  "SERVICE" "ACU_MIN" "ACU_AVG" "ACU_MAX" "CPU_MIN" "CPU_AVG" "CPU_MAX" "CONN_MIN" "CONN_AVG" "CONN_MAX"
printf "%-20s %8s %8s %8s %8s %8s %8s %8s %8s %8s\n" \
  "--------------------" "--------" "--------" "--------" "--------" "--------" "--------" "--------" "--------" "--------"

get_metric() {
  AWS_PROFILE=rt-sqa aws cloudwatch get-metric-statistics \
    --namespace AWS/RDS \
    --metric-name "$2" \
    --dimensions "Name=DBClusterIdentifier,Value=${1}" \
    --start-time "$START" \
    --end-time "$END" \
    --period 900 --statistics Average Maximum Minimum \
    --output json 2>/dev/null
}

parse() {
  python3 -c "
import sys, json
data = json.load(sys.stdin)
pts = data.get('Datapoints', [])
if pts:
    pts.sort(key=lambda x: x['Timestamp'])
    p = pts[-1]
    print(round(p['Minimum'],1), round(p['Average'],1), round(p['Maximum'],1))
else:
    print('N/A N/A N/A')
" 2>/dev/null || echo "N/A N/A N/A"
}

for ENTRY in "${CLUSTERS[@]}"; do
  CLUSTER=$(echo "$ENTRY" | cut -d: -f1)
  NAME=$(echo "$ENTRY"    | cut -d: -f2)

  ACU=$(get_metric  "$CLUSTER" "ServerlessDatabaseCapacity" | parse)
  CPU=$(get_metric  "$CLUSTER" "CPUUtilization"             | parse)
  CONN=$(get_metric "$CLUSTER" "DatabaseConnections"        | parse)

  printf "%-20s %8s %8s %8s %8s %8s %8s %8s %8s %8s\n" \
    "$NAME" \
    "$(echo $ACU  | awk '{print $1}')" "$(echo $ACU  | awk '{print $2}')" "$(echo $ACU  | awk '{print $3}')" \
    "$(echo $CPU  | awk '{print $1}')" "$(echo $CPU  | awk '{print $2}')" "$(echo $CPU  | awk '{print $3}')" \
    "$(echo $CONN | awk '{print $1}')" "$(echo $CONN | awk '{print $2}')" "$(echo $CONN | awk '{print $3}')"
done
```

---

## Output Format

After collecting the raw data, render the results in two parts.

### Part 1 — Full table

Produce a markdown table sorted by ACU_AVG descending (most active first).
Columns: Service · ACU (min/avg/max) · CPU% (min/avg/max) · Conns (min/avg/max) · Status.

Status emoji rules:

| Emoji | Condition |
|---|---|
| 🚨 | ACU at configured ceiling AND CPU ≥ 90% |
| 🔴 | ACU avg ≥ 20 OR CPU avg ≥ 20% |
| 🟠 | ACU avg 8–19 OR CPU avg 10–19% |
| 🟡 | ACU avg 4–7 OR CPU avg 5–9% OR any connection anomaly |
| ✅ | Recently saturated, now recovered |
| ⚠️ | High connections with near-zero ACU/CPU (possible leak) |
| 🟢 | At or near minimum — idle |

### Part 2 — Written analysis

Always include the following sections:

**Active clusters** — list every cluster above idle, with a one-sentence explanation of what the numbers suggest.

**Connection anomalies** — flag any cluster where connections are high but ACU and CPU are low. This pattern suggests a connection pool leak or long-lived idle connections not being recycled.

**Trends vs. previous check** — if this is not the first check in the session, produce a delta table:

| Service | Avg ACU (prev → now) | CPU Avg (prev → now) | Conn Avg (prev → now) | Notes |
|---|---|---|---|---|

Use ✅ for recovering, ⬆️ for worsening, ➡️ for stable.

**Overall assessment** — one paragraph summarising the fleet state, whether a test run appears to be active, and any recommended actions.

---

## ACU Resize Procedure

To raise the max ACU on one or more clusters:

```bash
AWS_PROFILE=rt-sqa aws rds modify-db-cluster \
  --db-cluster-identifier CLUSTER_ID \
  --serverless-v2-scaling-configuration MinCapacity=MIN,MaxCapacity=NEW_MAX \
  --apply-immediately \
  --query 'DBCluster.{Status:Status,Min:ServerlessV2ScalingConfiguration.MinCapacity,Max:ServerlessV2ScalingConfiguration.MaxCapacity}' \
  --output json
```

To resize all clusters at once, loop over the `CLUSTERS` array with `cut -d: -f1` to extract the identifier, and pass each cluster's correct `MinCapacity` (4 for all except PlatformSync which is 1).

After resizing, confirm by running the health check again within 2–3 minutes. A cluster that was CPU-saturated at its ceiling should show CPU dropping and ACU climbing past the old limit within one CloudWatch period (≈5 min).

---

## Known Behaviours & Gotchas

- **Zero connections on busy clusters** is normal. Appointment, Hierarchy, Case, and most others use the **RDS Data API** exclusively. Connections are managed by the Data API proxy and are not surfaced in `DatabaseConnections`. Only clusters with direct TCP connections (via RDS Proxy or a service using a standard pg driver) show non-zero counts.

- **ClinicalNote** has both Data API consumers and a direct connection pool — it consistently shows elevated connections under load.

- **PlatformSync** uses direct connections (not Data API). Its connection count is a reliable load signal. It was originally capped at 2 ACU max, causing CPU saturation at 100% with 642 connections. Raised to 256 ACU max on 2026-05-21.

- **NewGenLogs** maintains a steady baseline of 8–32 persistent connections regardless of load — this is normal behaviour for the log aggregator service.

- **Referral and PlanOfCare** occasionally show high connection counts (100–200) with near-zero ACU and CPU. This is a recurring pattern observed during test run wind-down and likely indicates connection pools not releasing after test teardown.

- **CloudWatch metric lag**: `ServerlessDatabaseCapacity` and `CPUUtilization` have approximately 1–2 minute lag. A cluster that just scaled may still show the old value for one polling cycle.

- **The 15-minute window / 900-second period** returns at most 1 datapoint. This is intentional — it gives the most recent averaged snapshot without noise from older data. For finer granularity, reduce the period to 60 seconds and the window to 5 minutes.

---

## Source Reference

Cluster identifiers were sourced from:
```
~/git.work/331.obsidian-scripts/01.Technical/environments/schemas/new.gen/
```

Specifically:
- `new-gen-schemas-combined.md` — contains `**Cluster:**` entries for FormDocuments and NewGenLogs (PRD names)
- `platformsync-architecture-uat.txt` — references `platformsync-uat-aurora` and `platformsync-dev-aurora` (PRD/UAT names)
- All SQA cluster IDs were discovered via `aws rds describe-db-clusters` against `rt-sqa`

The SQA cluster IDs follow the pattern:
```
rt-micro-common-infra-sqa-{service}rdsrtmicrocommon{suffix}-{random}
```
