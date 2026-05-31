"""
promote_wait.py — Promote eligible WAIT rows to REQUEST.

A WAIT row is eligible when every non-null parent column holds an entity_id
that has at least one COMPLETE record in the entityid-status GSI.
COMPLETE is a terminal state, so positive results are cached in-process.

Usage:
    python3 promote_wait.py [env]   (default: sqa)
"""
import sys, boto3, time
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict

ENV           = sys.argv[1] if len(sys.argv) > 1 else "sqa"
TABLE         = f"platformsync-{ENV}-inbound-events"
STATUS_INDEX  = f"platformsync-{ENV}-inbound-status-creation-index"
ENTITYID_INDEX= f"platformsync-{ENV}-inbound-entityid-status-index"
PARENT_COLS   = [
    "parentPersonId", "parentCaseId", "parentLocationId", "parentProviderId",
    "parentAppointmentId", "parentNoteId", "parentProcedureId", "parentFclassId",
]

session = boto3.Session(profile_name=f"rt-{ENV}", region_name="us-east-1")
client  = session.client("dynamodb")

# Cache COMPLETE entity_ids — terminal state, always safe to cache
complete_cache: set = set()


def is_complete(entity_id: str) -> bool:
    if entity_id in complete_cache:
        return True
    for attempt in range(4):
        try:
            resp = client.query(
                TableName=TABLE,
                IndexName=ENTITYID_INDEX,
                KeyConditionExpression="#eid = :eid AND #s = :complete",
                ExpressionAttributeNames={"#eid": "entity_id", "#s": "status"},
                ExpressionAttributeValues={
                    ":eid": {"S": entity_id},
                    ":complete": {"S": "COMPLETE"},
                },
                Select="COUNT",
                Limit=1,
            )
            result = resp.get("Count", 0) > 0
            if result:
                complete_cache.add(entity_id)
            return result
        except Exception:
            if attempt < 3:
                time.sleep(2 ** attempt)
            else:
                return False  # fail-safe: leave in WAIT


def can_promote(item: dict) -> bool:
    parents = [item[col]["S"] for col in PARENT_COLS if col in item and item[col].get("S")]
    if not parents:
        return True
    return all(is_complete(p) for p in parents)


def promote(item: dict) -> str:
    PK  = item["PK"]["S"]
    SK  = item["SK"]["S"]
    now = datetime.now(timezone.utc).isoformat()
    for attempt in range(5):
        try:
            client.update_item(
                TableName=TABLE,
                Key={"PK": {"S": PK}, "SK": {"S": SK}},
                UpdateExpression="SET #status = :req, #updatedAt = :now",
                ConditionExpression="#status = :wait",
                ExpressionAttributeNames={
                    "#status": "status",
                    "#updatedAt": "lastUpdated",
                },
                ExpressionAttributeValues={
                    ":req":  {"S": "REQUEST"},
                    ":wait": {"S": "WAIT"},
                    ":now":  {"S": now},
                },
            )
            return "promoted"
        except client.exceptions.ConditionalCheckFailedException:
            # Row already moved to REQUEST by OOO Lambda or concurrent thread — success
            return "already_promoted"
        except Exception as e:
            if "ThrottlingException" in str(e) and attempt < 4:
                time.sleep(2 ** attempt)
            else:
                return f"error: {e}"
    return "error: max retries"


def run() -> None:
    promoted_types: defaultdict = defaultdict(int)
    skipped_types:  defaultdict = defaultdict(int)
    g_promoted, g_already, g_skipped, g_errors = 0, 0, 0, 0
    total_processed = 0

    def process(item):
        mt = item.get("message_type", {}).get("S", "UNKNOWN")
        if can_promote(item):
            return mt, promote(item)
        return mt, "skipped"

    print("Scanning WAIT rows page by page...", flush=True)

    kwargs = dict(
        TableName=TABLE,
        IndexName=STATUS_INDEX,
        KeyConditionExpression="#s = :status",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":status": {"S": "WAIT"}},
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

        page_num += 1
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = {executor.submit(process, item): item for item in page}
            for future in as_completed(futures):
                mt, result = future.result()
                if result == "promoted":
                    g_promoted += 1
                    promoted_types[mt] += 1
                elif result == "already_promoted":
                    g_already += 1
                    promoted_types[mt] += 1
                elif result == "skipped":
                    g_skipped += 1
                    skipped_types[mt] += 1
                else:
                    g_errors += 1
                    print(f"  ERROR [{mt}]: {result}", flush=True)

        total_processed += len(page)
        total_promoted   = g_promoted + g_already
        print(
            f"  Page {page_num} ({len(page)} rows) | total processed: {total_processed} — "
            f"promoted={total_promoted}, skipped={g_skipped}, errors={g_errors}",
            flush=True,
        )

        if not lek:
            break
        kwargs["ExclusiveStartKey"] = lek

    total_promoted = g_promoted + g_already
    print(f"\n=== Done ===", flush=True)
    print(f"Promoted: {total_promoted} (new={g_promoted}, race={g_already}), "
          f"skipped (deps not met): {g_skipped}, errors: {g_errors}", flush=True)

    print("\nPromoted by type:")
    for mt, c in sorted(promoted_types.items(), key=lambda x: -x[1]):
        print(f"  {mt}: {c}", flush=True)

    print("\nSkipped by type (parents not COMPLETE):")
    for mt, c in sorted(skipped_types.items(), key=lambda x: -x[1]):
        print(f"  {mt}: {c}", flush=True)


if __name__ == "__main__":
    run()
