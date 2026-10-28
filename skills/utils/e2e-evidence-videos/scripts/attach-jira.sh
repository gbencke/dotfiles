#!/usr/bin/env bash
# Attach files to a Jira issue. Prints the attachment id, name and size Jira stored.
#
# usage: attach-jira.sh <ISSUE-KEY> <file> [file ...]
# Needs JIRA_EMAIL and JIRA_TOKEN. Only attach when the user asks; it is visible to the whole team.
set -euo pipefail
[ $# -ge 2 ] || { sed -n 2,5p "$0"; exit 2; }
: "${JIRA_EMAIL:?set JIRA_EMAIL}" "${JIRA_TOKEN:?set JIRA_TOKEN}"
KEY=$1; shift
args=()
for f in "$@"; do
  [ -f "$f" ] || { echo "no such file: $f"; exit 1; }
  args+=(-F "file=@$f")
done
curl -sf -u "$JIRA_EMAIL:$JIRA_TOKEN" -H "X-Atlassian-Token: no-check" -X POST \
  "https://raintreeinc.atlassian.net/rest/api/3/issue/$KEY/attachments" "${args[@]}" |
  python3 -c "import json,sys; [print('$KEY', a['id'], a['filename'], a['size']) for a in json.load(sys.stdin)]"
