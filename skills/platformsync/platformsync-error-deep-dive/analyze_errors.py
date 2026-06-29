"""Deep-dive analysis of ERROR rows in platformsync-{env}-inbound-events for one tenant.

Queries the status-creation GSI for status=ERROR within a creation window,
filters by tenant PK prefix, then groups by message_type + normalised error
message and ranks payorCode values referenced in patientInsurance failures.

Usage:
  AWS_PROFILE=rt-prod python3 analyze_errors.py prod \
      --tenant 6e52f420-6cbb-4b30-aa06-b8d63bd1fa02 \
      --min-date 2026-06-26T00:00:00 [--max-date ...]

Prints a JSON report to stdout.
"""
import sys, json, re, argparse
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import boto3

TABLE  = "platformsync-{env}-inbound-events"
INDEX  = "platformsync-{env}-inbound-status-creation-index"
REGION = "us-east-1"


def norm(msg: str) -> str:
    """Collapse per-row identifiers so equivalent errors group together."""
    if not msg:
        return "(empty)"
    m = msg
    m = re.sub(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b", "<UUID>", m)
    m = re.sub(r"s3://\S+", "<S3URI>", m)
    m = re.sub(r"payorCode:\s*\S+", "payorCode: <CODE>", m)
    m = re.sub(r"externalPersonId:\s*\S+", "externalPersonId: <ID>", m)
    m = re.sub(r"externalId:\s*\S+", "externalId: <ID>", m)
    m = re.sub(r"visitNoteId\s+\S+", "visitNoteId <ID>", m)
    m = re.sub(r"tenantId:\s*[^)\s]+", "tenantId: <T>", m)
    m = re.sub(r"\b[A-Z0-9]{10,}\b", "<ID>", m)   # base32 entity ids
    m = re.sub(r"\bsegment\[\d+\]", "segment[n]", m)
    m = re.sub(r"\b\d{4,}\b", "<N>", m)
    return m.strip()


PAYOR_RE = re.compile(r"payorCode:\s*([A-Za-z0-9]+)")
CLOSE_RE = re.compile(r"visitCloseTime:\s*(\d{4}-\d{2})")  # year-month only


def fetch_window(env, profile, tenant, min_d, max_d):
    sess = boto3.Session(profile_name=profile, region_name=REGION)
    cli  = sess.client("dynamodb")
    kc = "#s = :st AND #c BETWEEN :mn AND :mx"
    kwargs = dict(
        TableName=TABLE.format(env=env),
        IndexName=INDEX.format(env=env),
        KeyConditionExpression=kc,
        FilterExpression="begins_with(#pk, :t)",
        ExpressionAttributeNames={"#s": "status", "#c": "creation", "#pk": "PK"},
        ExpressionAttributeValues={
            ":st": {"S": "ERROR"}, ":mn": {"S": min_d}, ":mx": {"S": max_d},
            ":t":  {"S": tenant},
        },
        Select="SPECIFIC_ATTRIBUTES",
        ProjectionExpression="message_type, errorMessage, message_version, payload",
    )
    rows = []
    while True:
        resp = cli.query(**kwargs)
        for it in resp.get("Items", []):
            rows.append((
                it.get("message_type", {}).get("S", "UNKNOWN"),
                it.get("errorMessage", {}).get("S", ""),
                it.get("payload", {}).get("S", ""),
            ))
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            break
        kwargs["ExclusiveStartKey"] = lek
    return rows


def windows(start, end, minutes):
    out, cur = [], start
    while cur < end:
        nxt = min(cur + timedelta(minutes=minutes), end)
        out.append((cur, nxt))
        cur = nxt
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("env", default="prod", nargs="?")
    ap.add_argument("--tenant", required=True)
    ap.add_argument("--min-date", required=True)
    ap.add_argument("--max-date")
    ap.add_argument("--profile")
    ap.add_argument("--chunk-minutes", type=int, default=15)
    a = ap.parse_args()

    profile = a.profile or f"rt-{a.env}"
    fmt = "%Y-%m-%dT%H:%M:%S"

    def parse(v, eod=False):
        try:
            return datetime.strptime(v, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            d = datetime.strptime(v, "%Y-%m-%d")
            if eod:
                d = d.replace(hour=23, minute=59, second=59)
            return d.replace(tzinfo=timezone.utc)

    mn = parse(a.min_date)
    mx = parse(a.max_date, eod=True) if a.max_date else datetime.now(timezone.utc)

    wins = windows(mn, mx, a.chunk_minutes)
    print(f"Querying {len(wins)} windows for tenant {a.tenant[:8]}...", file=sys.stderr)

    all_rows = []
    with ThreadPoolExecutor(max_workers=min(len(wins), 32)) as pool:
        futs = [pool.submit(fetch_window, a.env, profile, a.tenant,
                            w0.strftime(fmt), w1.strftime(fmt)) for w0, w1 in wins]
        for i, f in enumerate(as_completed(futs)):
            all_rows.extend(f.result())
            print(f"  {i+1}/{len(wins)} done, rows so far={len(all_rows)}", file=sys.stderr)

    by_type   = defaultdict(int)
    by_group  = defaultdict(int)   # (type, norm_err) -> count
    payor_codes = defaultdict(int)
    close_months = defaultdict(int)

    for mt, err, payload in all_rows:
        by_type[mt] += 1
        by_group[(mt, norm(err))] += 1
        m = PAYOR_RE.search(err)
        if m:
            payor_codes[m.group(1)] += 1
        c = CLOSE_RE.search(err)
        if c:
            close_months[c.group(1)] += 1

    groups = [
        {"message_type": mt, "error": err, "count": n}
        for (mt, err), n in sorted(by_group.items(), key=lambda x: -x[1])
    ]
    report = {
        "total": len(all_rows),
        "window": {"min": mn.strftime(fmt), "max": mx.strftime(fmt)},
        "tenant": a.tenant,
        "env": a.env,
        "by_type": dict(sorted(by_type.items(), key=lambda x: -x[1])),
        "groups": groups,
        "payor_codes": dict(sorted(payor_codes.items(), key=lambda x: -x[1])),
        "visitplan_close_months": dict(sorted(close_months.items())),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
