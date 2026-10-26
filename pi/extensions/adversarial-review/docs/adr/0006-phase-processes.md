# Each phase step runs in its own fresh pi process

Supersedes the "roles run inline" half of ADR 0004. The matrix half stands:
`bin/run-matrix.sh` still launches one review per (repo × lens).

Inside a review, the orchestrating pi process no longer adopts the reviewer,
challenger, and judge role packs itself. Every propose step, challenge step, and
the final judge step runs as a separate `pi -p` child launched by
`bin/run-phase.mjs`. The launcher builds each child's context on the fly from
the role pack (slots filled), the merged lens rules, the scope, the
orchestrator's notes, and, for later phases, the earlier phase's JSON verbatim.

Lenses run in parallel: `bin/run-lenses.sh` starts one worker per lens, and each
worker runs `run-phase.mjs pair` (propose, then challenge if anything was
proposed) for its chunks or slices in order. The judge runs once, after every
worker finishes. A matrix child reviews one lens, so it gets one worker and the
matrix fan-out does not grow.

Why: pi has no subagents, and one process playing all three roles carries the
proposer's reasoning into the challenge. A fresh process sees only the evidence
handed to it, which is the separation ADR 0001 asks for. It also bounds context
per chunk instead of per review, and gives every step an exit code and a log.

Children are locked down from the command line: `--no-extensions`,
`--no-skills`, `--no-context-files`, `--no-approve` (ignore `.pi` files in the
reviewed repo), `--no-mcp`, `--no-session`, and a tool allowlist. Repo
propose/challenge get `read,grep,find,ls`; change reviews add `bash` for
`git show <sha>:path`; the judge gets only `read`. The judge returns markdown
and sidecar as JSON; the launcher writes them exclusively and validates them, so
no child ever holds `write`.

**Considered options**: keep inline roles (no independence, rejected); run
chunks in parallel too (multiplies concurrency by chunk count and under the
matrix, rejected for now); run lenses sequentially (simplest, but a multi-lens
review takes the sum of all lenses instead of the slowest one, rejected); let the
judge child write its own artifacts (needs `write` inside the reviewed repo,
rejected).

**Consequences**: more tokens — every child re-reads the contract and rules.
A standalone multi-lens review runs one model session per lens at once, which can
hit provider rate limits; failures show up as failed manifest rows.
Children use pi's configured default model unless a task sets `model`. Because
extensions are disabled in children, a model whose provider comes from an
extension is unavailable to them. `bash` in change reviews is held read-only by
the prompt, not by the tooling. A failed step becomes `not_inspected` coverage
and is never retried silently or redone inline.
