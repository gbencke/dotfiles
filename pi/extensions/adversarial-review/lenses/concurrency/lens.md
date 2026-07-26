---
name: concurrency
description: Concurrency and parallelism defects — data races, atomicity/order violations, deadlocks, TOCTOU, visibility, async hazards, distributed races. Every finding needs a concrete interleaving trace.
signals:
  - "*.go"
  - "*.rs"
  - "*.java"
  - "*.kt"
  - "*.cs"
  - "*.c"
  - "*.cc"
  - "*.cpp"
  - "*.py"
  - "*.ts"
  - "*.tsx"
  - "*.js"
---

# concurrency lens

Applies to chunks/diffs containing code in any threading-capable language.
Adversarial stance: assume every unsynchronized shared access is buggy
until the diff proves otherwise. Sequential reading misses these bugs —
they pass review and unit tests, then fire once in production under load.

Evidence standard: a finding must include the interleaving that breaks it
(T1 does X; T2 does Y between X and Z; result). Findings without a
plausible interleaving trace are speculation — the challenger kills them.
"Probably fine" is not a synchronization mechanism.

Also out of scope: style nits on concurrency primitives (which mutex type,
channel vs mutex preference) — defects only.
