#!/usr/bin/env python3
"""
Revert platformsync-{env}-inbound-events to PAY_PER_REQUEST (on-demand) billing.

Usage:
    python3 revert_to_ondemand.py [env] [--yes] [--dry-run]

    env       sqa (default) | uat | dev | prod
    --yes     skip confirmation prompt
    --dry-run print plan only, make no AWS calls
"""

import sys
import json
import time
import subprocess
import argparse

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


def print_plan(env, table, current):
    billing = current.get("BillingModeSummary", {}).get("BillingMode", "PROVISIONED")
    pt      = current.get("ProvisionedThroughput", {})
    cur_wcu = pt.get("WriteCapacityUnits", 0)
    cur_rcu = pt.get("ReadCapacityUnits", 0)

    print(f"\nEnvironment : {env}")
    print(f"Table       : {table}")
    print(f"Current mode: {billing}  (WCU={cur_wcu}, RCU={cur_rcu})\n")
    print("Planned change: PROVISIONED → PAY_PER_REQUEST")
    print("  DynamoDB will manage GSI capacity automatically in on-demand mode.")
    print("  No GSI throughput values need to be specified.\n")


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

    if billing == "PAY_PER_REQUEST":
        print(f"Table is already PAY_PER_REQUEST. Nothing to revert.")
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

    print("Reverting...")
    aws(profile, [
        "dynamodb", "update-table",
        "--table-name", table,
        "--billing-mode", "PAY_PER_REQUEST",
    ])

    final = wait_for_active(profile, table)
    final_billing = final.get("BillingModeSummary", {}).get("BillingMode", "PAY_PER_REQUEST")

    print(f"\nDone.")
    print(f"  Billing mode : {final_billing}")
    print("\nNote: GSI capacities are now managed automatically by DynamoDB.")


if __name__ == "__main__":
    main()
