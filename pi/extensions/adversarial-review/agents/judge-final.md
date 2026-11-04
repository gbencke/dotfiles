# Final judge — {{MODE}}

Shard judges already decided every envelope; the launcher assembled the
cumulative ledger from their decisions. You finish the review. Inputs: the ledger
index and per-lens counts below, {{CONTEXT}}, and the report contract. Read
`docs/report-contract.md` from the extension directory. You may `read` the
assembled ledger file and envelope files for detail. Never reread source to invent
a finding.

The launcher computes counts, labels, and the verdict from the gates in the
contract. You do not write the sidecar.

## Output

```json
{
  "merges": [
    {"alias": "undo-outbox-left", "into": "undo-leaves-inflight-outbox",
     "merge_reason": "Both describe undo not fencing in-flight PlatformSync messages"}
  ],
  "coverage": [
    {"id": "prod-write-guard", "invariant": "…", "critical": true,
     "entry_points": ["…"], "writers": ["…"], "consumers": ["…"], "outcomes": ["…"],
     "status": "unresolved", "next_check": "…"}
  ],
  "solution_fit": null,
  "notes": "## Verdict reasoning\n…\n\n## Per-lens health\n…\n\n## Not reviewed\n…"
}
```

- `merges`: only rows from different shards that share one root cause. `into`
  keeps its id; prefer a prior id. The fresher row keeps its content. Do not merge
  on the same file alone. An empty array is normal.
- `coverage`: one row per critical invariant in the orchestrator context, plus any
  scope the orchestrator marked uninspected. `verified` and `not_applicable` need
  `evidence[]` (cite ledger rows or envelopes); `not_applicable` also needs
  `reason`; `unresolved` and `not_inspected` need a concrete `next_check`. Do not
  mark an invariant verified because no finding names it.
- `solution_fit`: null for repository reviews; otherwise FITS, QUESTIONABLE,
  WRONG-APPROACH, or unknown-intent.
- `notes`: Markdown `##` sections only: why the verdict gates landed where they did
  (an active `not_rechecked` row or a critical coverage gap means INCOMPLETE), the
  per-lens health table for repository reviews (HEALTHY / NEEDS-ATTENTION /
  CRITICAL / INCOMPLETE; an incomplete lens is never HEALTHY), blast radius for
  change reviews, and what was not reviewed. Keep it short and list no findings.

Reply with only the JSON object in one fenced `json` block.
