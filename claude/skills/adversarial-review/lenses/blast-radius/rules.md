# blast-radius rules — who breaks if this merges?

## Trust the mechanical graph, then go beyond it

The orchestrator gives you `symbol → direct dependents`. Verify it
(spot-check two edges), then hunt the couplings static imports miss:

- **Event/message couplings**: changed event names, payload schemas, topic
  names — consumers subscribe by string, not import. Grep for the event/topic
  name across the repo (and note consumers in OTHER repos when visible from
  config/docs).
- **HTTP/RPC contracts**: changed request/response shapes, removed fields,
  renamed routes, changed status codes. Field removal is breaking even when
  the type still compiles.
- **DB schema**: migrations that rename/drop columns or change types —
  readers/writers of the old shape, including queries written as raw SQL
  (invisible to ORM import graphs).
- **Config/flags**: renamed env vars, changed flag defaults, removed config
  keys — deploy scripts, other services, and operators consume these.
- **Serialization formats**: changed wire/storage formats (protobuf field
  numbers, JSON keys) — old data must still read.

## Classify the change kind

schema/API contract > shared module (high fan-in) > business logic >
internal refactor > cosmetic. Breaking contract changes on high fan-in
symbols are the P0/P1 blast-radius class.

## Risk tier (required output element)

- **HIGH** — breaking contract/schema change, or >10 direct dependents, or
  semantic consumers outside the repo's visibility. Requires: migration
  plan, staged rollout, or downstream-owner notification — say which.
- **MEDIUM** — behavioral change with 3–10 dependents, all in-repo, no
  contract change.
- **LOW** — internal, ≤2 dependents, no contract surface.

## Findings

Each blast-radius finding: the affected consumer (`file:line` or external
system), the coupling mechanism (import / event / HTTP / schema / config),
and why THIS change breaks or alters it. "This module is widely used"
without a named consumer is not a finding.

Cite as `blast-radius#event-schema`, `blast-radius#contract-break`,
`blast-radius#high-fanin`, …
