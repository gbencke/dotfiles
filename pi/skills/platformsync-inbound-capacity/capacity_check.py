"""
Checks ConsumedRCU/WCU vs ProvisionedRCU/WCU for the
platformsync-{env}-inbound-events table and all its GSIs.
Also reports ReadThrottleEvents and WriteThrottleEvents.

Usage:
    python3 capacity_check.py [env] [--minutes N]

    env       sqa (default) | uat | dev | prod
    --minutes lookback window in minutes (default: 5)

Output: CSV to stdout
    name, prov_rcu, avg_rcu, rcu_pct, read_throttles,
          prov_wcu, avg_wcu, wcu_pct, write_throttles
"""
import argparse
import boto3
from datetime import datetime, timezone, timedelta

TABLE_TPL   = "platformsync-{env}-inbound-events"
PROFILE_TPL = "rt-{env}"
REGION      = "us-east-1"

METRICS = [
    "ConsumedReadCapacityUnits",
    "ConsumedWriteCapacityUnits",
    "ReadThrottleEvents",
    "WriteThrottleEvents",
]


def get_metric(cw, table, gsi, metric, period_secs, start, end):
    dims = [{"Name": "TableName", "Value": table}]
    if gsi:
        dims.append({"Name": "GlobalSecondaryIndexName", "Value": gsi})

    stat = "Sum"
    resp = cw.get_metric_statistics(
        Namespace="AWS/DynamoDB",
        MetricName=metric,
        Dimensions=dims,
        StartTime=start,
        EndTime=end,
        Period=period_secs,
        Statistics=[stat],
    )
    points = resp.get("Datapoints", [])
    if not points:
        return 0.0
    total = sum(p[stat] for p in points)
    # Consumed CU: sum over window / seconds = avg CU/s (= avg utilisation)
    if metric.startswith("Consumed"):
        return total / period_secs
    # Throttle counts: just the raw sum over the window
    return total


def fetch(env: str, minutes: int):
    table   = TABLE_TPL.format(env=env)
    session = boto3.Session(profile_name=PROFILE_TPL.format(env=env), region_name=REGION)
    ddb     = session.client("dynamodb")
    cw      = session.client("cloudwatch")

    # --- provisioned capacity ---
    desc      = ddb.describe_table(TableName=table)["Table"]
    prov      = desc["ProvisionedThroughput"]
    table_rcu = prov["ReadCapacityUnits"]
    table_wcu = prov["WriteCapacityUnits"]

    gsi_prov = {}
    for gsi in desc.get("GlobalSecondaryIndexes", []):
        name         = gsi["IndexName"]
        gp           = gsi["ProvisionedThroughput"]
        gsi_prov[name] = {
            "rcu": gp["ReadCapacityUnits"],
            "wcu": gp["WriteCapacityUnits"],
        }

    # --- cloudwatch window ---
    period_secs = minutes * 60
    end   = datetime.now(timezone.utc)
    start = end - timedelta(minutes=minutes)

    def metrics_for(gsi_name):
        result = {}
        for m in METRICS:
            result[m] = get_metric(cw, table, gsi_name, m, period_secs, start, end)
        return result

    # --- collect ---
    rows = []

    # Table row
    m = metrics_for(None)
    rows.append({
        "name":           "(table)",
        "prov_rcu":       table_rcu,
        "avg_rcu":        m["ConsumedReadCapacityUnits"],
        "read_throttles": m["ReadThrottleEvents"],
        "prov_wcu":       table_wcu,
        "avg_wcu":        m["ConsumedWriteCapacityUnits"],
        "write_throttles":m["WriteThrottleEvents"],
    })

    # GSI rows
    for gsi_name, gp in sorted(gsi_prov.items()):
        m = metrics_for(gsi_name)
        rows.append({
            "name":           gsi_name,
            "prov_rcu":       gp["rcu"],
            "avg_rcu":        m["ConsumedReadCapacityUnits"],
            "read_throttles": m["ReadThrottleEvents"],
            "prov_wcu":       gp["wcu"],
            "avg_wcu":        m["ConsumedWriteCapacityUnits"],
            "write_throttles":m["WriteThrottleEvents"],
        })

    return rows


def render(rows, minutes):
    header = (
        "name,"
        "prov_rcu,avg_rcu,rcu_pct,read_throttles,"
        "prov_wcu,avg_wcu,wcu_pct,write_throttles"
    )
    print(f"# window={minutes}m")
    print(header)
    for r in rows:
        rcu_pct = (r["avg_rcu"] / r["prov_rcu"] * 100) if r["prov_rcu"] else 0.0
        wcu_pct = (r["avg_wcu"] / r["prov_wcu"] * 100) if r["prov_wcu"] else 0.0
        print(
            f"{r['name']},"
            f"{r['prov_rcu']},{r['avg_rcu']:.1f},{rcu_pct:.1f},{int(r['read_throttles'])},"
            f"{r['prov_wcu']},{r['avg_wcu']:.1f},{wcu_pct:.1f},{int(r['write_throttles'])}"
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("env", nargs="?", default="sqa")
    parser.add_argument("--minutes", type=int, default=5)
    args = parser.parse_args()

    rows = fetch(args.env, args.minutes)
    render(rows, args.minutes)
