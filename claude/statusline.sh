#!/usr/bin/env bash
# statusline.sh — two-line status line for Claude Code.
#
# Claude Code runs this script on each update and pipes a JSON blob about the
# session into stdin. Whatever the script prints becomes the status line.
#
#   📁 ~/git.work/000.INFRA/dotfiles   master ↑1 +1 ~3 ?2
#   🧠 [████░░░░░░] 42% 84k/200k  ⚙ 3 procs  Opus
#
# Line 1: where you are (dir, branch, ahead/behind, staged/modified/untracked).
# Line 2: what the session costs (context used, child processes, model).
set -uo pipefail

INPUT="$(cat)"

# Colors. Claude Code renders ANSI escapes in the status line.
RESET=$'\e[0m'; DIM=$'\e[2m'
BLUE=$'\e[34m'; MAGENTA=$'\e[35m'; GREEN=$'\e[32m'
YELLOW=$'\e[33m'; RED=$'\e[31m'; CYAN=$'\e[36m'

# Read one field from the session JSON; prints nothing when it is absent.
field() { jq -r "$1 // empty" <<<"$INPUT" 2>/dev/null; }

# Print a token count in short form: 84213 -> 84k, 1000000 -> 1.0M.
human() {
  local n="$1"
  if (( n >= 1000000 )); then awk -v n="$n" 'BEGIN{printf "%.1fM", n/1000000}'
  elif (( n >= 1000 )); then echo "$(( n / 1000 ))k"
  else echo "$n"; fi
}

# Shorten the dir by swapping $HOME for ~.
pretty_dir() { local d="$1"; echo "${d/#$HOME/\~}"; }

# Build the git segment: branch, ahead/behind and file counts by state.
# Uses porcelain v2 because it reports branch, upstream and every file
# in one call, so the status line stays fast in large repos.
git_segment() {
  local dir="$1" status branch="" ahead=0 behind=0
  local staged=0 modified=0 untracked=0 conflicts=0
  status="$(git -C "$dir" --no-optional-locks status --porcelain=v2 --branch 2>/dev/null)" || return 0

  while IFS= read -r line; do
    case "$line" in
      "# branch.head "*) branch="${line#\# branch.head }" ;;
      "# branch.ab "*)
        read -r _ _ a b <<<"$line"; ahead="${a#+}"; behind="${b#-}" ;;
      "? "*) ((untracked++)) ;;
      "u "*) ((conflicts++)) ;;
      [12]" "*)
        # XY: X = index (staged), Y = worktree (modified); '.' means clean.
        local xy="${line:2:2}"
        [[ "${xy:0:1}" != "." ]] && ((staged++))
        [[ "${xy:1:1}" != "." ]] && ((modified++)) ;;
    esac
  done <<<"$status"

  # Detached HEAD: show the short commit instead of "(detached)".
  [[ "$branch" == "(detached)" ]] && branch="@$(git -C "$dir" rev-parse --short HEAD 2>/dev/null)"

  local out="${MAGENTA} ${branch}${RESET}"
  (( ahead > 0 ))     && out+=" ${CYAN}↑${ahead}${RESET}"
  (( behind > 0 ))    && out+=" ${CYAN}↓${behind}${RESET}"
  (( staged > 0 ))    && out+=" ${GREEN}+${staged}${RESET}"
  (( modified > 0 ))  && out+=" ${YELLOW}~${modified}${RESET}"
  (( untracked > 0 )) && out+=" ${DIM}?${untracked}${RESET}"
  (( conflicts > 0 )) && out+=" ${RED}!${conflicts}${RESET}"
  (( staged + modified + untracked + conflicts == 0 )) && out+=" ${GREEN}✓${RESET}"
  echo "$out"
}

# Context window usage as "pct used size".
# Prefers the fields Claude Code sends; falls back to the last assistant
# message's token usage in the transcript for versions that lack them.
context_numbers() {
  local pct used size
  size="$(field '.context_window.context_window_size')"
  pct="$(field '.context_window.used_percentage')"
  used="$(field '.context_window.current_usage | (.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)')"

  if [[ -z "$used" || "$used" == 0 ]]; then
    local transcript; transcript="$(field '.transcript_path')"
    if [[ -f "$transcript" ]]; then
      used="$(tail -n 200 "$transcript" | jq -rs '
        [ .[] | select(.type == "assistant") | .message.usage // empty ] | last
        | if . then (.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0) else empty end
      ' 2>/dev/null)"
    fi
  fi

  [[ -z "$size" ]] && size=200000
  [[ -z "$used" ]] && used=0
  [[ -z "$pct" ]] && pct=$(( used * 100 / size ))
  echo "${pct%.*} $used $size"
}

# Draw a 10-cell bar, green → yellow → red as the context fills.
context_segment() {
  local pct used size color bar="" i
  read -r pct used size <<<"$(context_numbers)"
  if   (( pct >= 80 )); then color="$RED"
  elif (( pct >= 50 )); then color="$YELLOW"
  else color="$GREEN"; fi
  for (( i = 0; i < 10; i++ )); do
    if (( i < (pct + 5) / 10 )); then bar+="█"; else bar+="░"; fi
  done
  echo "${color}[${bar}] ${pct}%${RESET} ${DIM}$(human "$used")/$(human "$size")${RESET}"
}

# Find the claude process that launched this script by walking up the tree.
claude_pid() {
  local pid=$$ comm
  while (( pid > 1 )); do
    comm="$(ps -o comm= -p "$pid" 2>/dev/null)"
    [[ "$comm" == "claude" ]] && { echo "$pid"; return; }
    pid="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')"
    [[ -z "$pid" ]] && return
  done
}

# Count every descendant of the claude process (shells, servers, MCP
# servers), minus this script's own chain so the status line does not
# count itself.
process_segment() {
  local root; root="$(claude_pid)"
  [[ -z "$root" ]] && return 0

  # Pids from this script up to (not incl.) claude: excluded from the count.
  local self=" " pid=$$
  while [[ -n "$pid" && "$pid" != "$root" ]] && (( pid > 1 )); do
    self+="$pid "
    pid="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')"
  done

  local count
  count="$(ps -e -o pid=,ppid= | awk -v root="$root" -v self="$self" '
    { parent[$1] = $2 }
    END {
      n = 0
      for (p in parent) {
        if (index(self, " " p " ")) continue
        # Walk up; count p if it reaches root without crossing our own chain.
        q = parent[p]; skip = 0
        while (q != "" && q != root && q > 1) {
          if (index(self, " " q " ")) { skip = 1; break }
          q = parent[q]
        }
        if (!skip && q == root) n++
      }
      print n
    }')"
  echo "${BLUE}⚙ ${count} procs${RESET}"
}

main() {
  local dir model
  dir="$(field '.workspace.current_dir')"; [[ -z "$dir" ]] && dir="$(field '.cwd')"
  [[ -z "$dir" ]] && dir="$PWD"
  model="$(field '.model.display_name')"

  local line1="📁 ${BLUE}$(pretty_dir "$dir")${RESET}"
  local git; git="$(git_segment "$dir")"
  [[ -n "$git" ]] && line1+="  $git"

  local line2="🧠 $(context_segment)  $(process_segment)"
  [[ -n "$model" ]] && line2+="  ${DIM}${model}${RESET}"

  printf '%s\n%s\n' "$line1" "$line2"
}

main
