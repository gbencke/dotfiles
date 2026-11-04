# Lens groups share a child; lens children run on Sonnet

Amends ADR 0006. The judge is unchanged.

A test review of 404.prior-auth-api-call (58 tracked files) selected 11 lenses
and cut the repo into 10 chunks of 1 to 18 files: 92 propose → challenge pairs.
The first 17 pairs cost $24 on Opus 5.5, so the full run would cost about $145.
Each child reads its chunk again from the start: cache writes were 48% of the
cost and thinking output 34%. Eleven lenses read the same chunk 11 times.

Decision:

- **Lens groups.** A propose/challenge task may carry a list of lenses in
  `lens`. The child gets one rules section per lens and reads the chunk once.
  Every finding still carries exactly one lens, and `run-phase.mjs` fails a
  child that tags a finding with a lens outside its task. Coverage and health
  stay per lens. review-repo uses four groups: failure-paths, correctness,
  structure, security-platform.
- **Packed chunks.** review-repo packs whole directories into chunks of up to
  ~40 files or ~30k tokens instead of one chunk per small directory.
- **Sonnet for lenses.** propose and challenge always run
  `amazon-bedrock/us.anthropic.claude-sonnet-5-5` (`LENS_MODEL`). The judge
  phases keep the default model, or `task.model`.

Expected: about 12 pairs instead of 92, about $25 instead of $145 for that repo.

Cost: a child that applies three checklists may look at each one less closely
than a child with one, and Sonnet may miss subtle defects that Opus finds. The
challenger still attacks every finding and the judge still rules on all of
them. A single-lens task (`lens` as a string) still works, so review-change and
`--lenses` runs are unaffected apart from the model.
