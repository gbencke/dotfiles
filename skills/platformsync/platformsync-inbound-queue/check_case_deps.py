"""
check_case_deps.py — Read-only dependency check for WAIT rows of a given type.

For every WAIT row of the target message_type, inspect its parent columns and
query the entityid-status GSI to determine whether each non-null parent has a
COMPLETE record. Reports, per row, whether it is promotable and which parents
are still blocking. Mutates nothing.

Usage:
    python3 check_case_deps.py [env] [--type case] [--min-date ...] [--max-date ...]
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
    raise ValueError(f"Cannot parse date '{value}'.")


_parser = argparse.ArgumentParser(description="Check WAIT-row parent dependencies (read-only).")
_parser.add_argument("env", nargs="?", default="sqa")
_parser.add_argument("--type", default="case",
                     help="message_type to inspect, or 'all' for every type (default: case)")
_parser.add_argument("--min-date", metavar="YYYY-MM-DD")
_parser.add_argument("--max-date", metavar="YYYY-MM-DD")
_args = _parser.parse_args()

ENV       = _args.env
TARGET    = None if _args.type.lower() == "all" else _args.type
MIN_DATE  = _parse_date(_args.min_date)                   if _args.min_date else None
MAX_DATE  = _parse_date(_args.max_date, end_of_day=True)  if _args.max_date else None
TABLE          = f"platformsync-{ENV}-inbound-events"
STATUS_INDEX   = f"platformsync-{ENV}-inbound-status-creation-index"
ENTITYID_INDEX = f"platformsync-{ENV}-inbound-entityid-status-index"
PARENT_COLS    = [
    "parentPersonId", "parentCaseId", "parentLocationId", "parentProviderId",
    "parentAppointmentId", "parentNoteId", "parentProcedureId", "parentFclassId",
]

session = boto3.Session(profile_name=f"rt-{ENV}", region_name="us-east-1")
client  = session.client("dynamodb")

complete_cache: set = set()


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


def status_of(entity_id: str) -> str:
    """Return 'COMPLETE' if any record for entity_id is COMPLETE, else best-known status list."""
    if entity_id in complete_cache:
        return "COMPLETE"
    for attempt in range(4):
        try:
            resp = client.query(
                TableName=TABLE,
                IndexName=ENTITYID_INDEX,
                KeyConditionExpression="#eid = :eid",
                ExpressionAttributeNames={"#eid": "entity_id", "#s": "status"},
                ExpressionAttributeValues={":eid": {"S": entity_id}},
                ProjectionExpression="#s",
            )
            statuses = [i["status"]["S"] for i in resp.get("Items", []) if "status" in i]
            if "COMPLETE" in statuses:
                complete_cache.add(entity_id)
                return "COMPLETE"
            if not statuses:
                return "NOT_FOUND"
            return "/".join(sorted(set(statuses)))
        except Exception as e:
            if attempt < 3:
                time.sleep(2 ** attempt)
            else:
                return f"ERROR:{e}"


def collect_wait_rows() -> list:
    key_cond    = "#s = :status"
    expr_names  = {"#s": "status"}
    expr_values = {":status": {"S": "WAIT"}}
    if MIN_DATE and MAX_DATE:
        key_cond += " AND #c BETWEEN :min_date AND :max_date"
        expr_names["#c"] = "creation"
        expr_values[":min_date"] = {"S": MIN_DATE}
        expr_values[":max_date"] = {"S": MAX_DATE}
    elif MIN_DATE:
        key_cond += " AND #c >= :min_date"
        expr_names["#c"] = "creation"
        expr_values[":min_date"] = {"S": MIN_DATE}
    elif MAX_DATE:
        key_cond += " AND #c <= :max_date"
        expr_names["#c"] = "creation"
        expr_values[":max_date"] = {"S": MAX_DATE}

    proj_names = dict(expr_names)
    proj_names["#mt"] = "message_type"
    proj_names["#t"]  = "type"
    # Only inspect dispatchable rows (type=REQUEST); skip PLACEHOLDER stubs.
    expr_values[":reqtype"] = {"S": "REQUEST"}
    kwargs = dict(
        TableName=TABLE, IndexName=STATUS_INDEX,
        KeyConditionExpression=key_cond,
        FilterExpression="#t = :reqtype",
        ExpressionAttributeNames=proj_names,
        ExpressionAttributeValues=expr_values,
        ProjectionExpression="PK, SK, #mt, payload, " + ", ".join(PARENT_COLS),
    )
    rows = []
    while True:
        resp = client.query(**kwargs)
        for it in resp.get("Items", []):
            if not is_v2(it):
                continue
            if TARGET is None or it.get("message_type", {}).get("S") == TARGET:
                rows.append(it)
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            break
        kwargs["ExclusiveStartKey"] = lek
    return rows


def analyse(item: dict) -> dict:
    pk = item["PK"]["S"]
    mt = item.get("message_type", {}).get("S", "UNKNOWN")
    parents = {col: item[col]["S"] for col in PARENT_COLS if col in item and item[col].get("S")}
    if not parents:
        return {"pk": pk, "mt": mt, "promotable": True, "no_parents": True, "blockers": {}, "parents": {}}
    results = {col: status_of(eid) for col, eid in parents.items()}
    blockers = {col: st for col, st in results.items() if st != "COMPLETE"}
    return {
        "pk": pk,
        "mt": mt,
        "promotable": len(blockers) == 0,
        "no_parents": False,
        "blockers": blockers,
        "parents": {col: (parents[col], results[col]) for col in parents},
    }


def run():
    label = TARGET if TARGET else "all types"
    print(f"Collecting WAIT '{label}' rows...", flush=True)
    rows = collect_wait_rows()
    print(f"Found {len(rows)} WAIT '{label}' rows — checking parent dependencies...\n", flush=True)

    analysed = []
    with ThreadPoolExecutor(max_workers=20) as ex:
        futures = [ex.submit(analyse, it) for it in rows]
        for f in as_completed(futures):
            analysed.append(f.result())

    promotable    = [a for a in analysed if a["promotable"]]
    no_parents    = [a for a in promotable if a["no_parents"]]
    blocked       = [a for a in analysed if not a["promotable"]]

    # Aggregate blocker reasons
    blocker_agg = defaultdict(int)
    for a in blocked:
        for col, st in a["blockers"].items():
            blocker_agg[f"{col} -> {st}"] += 1

    print("=== Summary ===", flush=True)
    print(f"Total WAIT '{label}' rows: {len(analysed)}")
    print(f"  Promotable now: {len(promotable)}  (of which {len(no_parents)} have no parent columns)")
    print(f"  Blocked:        {len(blocked)}\n")

    # Per-type promotable vs blocked breakdown
    per_type: defaultdict = defaultdict(lambda: [0, 0])  # mt -> [promotable, blocked]
    for a in analysed:
        per_type[a["mt"]][0 if a["promotable"] else 1] += 1
    print("By message_type (promotable / blocked):")
    for mt, (ok, bad) in sorted(per_type.items(), key=lambda x: -(x[1][0] + x[1][1])):
        print(f"  {mt}: {ok} promotable, {bad} blocked")
    print()

    if blocker_agg:
        print("Blocker breakdown (parent column -> parent status : count):")
        for reason, cnt in sorted(blocker_agg.items(), key=lambda x: -x[1]):
            print(f"  {reason}: {cnt}")
        print()

    # Show a few concrete blocked examples
    if blocked:
        print("Sample blocked rows (up to 10):")
        for a in blocked[:10]:
            print(f"  PK={a['pk']}")
            for col, (eid, st) in a["parents"].items():
                flag = "OK" if st == "COMPLETE" else "BLOCK"
                print(f"      [{flag}] {col}={eid} -> {st}")
        print()

    if promotable and not no_parents:
        print("Sample promotable rows with all-COMPLETE parents (up to 5):")
        shown = 0
        for a in promotable:
            if a["no_parents"]:
                continue
            print(f"  PK={a['pk']}")
            for col, (eid, st) in a["parents"].items():
                print(f"      [OK] {col}={eid} -> {st}")
            shown += 1
            if shown >= 5:
                break


if __name__ == "__main__":
    run()
