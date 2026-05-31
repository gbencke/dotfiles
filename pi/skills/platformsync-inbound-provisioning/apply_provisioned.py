#!/usr/bin/env python3
"""
Switch platformsync-{env}-inbound-events to PROVISIONED billing mode.

Usage:
    python3 apply_provisioned.py [env] [--yes] [--dry-run]

    env       sqa (default) | uat | dev | prod
    --yes     skip confirmation prompt
    --dry-run print plan only, make no AWS calls
"""

import sys
import json
import time
import subprocess
import argparse

# ---------------------------------------------------------------------------
# Capacity plan — peak observed + 30 % safety buffer, rounded up
# Source: SQA load test 2026-05-29/30
# Updated 2026-05-31: table WCU raised 3500→15000; three low-WCU GSIs raised
# 100→3500 after bulk-delete throttling exposed them as bottlenecks.
# ---------------------------------------------------------------------------
TABLE_WCU = 15000
TABLE_RCU = 1000

GSI_PLAN = {
    "status-creation-index":          {"wcu": 6000, "rcu": 1000},
    "pk-status-index":                {"wcu": 6000, "rcu":  500},
    "entityid-status-index":          {"wcu": 6000, "rcu":  500},
    "parentpersonid-status-index":    {"wcu": 6000, "rcu":  500},
    "parentcaseid-status-index":      {"wcu": 5500, "rcu":  500},
    "parentlocationid-status-index":  {"wcu": 4500, "rcu":  500},
    "parentproviderid-status-index":  {"wcu": 4500, "rcu":  500},
    "parentappointmentid-status-index":{"wcu": 4500, "rcu": 500},
    "messageid-index":                {"wcu": 3500, "rcu":  500},
    "creation-index":                 {"wcu": 3500, "rcu":  500},
    "parentnoteid-status-index":      {"wcu": 3500, "rcu":  100},
    "parentprocedureid-status-index": {"wcu": 3500, "rcu":  100},
    "parentfclassid-status-index":    {"wcu": 3500, "rcu":  100},
}

POLL_INTERVAL = 10   # seconds between describe-table calls
MAX_POLLS     = 60   # 10 min max wait


def aws(profile, args):
    cmd = ["aws", "--profile", profile, "--region", "us-east-1"] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"AWS error:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)
    return json.loads(result.stdout) if result.stdout.strip() else {}


def describe_table(profile, table):
    return aws(profile, ["dynamodb", "describe-table", "--table-name", table])["Table"]


def gsi_full_name(env, suffix):
    return f"platformsync-{env}-inbound-{suffix}"


def print_plan(env, table, current):
    billing = current.get("BillingModeSummary", {}).get("BillingMode", "PROVISIONED")
    pt      = current.get("ProvisionedThroughput", {})
    cur_wcu = pt.get("WriteCapacityUnits", 0)
    cur_rcu = pt.get("ReadCapacityUnits", 0)

    print(f"\nEnvironment : {env}")
    print(f"Table       : {table}")
    print(f"Current mode: {billing}\n")
    print("Planned changes")
    print(f"  Table  WCU {cur_wcu} → {TABLE_WCU}   RCU {cur_rcu} → {TABLE_RCU}")

    gsi_map = {g["IndexName"]: g for g in current.get("GlobalSecondaryIndexes", [])}
    for suffix, cap in GSI_PLAN.items():
        full = gsi_full_name(env, suffix)
        gsi  = gsi_map.get(full, {})
        gpt  = gsi.get("ProvisionedThroughput", {})
        cw   = gpt.get("WriteCapacityUnits", 0)
        cr   = gpt.get("ReadCapacityUnits", 0)
        print(f"  GSI {suffix:<40} WCU {cw} → {cap['wcu']}  RCU {cr} → {cap['rcu']}")
    print()


def wait_for_active(profile, table):
    for attempt in range(1, MAX_POLLS + 1):
        print(f"  Waiting for ACTIVE (attempt {attempt}/{MAX_POLLS})...", end="\r")
        desc = describe_table(profile, table)
        table_status = desc.get("TableStatus", "")
        gsi_statuses = [g.get("IndexStatus", "") for g in desc.get("GlobalSecondaryIndexes", [])]
        if table_status == "ACTIVE" and all(s == "ACTIVE" for s in gsi_statuses):
            print()
            return desc
        time.sleep(POLL_INTERVAL)
    print()
    print("Timed out waiting for ACTIVE.", file=sys.stderr)
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("env",       nargs="?", default="sqa")
    parser.add_argument("--yes",     action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    env     = args.env
    profile = f"rt-{env}"
    table   = f"platformsync-{env}-inbound-events"

    # Describe current state
    current = describe_table(profile, table)
    billing = current.get("BillingModeSummary", {}).get("BillingMode", "PROVISIONED")

    if billing == "PROVISIONED":
        print(f"Table is already PROVISIONED. Nothing to do.")
        print("Run revert_to_ondemand.py first if you want to reset capacity.")
        sys.exit(0)

    print_plan(env, table, current)

    if args.dry_run:
        print("Dry-run mode — no changes made.")
        return

    # Extra warning for prod
    if env == "prod":
        print("⚠️  WARNING: You are about to modify a PRODUCTION table.")
        confirm = input("Type 'yes-prod' to continue: ").strip()
        if confirm != "yes-prod":
            print("Aborted.")
            sys.exit(0)

    if not args.yes:
        confirm = input("Proceed? [y/N]: ").strip().lower()
        if confirm not in ("y", "yes"):
            print("Aborted.")
            sys.exit(0)

    # Build GSI update list
    gsi_updates = []
    for suffix, cap in GSI_PLAN.items():
        gsi_updates.append({
            "Update": {
                "IndexName": gsi_full_name(env, suffix),
                "ProvisionedThroughput": {
                    "ReadCapacityUnits":  cap["rcu"],
                    "WriteCapacityUnits": cap["wcu"],
                },
            }
        })

    print("Applying...")
    aws(profile, [
        "dynamodb", "update-table",
        "--table-name", table,
        "--billing-mode", "PROVISIONED",
        "--provisioned-throughput",
            f"ReadCapacityUnits={TABLE_RCU},WriteCapacityUnits={TABLE_WCU}",
        "--global-secondary-index-updates", json.dumps(gsi_updates),
    ])

    final = wait_for_active(profile, table)
    final_billing = final.get("BillingModeSummary", {}).get("BillingMode", "PROVISIONED")
    final_pt      = final.get("ProvisionedThroughput", {})

    print(f"\nDone.")
    print(f"  Billing mode : {final_billing}")
    print(f"  Table WCU    : {final_pt.get('WriteCapacityUnits')}")
    print(f"  Table RCU    : {final_pt.get('ReadCapacityUnits')}")
    print("\nGSI final state:")
    for g in final.get("GlobalSecondaryIndexes", []):
        name = g["IndexName"].replace(f"platformsync-{env}-inbound-", "")
        gpt  = g.get("ProvisionedThroughput", {})
        print(f"  {name:<42} WCU={gpt.get('WriteCapacityUnits')}  RCU={gpt.get('ReadCapacityUnits')}  status={g.get('IndexStatus')}")


if __name__ == "__main__":
    main()
