import boto3
from collections import defaultdict

TABLE   = "platformsync-{env}-inbound-events"
INDEX   = "platformsync-{env}-inbound-status-creation-index"
PROFILE = "rt-{env}"
REGION  = "us-east-1"
STATUSES = ["REQUEST", "REPROCESS", "PROCESSING", "ERROR", "WAIT"]


def fetch(env: str) -> dict:
    table   = TABLE.format(env=env)
    index   = INDEX.format(env=env)
    session = boto3.Session(profile_name=PROFILE.format(env=env), region_name=REGION)
    client  = session.client("dynamodb")

    data      = {}
    all_types: set = set()

    for status in STATUSES:
        counts: dict = defaultdict(int)
        kwargs = dict(
            TableName=table,
            IndexName=index,
            KeyConditionExpression="#s = :status",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":status": {"S": status}},
            Select="SPECIFIC_ATTRIBUTES",
            ProjectionExpression="message_type",
        )
        while True:
            resp = client.query(**kwargs)
            for item in resp.get("Items", []):
                mt = item.get("message_type", {}).get("S", "UNKNOWN")
                counts[mt] += 1
                all_types.add(mt)
            lek = resp.get("LastEvaluatedKey")
            if not lek:
                break
            kwargs["ExclusiveStartKey"] = lek
        data[status] = counts

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
    import sys
    env = sys.argv[1] if len(sys.argv) > 1 else "sqa"
    result = fetch(env)
    render(result["data"], result["all_types"])
