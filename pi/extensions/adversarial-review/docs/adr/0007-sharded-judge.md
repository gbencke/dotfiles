# The judge shards large inputs; code copies, models decide

Amends ADR 0006. Small judge inputs still go to one judge child.

A repository review of 16 chunks × 14 lenses produced 174 envelope files
(624 envelopes, about 2 MB) and a 178-row prior ledger. One judge child had to
read all of it and re-type every row into the sidecar. Bedrock stopped the first
attempt (`content_filtered`) after about 15 minutes. The retry hit the model's output
token limit after about 26 minutes, with 200 KB of sidecar written. Most of that output was copying text
the launcher already held.

Decision: over `judge_shard_bytes` (default 150 KB) `run-phase.mjs judge`:

1. **Partitions** (code). Envelopes and prior rows sharing an id or alias never
   split; components are packed by their main file. Prior rows no envelope names
   join a shard holding their file, or are carried as `not_rechecked`.
2. **Shard judges** (parallel `judge-shard` children, 8 slots). Each returns
   decision rows only: id, sources (`E…` refs, `prior:<id>`), base envelope,
   status, severity, reasons. `checkShard` rejects incomplete or inconsistent
   rows; a failed shard is retried once by itself.
3. **Assemble** (code, `bin/judge-shards.mjs`). Finding text, challenges and
   closures are copied from the envelopes; untouched prior rows are carried with
   `prior_status`. Counts, labels and the verdict gates are computed with the
   validator's own `expectedVerdict`, so they cannot disagree.
4. **Final judge** (`judge-final`). Reads a one-line index plus per-lens counts;
   returns cross-shard merges, coverage and the prose notes. Code applies the
   merges, builds the sidecar, and `publish` writes and validates it as before.

The sidecar schema and validator are unchanged. The task gains `meta` (the
pinned identity as data), required only when sharding.

Trade-off: dedup across shards relies on the final judge reading an index, not
full rows; it may read the assembled file when a call needs detail. Shards split
by id and file, so same-root-cause rows in different files can land apart.

Repair path: a judge task may set `reuse_from` to an earlier judge id in the same
work dir. Saved shard decisions are reused only where the shard input is
byte-identical, and the saved final decision is reused if present. Use it after a
launcher fix; a failure caused by a model's decisions needs fresh children.
