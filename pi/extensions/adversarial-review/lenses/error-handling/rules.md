# error-handling rules — failure paths are real code

## Swallowed errors (the worst class)

- Empty catch/except blocks, or catch that only logs at debug/trace.
- Catch-all (`except:`, `catch (e)` without type check) that swallows
  programming errors along with expected ones — masks NPEs as "handled".
- Error returns ignored (`_ = f()` on a `error`-returning call,
  unawaited promises, unchecked `Result`).
- Catch that "handles" by continuing with a default/null — downstream code
  now silently computes on garbage. State the garbage's blast path.

## Context destruction

- Re-throwing a new exception without chaining the cause
  (`raise X(...)` instead of `raise X(...) from e`; `throw new Error(msg)`
  dropping the original). The 3am debugger gets a lie.
- Log messages without the identifiers needed to find the failing entity
  (no order id, user id, request id) — "error occurred" tells no one anything.
- Errors logged multiple times up the stack (log-and-rethrow at every
  layer) — noise that buries the root.

## Data loss / corruption on error paths

- Partial writes without rollback/compensation: entity saved, related
  write fails, error returned — DB now inconsistent.
- "Delete then insert" non-transactional sequences where failure between
  the two loses the record.
- Error paths that ack/commit the message (queue, stream offset) before
  the work is durably done — message lost on crash, never retried.

## Error contract violations

- Handlers that return 200/success bodies when the operation failed.
- Stack traces, internal hostnames, SQL, or library versions leaked into
  client-facing error responses.
- Inconsistent error shapes across sibling endpoints (some `{error}`,
  some `{message}`, some plain string) — clients cannot handle failures
  programmatically.

Cite as `error-handling#swallowed`, `error-handling#lost-cause`,
`error-handling#ack-before-done`, …
