# design rules — Ousterhout, structural chapters

The book's definition (ch2): **complexity is anything that makes software
hard to understand or modify**, and it shows up three ways — *change
amplification* (a simple change touches many places), *cognitive load* (how
much you must know to complete a task), and *unknown unknowns* (it's not
clear what must change, or whether the change worked). Unknown unknowns are
the worst; every finding should name which symptom it causes.

## Module depth (ch4, ch6)

- **Shallow module** — interface is complex relative to the functionality it
  provides. The tell: a class/module whose public methods are mostly trivial
  getters/setters or one-line delegations; a "linked list class" where each
  operation is its own method the caller must orchestrate. Interface cost ≥
  implementation value. `design#shallow-module`
- **Classitis** — many tiny classes, none individually wrong, that together
  force callers to assemble what one deeper module should provide.
  `design#classitis`
- **Over-specialized interface** — a general capability exposed through many
  special-purpose methods instead of one general-purpose method with a
  parameter. "Somewhat general purpose" is the target: functionality for
  today's need, interface general enough for multiple uses. `design#specialized-interface`

## Information hiding (ch5)

- **Information leakage** — the same design knowledge (a format, a protocol,
  a default, a business rule) appears in two+ modules, so changing it means
  editing both. Confirm by finding the second copy. `design#information-leakage`
- **Temporal decomposition** — code split by *order of execution* (read
  phase class, process phase class, write phase class) so the knowledge of
  the shared data format leaks into every phase module. The fix is a module
  that owns the format; the finding is the split. `design#temporal-decomposition`
- **Overexposure** — internal representation (field types, storage layout,
  wire format) visible through the public interface, so callers couple to
  the implementation. `design#overexposure`

## Abstraction layers (ch7, ch8)

- **Pass-through method** — a method that does nothing but call another
  method with the same signature, adding no value. Each one is evidence the
  layer boundary is wrong. (The book's example: 13 of 15 public methods.)
  `design#pass-through`
- **Same-abstraction layers** — an interface whose abstraction is the same
  as the implementation behind it (a wrapper that re-exposes everything).
  Different layer, different abstraction — or the layer shouldn't exist.
  `design#redundant-layer`
- **Complexity pulled up** — the module makes its callers handle complexity
  (configuration knobs for everything, errors callers must branch on,
  parameters callers can't know) that the module itself could absorb. Pull
  complexity downwards: it is more important for a module to have a simple
  interface than a simple implementation. `design#complexity-pulled-up`

## Cohesion (ch9)

- **Wrong split** — two modules share so much state/flow that each change
  requires editing both (bring together); or one module bundles unrelated
  mechanisms the callers need separately (pull apart). The test: do they
  share information? Does anyone benefit from them being separate?
  `design#wrong-split`

## Strategy & evolution (ch3, ch16)

- **Tactical programming** — the change works but makes the system
  structurally worse: a special case bolted on, a flag added instead of
  fixing the cause, logic duplicated "just for now". Working code isn't
  enough. `design#tactical-programming`
- **Comments-on-hack absent** — when a tactical shortcut IS deliberate, it
  must be marked and justified; an unmarked one is invisible debt.
  (Marking is the finding's requirement, not a style nit.) `design#unmarked-hack`

## Names & obviousness (ch14, ch17, ch18)

- **Vague names** — `data`, `result`, `tmp`, `handle`, `process`,
  `Manager`/`Util` grab-bags; names where two entities could plausibly share
  the name. Names must be precise and used consistently (same name for same
  concept everywhere). `design#vague-name`
- **Obscure code** — code whose behavior isn't obvious from reading it:
  implicit control flow (callbacks wiring to distant handlers), values
  mutated far from where they're read, generic containers (`Pair`,
  `Tuple`, `map<string,object>`) where the real type is unclear.
  `design#obscure-code`
- **Inconsistency** — the codebase has an established convention (naming,
  error shape, logging, layering) and this code does it differently without
  a documented reason. `design#inconsistency`

Severity guidance: design findings are usually P2 by nature (structural,
future-rot). Reserve P1 for unknown-unknowns producers: information leakage
across module boundaries, temporal decomposition in core formats, and
pass-through layers on actively-changed seams. Never P0 — P0 needs
correctness impact, and other lenses own that.
