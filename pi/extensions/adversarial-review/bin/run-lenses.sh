#!/usr/bin/env bash
# Run every lens's propose -> challenge pairs from one shared pool: as many
# slots as there are lenses, and a free slot takes the next task whatever its
# lens, so fast lenses do not leave slots idle while a slow lens works through
# its chunks. Tasks start in chunk order, round-robin across lenses.
# Called by the review-repo and review-change skills (docs/adr/0006-phase-processes.md).
#
# Usage:
#   run-lenses.sh TASKS_DIR
#
# TASKS_DIR holds one subdirectory per lens, each with *.task.json files for
# `run-phase.mjs pair`. Writes TASKS_DIR/manifest.tsv with columns
# lens, task, exit, result, log (rows in completion order); exits 1 if any pair failed.
set -uo pipefail

usage() { sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; }

dir=${1:-}
if [ $# -ne 1 ] || [ ! -d "$dir" ]; then
  printf 'run-lenses: TASKS_DIR is required and must exist\n\n' >&2
  usage >&2
  exit 2
fi
here=$(cd "$(dirname "$0")" && pwd)
manifest=$dir/manifest.tsv
printf 'lens\ttask\texit\tresult\tlog\n' >"$manifest"

run_pair() {
  local lens=$1 task=$2 log rc result
  log=${task%.task.json}.log
  node "$here/run-phase.mjs" pair "$task" >"$log" 2>&1
  rc=$?
  result=$(sed -n 's/^RESULT: //p' "$log" | tail -n 1)
  # Single small append: atomic enough for concurrent writers on Linux.
  printf '%s\t%s\t%s\t%s\t%s\n' "$lens" "$(basename "$task")" "$rc" "${result:-none}" "$log" >>"$manifest"
}

slots=0
for lens_dir in "$dir"/*/; do
  [ -d "$lens_dir" ] && slots=$((slots + 1))
done
if [ "$slots" -eq 0 ]; then
  printf 'run-lenses: no lens directories under %s\n' "$dir" >&2
  exit 2
fi

# Sort key is the task file name (NN-chunk), then lens: chunk 01 of every lens first.
mapfile -t queue < <(
  for task in "$dir"/*/*.task.json; do
    [ -e "$task" ] && printf '%s\t%s\t%s\n' "$(basename "$task")" "$(basename "$(dirname "$task")")" "$task"
  done | sort
)

running=0
for row in "${queue[@]}"; do
  IFS=$'\t' read -r _ lens task <<<"$row"
  if [ "$running" -ge "$slots" ]; then
    wait -n
    running=$((running - 1))
  fi
  run_pair "$lens" "$task" &
  running=$((running + 1))
done
wait

printf 'run-lenses: %d slot(s), %d task(s) done. Manifest: %s\n' "$slots" "${#queue[@]}" "$manifest"
awk -F '\t' 'NR > 1 && $3 != 0 { failed=1 } END { exit failed ? 1 : 0 }' "$manifest"
