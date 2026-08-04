#!/usr/bin/env bash
# Self-check for run-matrix.sh. Uses --dry-run, so no pi process is started.
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
matrix=$here/run-matrix.sh
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
fail=0
check() { if [ "$2" = "$3" ]; then echo "ok   - $1"; else echo "FAIL - $1: expected [$3], got [$2]"; fail=1; fi; }

mkdir -p "$tmp/repo-a" "$tmp/repo-b"

# Missing args are hard errors, not silent defaults.
"$matrix" --log-dir "$tmp/l0" >/dev/null 2>&1; check "no repo -> exit 2" "$?" "2"
"$matrix" "$tmp/repo-a" >/dev/null 2>&1;       check "no --log-dir -> exit 2" "$?" "2"

# Fan-out is repos x lenses, one manifest row each (plus header).
"$matrix" --dry-run --log-dir "$tmp/l1" --lenses design,security "$tmp/repo-a" "$tmp/repo-b" >/dev/null
check "2 repos x 2 lenses -> 4 rows" "$(($(wc -l <"$tmp/l1/manifest.tsv") - 1))" "4"
check "lens column" "$(cut -f2 "$tmp/l1/manifest.tsv" | tail -n +2 | sort -u | tr '\n' ',')" "design,security,"

# Default lens set = every lens dir minus the change-only ones.
"$matrix" --dry-run --log-dir "$tmp/l2" "$tmp/repo-a" >/dev/null
expected=$(find "$here/../lenses" -mindepth 1 -maxdepth 1 -type d \
  ! -name test-surface ! -name blast-radius | wc -l)
check "default lenses exclude change-only" "$(($(wc -l <"$tmp/l2/manifest.tsv") - 1))" "$expected"

# Runner is validated and reaches the command line.
"$matrix" --dry-run --log-dir "$tmp/l4" --lenses design --runner nope "$tmp/repo-a" >/dev/null 2>&1
check "bad --runner -> exit 2" "$?" "2"
out=$("$matrix" --dry-run --log-dir "$tmp/l5" --lenses design --runner claude "$tmp/repo-a")
check "runner in dry-run output" "$(printf '%s' "$out" | grep -c '^DRY-RUN claude -p')" "1"

# A bad repo path is recorded, not fatal for the rest.
"$matrix" --dry-run --log-dir "$tmp/l3" --lenses design "$tmp/nope" "$tmp/repo-a" >/dev/null 2>&1
check "missing repo recorded" "$(grep -c 'nope' "$tmp/l3/manifest.tsv")" "1"
check "good repo still ran" "$(grep -c 'repo-a' "$tmp/l3/manifest.tsv")" "1"

exit $fail
