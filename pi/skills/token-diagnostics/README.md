# token-diagnostics

Find out where an AI coding agent's tokens actually go, and what each fix is worth in dollars.

Works with **Claude Code**, **pi**, and **opencode**. Finds the session logs on its own, reads the last 7 days, and prints a fixed 10-section summary. Built for teams: every developer runs the same command, and the redacted per-developer exports merge into one fleet report.

Python 3.11+. Standard library only. No install, no API keys, no network.

---

## Quick start

```bash
python3 analyze_tokens.py                     # standard summary, last 7 days
python3 analyze_tokens.py where               # which log dirs were found
python3 analyze_tokens.py export --dev alice -o alice.json
python3 analyze_tokens.py merge ./exports/    # fleet report
```

---

## Why this exists

`ccusage` and the vendor dashboards tell you **how much** you spent. They cannot tell you **why**.

This tool answers the why. Cost in an agentic loop is not "tokens used", it is:

```
cost ≈ context size × number of turns
```

Every turn re-sends the whole conversation. A 5,000-line log dumped into context on turn 8 is paid for again on turn 9, turn 10, and every turn after it. A bloated instruction file is paid once per session, forever. The diagnostics below all measure one input to that product, then convert it into a dollar figure and a specific habit to change.

---

## Installation

Copy the directory anywhere, or into your agent's skills folder:

```bash
cp -r token-diagnostics ~/.pi/agent/skills/
```

For a fleet rollout, `analyze_tokens.py` is self-contained: a single file copy is enough. It imports nothing outside the standard library.

---

## Commands

