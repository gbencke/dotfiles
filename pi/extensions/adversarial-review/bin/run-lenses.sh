#!/usr/bin/env bash
# Run every lens's propose -> challenge pairs in parallel: one background
# worker per lens, each running its own tasks one at a time, in name order.
# Called by the review-repo and review-change skills (docs/adr/0006-phase-processes.md).
#
# Usage:
#   run-lenses.sh TASKS_DIR
#
# TASKS_DIR holds one subdirectory per lens, each with *.task.json files for
# `run-phase.mjs pair`. Writes TASKS_DIR/manifest.tsv with columns
# lens, task, exit, result, log; exits 1 if any pair failed.
set -uo pipefail

usage() { sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; }

dir=${1:-}
if [ $# -ne 1 ] || [ ! -d "$dir" ]; then
  printf 'run-lenses: TASKS_DIR is required and must exist\n\n' >&2
  usage >&2
  exit 2
fi
here=$(cd "$(dirname "$0")" && pwd)
manifest=$dir/manifest.tsv
printf 'lens\ttask\texit\tresult\tlog\n' >"$manifest"

workers=0
for lens_dir in "$dir"/*/; do
  [ -d "$lens_dir" ] || continue
  lens=$(basename "$lens_dir")
  workers=$((workers + 1))
  (
    for task in "$lens_dir"*.task.json; do
      [ -e "$task" ] || continue
      log=${task%.task.json}.log
      node "$here/run-phase.mjs" pair "$task" >"$log" 2>&1
      rc=$?
      result=$(sed -n 's/^RESULT: //p' "$log" | tail -n 1)
      # Single small append: atomic enough for concurrent writers on Linux.
      printf '%s\t%s\t%s\t%s\t%s\n' "$lens" "$(basename "$task")" "$rc" "${result:-none}" "$log" >>"$manifest"
    done
  ) &
done

wait

if [ "$workers" -eq 0 ]; then
  printf 'run-lenses: no lens directories under %s\n' "$dir" >&2
  exit 2
fi
printf 'run-lenses: %d lens worker(s) done. Manifest: %s\n' "$workers" "$manifest"
awk -F '\t' 'NR > 1 && $3 != 0 { failed=1 } END { exit failed ? 1 : 0 }' "$manifest"
