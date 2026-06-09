import sys
import json
import argparse
from datetime import datetime, timezone
import boto3
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed


def is_v2(item: dict) -> bool:
    """v2 messages carry a top-level 'envelope' key inside the payload JSON."""
    raw = item.get("payload", {}).get("S")
    if not raw:
        return False
    try:
        doc = json.loads(raw)
    except (ValueError, TypeError):
        return False
    return isinstance(doc, dict) and "envelope" in doc

TABLE    = "platformsync-{env}-inbound-events"
INDEX    = "platformsync-{env}-inbound-status-creation-index"
PROFILE  = "rt-{env}"
REGION   = "us-east-1"
STATUSES = ["REQUEST", "REPROCESS", "PROCESSING", "ERROR", "WAIT"]


def _parse_date(value: str, end_of_day: bool = False) -> str:
    """Accept YYYY-MM-DD or full ISO-8601; return UTC ISO-8601 string."""
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(value, fmt)
            if fmt == "%Y-%m-%d" and end_of_day:
                dt = dt.replace(hour=23, minute=59, second=59)
            return dt.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date '{value}'. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS.")


# Query a single status partition on the GSI, paging through all results.
# Each thread gets its own boto3 client to avoid shared-state issues.
def _fetch_status(
    table: str,
    index: str,
    profile: str,
    status: str,
    min_date: str | None,
    max_date: str | None,
) -> tuple[str, dict]:
    session = boto3.Session(profile_name=profile, region_name=REGION)
    client  = session.client("dynamodb")
    counts: dict = defaultdict(int)

    key_cond   = "#s = :status"
    expr_names  = {"#s": "status", "#t": "type"}
    expr_values = {":status": {"S": status}, ":reqtype": {"S": "REQUEST"}}

    # Count only dispatchable rows (type=REQUEST); exclude PLACEHOLDER stubs
    # created by the out-of-order ingestion mechanism, which the dispatcher
    # never enqueues.
    filter_expr = "#t = :reqtype"

    if min_date and max_date:
        key_cond += " AND #c BETWEEN :min_date AND :max_date"
        expr_names["#c"]          = "creation"
        expr_values[":min_date"]  = {"S": min_date}
        expr_values[":max_date"]  = {"S": max_date}
    elif min_date:
        key_cond += " AND #c >= :min_date"
        expr_names["#c"]         = "creation"
        expr_values[":min_date"] = {"S": min_date}
    elif max_date:
        key_cond += " AND #c <= :max_date"
        expr_names["#c"]         = "creation"
        expr_values[":max_date"] = {"S": max_date}

    kwargs = dict(
        TableName=table,
        IndexName=index,
        KeyConditionExpression=key_cond,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
        FilterExpression=filter_expr,
        Select="SPECIFIC_ATTRIBUTES",
        ProjectionExpression="message_type, payload",
    )
    while True:
        resp = client.query(**kwargs)
        for item in resp.get("Items", []):
            if not is_v2(item):
                continue
            mt = item.get("message_type", {}).get("S", "UNKNOWN")
            counts[mt] += 1
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            break
        kwargs["ExclusiveStartKey"] = lek
    return status, counts


# Fan out one thread per status so all five GSI partitions are queried in parallel.
def fetch(env: str, min_date: str | None = None, max_date: str | None = None) -> dict:
    table   = TABLE.format(env=env)
    index   = INDEX.format(env=env)
    profile = PROFILE.format(env=env)

    data: dict      = {}
    all_types: set  = set()

    with ThreadPoolExecutor(max_workers=len(STATUSES)) as pool:
        futures = {
            pool.submit(_fetch_status, table, index, profile, s, min_date, max_date): s
            for s in STATUSES
        }
        for future in as_completed(futures):
            status, counts = future.result()
            data[status] = counts
            all_types.update(counts.keys())

    return {"data": data, "all_types": all_types}


def render(data: dict, all_types: set) -> None:
    sorted_types = sorted(all_types, key=lambda t: -sum(data[s][t] for s in data))

    print("message_type," + ",".join(STATUSES) + ",TOTAL")
    for mt in sorted_types:
        row_total = sum(data[s][mt] for s in STATUSES)
        vals = ",".join(str(data[s][mt]) for s in STATUSES)
        print(f"{mt},{vals},{row_total}")

    totals = ",".join(str(sum(data[s].values())) for s in STATUSES)
    grand  = sum(sum(data[s].values()) for s in STATUSES)
    print(f"TOTAL,{totals},{grand}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Count inbound-events rows by status and message_type."
    )
    parser.add_argument("env", nargs="?", default="sqa",
                        help="Environment: sqa | uat | dev | prod (default: sqa)")
    parser.add_argument("--min-date", metavar="YYYY-MM-DD",
                        help="Earliest creation date to include (inclusive)")
    parser.add_argument("--max-date", metavar="YYYY-MM-DD",
                        help="Latest creation date to include (inclusive)")
    args = parser.parse_args()

    min_date = _parse_date(args.min_date)            if args.min_date else None
    max_date = _parse_date(args.max_date, end_of_day=True) if args.max_date else None

    result = fetch(args.env, min_date=min_date, max_date=max_date)
    render(result["data"], result["all_types"])