| Command | Purpose |
|---|---|
| `analyze` (default) | Standard summary for this machine, as markdown |
| `where` | List every harness log directory found, with last-activity time |
| `export` | Redacted JSON for one developer, safe to send to a team lead |
| `merge <dir>` | Fleet summary built from a directory of exports |

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--harness claude\|pi\|opencode` | auto | Force the harness instead of detecting it |
| `--dev NAME` | `$USER` | Label used in the report and the fleet table |
| `--days N` | `7` | Lookback window. The fleet report assumes 7 |
| `--top N` | `10` | Rows in the top-N tables |
| `--prices FILE` | built-in | Price table override, JSON |
| `--json` | off | Emit the raw report structure instead of markdown |
| `-o FILE` | stdout | Write to a file |
| `path` | auto | Positional override: a harness log dir, or the export dir for `merge` |

---

## How it finds the logs

No path argument needed. Resolution order:

1. **Environment overrides** — `CLAUDE_CONFIG_DIR`, `PI_CONFIG_DIR`, `PI_DIR`, `OPENCODE_DATA_DIR`. Comma-separated lists are supported, matching ccusage's convention.
2. **Standard locations**

   | Harness | Path | Storage |
   |---|---|---|
   | Claude Code | `~/.claude/projects/<slug>/<session>.jsonl` | JSONL, one line per streamed block |
   | pi | `~/.pi/agent/sessions/<slug>/<ts>_<id>.jsonl` | JSONL, typed records |
   | opencode | `~/.local/share/opencode/opencode.db` | SQLite (`message`, `part`, `session`) |
   | opencode (legacy) | `~/.local/share/opencode/storage/message/…` | JSON files |

   macOS `~/Library/Application Support/` and `~/.config/` variants are also searched.

3. **Tie-break** — if several harnesses have data, it picks the one the current shell runs under (`CLAUDECODE`, `PI_AGENT`, `OPENCODE` env markers). Failing that, the most recently active.

Run `where` to see what it found:

```
| Harness  | Log dir                              | Last activity    |
|----------|--------------------------------------|------------------|
| pi       | /home/alice/.pi                      | 2026-09-01 11:45 |
| claude   | /home/alice/.claude                  | 2026-08-06 12:18 |
```

---

## The window

**Last 7 days, always.** Two reasons: recent habits are the ones worth coaching, and a fixed window makes developer comparison fair. `--days N` exists for backfill and one-off investigations, but the fleet report assumes 7.

---

## Output: the standard summary

Every run emits the same 10 sections in the same order, so two reports diff cleanly.

| Section | Answers |
|---|---|
| Header | Who, which harness, which log dir, which window |
| 1. Scorecard | Every key metric against its healthy target, plus an A–E grade |
| 2. Volume | Sessions, turns, and each token class |
| 3. Spend by model | Is a premium tier doing routine work? |
| 4. Context filled by tool | Which tool dumps the most into the window |
| 5. Spend by project | Which repo costs the most |
| 6. Most expensive sessions | Which specific sessions ran away |
| 7. Biggest single tool results | The individual dumps to stop making |
| 8. Redundant re-reads | Content paid for twice |
| 9. Findings | Ranked: ID, title, recoverable dollars, cause, fix |
| 10. Bottom line | Grade, monthly extrapolation, one action |

### The efficiency grade

Share of spend **not** flagged as recoverable:

| Grade | Efficiency |
|---|---|
| A | ≥ 85% |
| B | ≥ 70% |
| C | ≥ 55% |
| D | ≥ 40% |
| E | < 40% |

Developers with under $1 of activity in the window are never graded down — too little signal.

---

## The diagnostics

| Metric | What it measures | Healthy |
|---|---|---|
| Cache hit rate | `cache_read / (cache_read + fresh input + cache write)`. Cache reads cost 5–60× less than fresh input. | > 85% |
| Startup context | Billed input on a session's first turn: system prompt, instruction files, MCP tool schemas, skill descriptions. Paid every session. | < 25,000 |
| Session peak context | Largest billed input in a session. Drives per-turn cost and degrades answer quality. | p90 < 120,000 |
| Tool output share | Bytes of each tool's results entering context, as a share of all tool output. | no tool > 35% |
| Session hygiene | Count of `/clear` and `/compact` events; the only things that reset accumulated context. | long sessions get one |
| Model tiering | Realised cost per turn per model, compared within the window. | premium < 50% of spend |
| Subagent share | Cost of sidechain/subagent turns. Each subagent pays its own full startup overhead. | < 35% |
| Tool failure rate | Failed calls / total calls. Each failure costs the call, the error text, and the retry turn. | < 10% |
| Redundant re-reads | Same target read 3+ times in one session; it was already in context. | rare |
| Cost per file change | Total cost / edit+write calls. High means spend went to exploration, not to change. | < $2.00 |

---

## The findings

Ten threshold rules. Each fires only when breached, and carries an estimated recoverable amount, a cause, and a concrete fix. Findings are ranked by dollars.

| ID | Fires when | Estimated recoverable |
|---|---|---|
| `cache-misses` | hit rate < 70% | `cost × (0.85 − rate) × 0.6` |
| `startup-bloat` | median startup > 25k tokens | startup × sessions, priced at cache-write rate |
| `tool-bloat-<tool>` | one tool > 35% of tool output and > 200k tokens | `cost × share × 0.25` |
| `context-runaway` | p90 peak context > 120k | `cost × 0.20` |
| `no-hygiene` | < 15% of sessions compacted while p90 > 40 turns | `cost × 0.12` |
| `model-mix` | premium tier > 50% of spend, cheaper tier available | `premium cost × 0.25` |
| `single-model` | only one model used and cost > $20 | `cost × 0.15` |
| `subagent-cost` | subagents > 35% of spend | `subagent cost × 0.3` |
| `tool-errors` | failure rate > 10% | `cost × rate × 0.5` |
| `repeat-reads` | > 20 redundant re-reads | `cost × 0.05` |
| `cost-per-edit` | > $2.00 per file change | `cost × 0.10` |

Estimates are deliberately conservative multipliers, not promises. They exist to **rank** fixes, not to forecast a budget.

**Model tiering is data-driven.** There is no list of "expensive model names" to maintain. The rule compares each model's realised cost per turn inside the window, treats anything ≥ 2× the cheapest as premium, and names both models in the finding:

> 78% of spend went to the premium tier (`claude-opus-4-8` at $0.138/turn vs `claude-sonnet-4-6` at $0.031/turn)

---

## Fleet workflow (50 developers)

### 1. Each developer exports

```bash
python3 analyze_tokens.py export --dev "$USER" -o "$USER.json"
```

### 2. The lead merges

```bash
python3 analyze_tokens.py merge ./exports/ -o fleet-report.md
```

The fleet report contains:

- **Headline** — total spend, recoverable spend and its monthly extrapolation, grade mix, cost distribution (mean / p50 / p90 / max), spread ratio, top-10% share of spend, fleet cache hit rate.
- **Fleet-wide issues** — every finding aggregated across developers, ranked by recoverable spend, with the count of developers affected. This is where central fixes come from.
- **Per developer** — grade, cost, share, sessions, turns, cache hit, startup context, p90 peak context, cost per change, top issue.
- **Fleet tool output volume** and **fleet model mix**.
- **Coaching shortlist** — the top spenders with their three highest-value fixes.

### Privacy

The export is redacted by construction, not by filter:

| Kept | Dropped |
|---|---|
| Token counts, costs, timings | All prompt and response text |
| Tool names and call counts | File contents |
| Output sizes | Full file paths — reduced to `*.py` |
| Session shape (turns, context, compactions) | Commands — reduced to the verb, e.g. `pytest` |
| Model names | Project names — replaced with `project-00` |
| | Session IDs — replaced with `s0000` |

The test suite asserts that no path, command, or project name survives an export.

### Reading the results

- **High cost, grade A** — expensive but efficient. Leave them alone.
- **Low cost, grade E** — cheap but wasteful habits. Coach before their volume grows.
- **Spread above 5×** — investigate the top spenders' workflows first; the fleet total is theirs.
- **One issue affecting most developers** — fix it centrally (instruction files, MCP server list, default model, tool guidance), not person by person.

---

## Cost accuracy

pi and opencode record cost per turn; those values are used verbatim. Claude Code records tokens only, so cost comes from a built-in price table matched on model-name substring (opus, sonnet, haiku, gpt-5, gemini, grok, qwen, deepseek, glm, kimi and others), covering input, output, cache write, and cache read separately.

Override it:

```bash
python3 analyze_tokens.py --prices prices.json
```

```json
{ "my-model": [3.0, 15.0, 3.75, 0.30] }
```

Values are USD per 1M tokens, in the order input, output, cache write, cache read. Your entries take precedence over the built-ins.

Cross-check the headline against `npx ccusage@latest`, which reads the same logs.

---

## Known limitations

| Limitation | Detail | When to care |
|---|---|---|
| Byte-based token estimates | Tool output is estimated at 4 bytes/token, roughly ±15%. Only affects the tool tables, never the billed totals, which come from the logs. | Swap in a real tokenizer if the error would change a decision. |
| Images and PDFs | Clamped to a flat 1,600 tokens because they bill per tile, not per byte. | Heavy image workflows will be slightly off. |
| Unpaired tool results | Shown as `?` in the tool table. A small share is normal. | A large share means the log format shifted — open an issue. |
| Impact estimates overlap | Two findings can both claim part of the same waste. Totals are capped at actual spend. | Use them to rank, not to budget. |
| No trend charts | The 7-day window is too short for month-over-month. | Run with `--days 90 --json` and chart it yourself. |

---

## Tests

```bash
python3 test_analyze_tokens.py
```

Builds synthetic logs for all three harnesses and asserts that:

- deliberately wasteful logs produce the expected findings;
- Claude Code's multi-line-per-request format is attributed correctly (usage billed once, every line's tool calls collected);
- redundant re-reads, zero cache hits, and total tool failure are each detected;
- exports leak no paths, commands, or project names;
- `merge` consumes exports and produces a fleet table;
- `where` reports discovered directories.

---

## Files

| File | Purpose |
|---|---|
| `analyze_tokens.py` | The tool. Stdlib only, single file, copyable on its own. |
| `SKILL.md` | Agent-facing instructions. |
| `test_analyze_tokens.py` | Self-check with synthetic logs for all three harnesses. |
| `README.md` | This document. |
