"""
reprocess_to_wait.py — Move all REPROCESS rows to WAIT.

Queries the status-creation GSI for status=REPROCESS (optionally within a
creation-date window) and conditionally updates each row's status to WAIT.
The condition (#status = :reprocess) guarantees we never clobber a row that
changed status concurrently.

Usage:
    python3 reprocess_to_wait.py [env] [--min-date YYYY-MM-DD] [--max-date YYYY-MM-DD]
    (default env: sqa)
"""
import argparse, json, boto3, time
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict


def _parse_date(value: str, end_of_day: bool = False) -> str:
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(value, fmt)
            if fmt == "%Y-%m-%d" and end_of_day:
                dt = dt.replace(hour=23, minute=59, second=59)
            return dt.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date '{value}'. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS.")


_parser = argparse.ArgumentParser(description="Move REPROCESS rows to WAIT.")
_parser.add_argument("env", nargs="?", default="sqa",
                     help="Environment: sqa | uat | dev | prod (default: sqa)")
_parser.add_argument("--min-date", metavar="YYYY-MM-DD",
                     help="Only move REPROCESS rows with creation >= this date")
_parser.add_argument("--max-date", metavar="YYYY-MM-DD",
                     help="Only move REPROCESS rows with creation <= this date")
_args = _parser.parse_args()

ENV      = _args.env
MIN_DATE = _parse_date(_args.min_date)                   if _args.min_date else None
MAX_DATE = _parse_date(_args.max_date, end_of_day=True)  if _args.max_date else None
TABLE        = f"platformsync-{ENV}-inbound-events"
STATUS_INDEX = f"platformsync-{ENV}-inbound-status-creation-index"

session = boto3.Session(profile_name=f"rt-{ENV}", region_name="us-east-1")
client  = session.client("dynamodb")


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


def move(item: dict) -> str:
    PK  = item["PK"]["S"]
    SK  = item["SK"]["S"]
    now = datetime.now(timezone.utc).isoformat()
    for attempt in range(5):
        try:
            client.update_item(
                TableName=TABLE,
                Key={"PK": {"S": PK}, "SK": {"S": SK}},
                UpdateExpression="SET #status = :wait, #updatedAt = :now",
                ConditionExpression="#status = :reprocess",
                ExpressionAttributeNames={
                    "#status": "status",
                    "#updatedAt": "lastUpdated",
                },
                ExpressionAttributeValues={
                    ":wait":      {"S": "WAIT"},
                    ":reprocess": {"S": "REPROCESS"},
                    ":now":       {"S": now},
                },
            )
            return "moved"
        except client.exceptions.ConditionalCheckFailedException:
            # Row already left REPROCESS (dispatcher/concurrent thread) — skip
            return "changed_concurrently"
        except Exception as e:
            if "ThrottlingException" in str(e) and attempt < 4:
                time.sleep(2 ** attempt)
            else:
                return f"error: {e}"
    return "error: max retries"


def run() -> None:
    moved_types: defaultdict = defaultdict(int)
    g_moved, g_concurrent, g_errors = 0, 0, 0
    total_processed = 0

    print("Scanning REPROCESS rows page by page...", flush=True)

    key_cond    = "#s = :status"
    expr_names  = {"#s": "status", "#t": "type"}
    expr_values = {":status": {"S": "REPROCESS"}, ":reqtype": {"S": "REQUEST"}}

    # Only move dispatchable rows (type=REQUEST); skip PLACEHOLDER stubs.
    filter_expr = "#t = :reqtype"

    if MIN_DATE and MAX_DATE:
        key_cond += " AND #c BETWEEN :min_date AND :max_date"
        expr_names["#c"]         = "creation"
        expr_values[":min_date"] = {"S": MIN_DATE}
        expr_values[":max_date"] = {"S": MAX_DATE}
    elif MIN_DATE:
        key_cond += " AND #c >= :min_date"
        expr_names["#c"]         = "creation"
        expr_values[":min_date"] = {"S": MIN_DATE}
    elif MAX_DATE:
        key_cond += " AND #c <= :max_date"
        expr_names["#c"]         = "creation"
        expr_values[":max_date"] = {"S": MAX_DATE}

    if MIN_DATE or MAX_DATE:
        lo = MIN_DATE or "(unbounded)"
        hi = MAX_DATE or "(unbounded)"
        print(f"Date filter: creation >= {lo}  AND  creation <= {hi}", flush=True)

    kwargs = dict(
        TableName=TABLE,
        IndexName=STATUS_INDEX,
        KeyConditionExpression=key_cond,
        FilterExpression=filter_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
        ProjectionExpression="PK, SK, message_type, payload",
    )

    page_num = 0
    while True:
        resp = client.query(**kwargs)
        page = resp.get("Items", [])
        lek  = resp.get("LastEvaluatedKey")
        if not page:
            if not lek:
                break
            kwargs["ExclusiveStartKey"] = lek
            continue

        # Only move v2 (envelope) rows
        page = [i for i in page if is_v2(i)]
        if not page:
            if not lek:
                break
            kwargs["ExclusiveStartKey"] = lek
            continue

        page_num += 1
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = {executor.submit(move, item): item for item in page}
            for future in as_completed(futures):
                item = futures[future]
                mt   = item.get("message_type", {}).get("S", "UNKNOWN")
                result = future.result()
                if result == "moved":
                    g_moved += 1
                    moved_types[mt] += 1
                elif result == "changed_concurrently":
                    g_concurrent += 1
                else:
                    g_errors += 1
                    print(f"  ERROR [{mt}]: {result}", flush=True)

        total_processed += len(page)
        print(
            f"  Page {page_num} ({len(page)} rows) | total processed: {total_processed} — "
            f"moved={g_moved}, concurrent={g_concurrent}, errors={g_errors}",
            flush=True,
        )

        if not lek:
            break
        kwargs["ExclusiveStartKey"] = lek

    print("\n=== Done ===", flush=True)
    print(f"Moved REPROCESS -> WAIT: {g_moved}, "
          f"changed concurrently: {g_concurrent}, errors: {g_errors}", flush=True)

    print("\nMoved by type:")
    for mt, c in sorted(moved_types.items(), key=lambda x: -x[1]):
        print(f"  {mt}: {c}", flush=True)


if __name__ == "__main__":
    run()
