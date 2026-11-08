---
name: goal
description: Fix until a check command passes, with a fresh Claude context per attempt (port of pi's /goal). Runs `claude-goal`, which starts a new `claude -p` for each attempt and feeds it only the goal and the failure tail. Use when asked to "keep fixing until the tests pass", "loop until <command> passes", "/goal <check> :: <goal>", or "/goal-stop".
---

# goal — fix until a check passes

Port of pi's goal-loop. Each attempt is a new `claude -p` process. A failed attempt passes on only the goal and the last 4000 characters of the check output, never its own reasoning.

## Start

Parse the arguments as `<check command> :: <goal>`. The goal is optional. Run from the repo root, in the background:

```bash
nohup claude-goal "<check command>" "<goal>" > .claude-goal.log 2>&1 &
```

Then tail `.claude-goal.log` with a timeout and report progress. Lines from the loop start with `[claude-goal]`.

- Do not fix the code yourself in this session. The loop does the work.
- Do not edit, skip, or weaken the check.

## Stop

`/goal-stop`: run `touch .claude-goal-stop` in the repo root. The loop exits after the current attempt.

## Settings (environment)

| Variable               | Default            | Meaning                                    |
| ---------------------- | ------------------ | ------------------------------------------ |
| `GOAL_MAX_ATTEMPTS`    | `8`                | Attempts before giving up                  |
| `GOAL_TAIL_CHARS`      | `4000`             | Characters of failure output passed on     |
| `GOAL_CHECK_TIMEOUT`   | `900`              | Seconds the check may run                  |
| `GOAL_PERMISSION_MODE` | (from settings)    | `--permission-mode` for each `claude -p`   |
