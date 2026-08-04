#!/usr/bin/env bash
# Fan out one review process per (repo x lens), ALL in parallel, wait for every
# one, then leave a TSV manifest behind. Called by the review-consolidate skill;
# usable standalone.
#
# Each child reviews one repo under one lens in its own process: that is where
# the parallelism lives, which is why the skills spawn no subagents
# (docs/adr/0004-no-subagents.md).
#
# Usage:
#   run-matrix.sh --log-dir DIR [--lenses a,b,c] [--runner pi|claude]
#                 [--dry-run] REPO [REPO...]
#
# Manifest columns: repo, lens, exit, seconds, report, log
set -uo pipefail

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
}

log_dir=""
lenses_csv=""
runner="pi"
dry_run=0

while [ $# -gt 0 ]; do
  case $1 in
    --log-dir) log_dir=${2:-}; shift 2 || true ;;
    --lenses)  lenses_csv=${2:-}; shift 2 || true ;;
    --runner)  runner=${2:-}; shift 2 || true ;;
    --dry-run) dry_run=1; shift ;;
    -h|--help) usage; exit 0 ;;
    --) shift; break ;;
    -*) printf 'run-matrix: unknown option %s\n' "$1" >&2; exit 2 ;;
    *) break ;;
  esac
done

repos=("$@")
if [ ${#repos[@]} -eq 0 ]; then
  printf 'run-matrix: at least one repo path is required\n\n' >&2
  usage >&2
  exit 2
fi
if [ -z "$log_dir" ]; then
  printf 'run-matrix: --log-dir is required\n\n' >&2
  usage >&2
  exit 2
fi

base_dir=$(cd "$(dirname "$0")/.." && pwd)

# Lens list: explicit --lenses, else every lens dir except the change-only ones.
lenses=()
if [ -n "$lenses_csv" ]; then
  IFS=, read -r -a lenses <<<"$lenses_csv"
else
  for d in "$base_dir"/lenses/*/; do
    [ -d "$d" ] || continue
    name=$(basename "$d")
    case $name in test-surface|blast-radius) continue ;; esac
    lenses+=("$name")
  done
fi
if [ ${#lenses[@]} -eq 0 ]; then
  printf 'run-matrix: no lenses found under %s/lenses\n' "$base_dir" >&2
  exit 2
fi

case $runner in
  pi|claude) ;;
  *) printf 'run-matrix: --runner must be pi or claude, got %s\n' "$runner" >&2; exit 2 ;;
esac
if [ "$dry_run" -eq 0 ] && ! command -v "$runner" >/dev/null 2>&1; then
  printf 'run-matrix: %s is not on PATH\n' "$runner" >&2
  exit 127
fi

mkdir -p "$log_dir" || exit 1
manifest=$log_dir/manifest.tsv
printf 'repo\tlens\texit\tseconds\treport\tlog\n' >"$manifest"

for repo in "${repos[@]}"; do
  if ! abs=$(cd "$repo" 2>/dev/null && pwd); then
    printf '%s\t-\t2\t0\tnone\tnone\n' "$repo" >>"$manifest"
    printf 'run-matrix: no such directory: %s\n' "$repo" >&2
    continue
  fi
  name=$(basename "$abs")
  for lens in "${lenses[@]}"; do
    log=$log_dir/$name-$lens.log
    prompt="Use the review-repo skill to review the repository at $abs with exactly one lens: --lenses $lens. Do not ask any questions."
    if [ "$dry_run" -eq 1 ]; then
      printf '%s\t%s\t0\t0\tdry-run\t%s\n' "$name" "$lens" "$log" >>"$manifest"
      printf 'DRY-RUN %s -p %q\n' "$runner" "$prompt"
      continue
    fi
    # One subshell per pairing, all launched before the wait below.
    (
      start=$SECONDS
      "$runner" -p "$prompt" >"$log" 2>&1
      rc=$?
      report=$(sed -n 's/^REPORT: //p' "$log" | tail -n 1)
      # Single small append: atomic enough for concurrent writers on Linux.
      printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
        "$name" "$lens" "$rc" "$((SECONDS - start))" "${report:-none}" "$log" >>"$manifest"
    ) &
  done
done

wait

printf 'run-matrix: %d repo(s) x %d lens(es) done. Manifest: %s\n' \
  "${#repos[@]}" "${#lenses[@]}" "$manifest"
