# Veil cross-check

Translate the selected TLA+ module and the exact TLC config into Lean 4 Veil. Preserve the model as written, including bugs. Use Veil's official `tla-to-veil` skill and read its `translation.md`, `validation.md`, and `explaining.md` references before delivering:

- https://github.com/verse-lab/veil/tree/main/.agents/skills/tla-to-veil
- https://github.com/verse-lab/veil/blob/main/docs/DSL-Reference.md
- https://github.com/verse-lab/veil/blob/main/docs/ModelChecker-Guide.md

## Project

Keep a scratch Lake project outside the target repo. Pin the Veil git revision in `lakefile.toml`, use the Lean toolchain that revision requires, and record both revisions in the handoff. Do not add Veil or Lake files to the target repo unless the user asks.

The Lean file starts with:

```lean
module

public import Veil
```

Mirror the TLA+ module in a `veil module`: map variables to state fields, `Init` to `after_init`, and each action in `Next` to one Veil `action`. Keep action names, parameters, guards, nondeterminism, and simultaneous-update semantics. Map every TLC invariant to a Veil `safety` or `invariant` clause. Use finite enum and `Fin` domains that match the TLC instance.

Run `#gen_state`, `#gen_spec`, and `#model_check`. Start with `#model_check interpreted` on the small finite instance. Match TLC's deadlock setting with Veil's `termination` clause and explicit terminal actions where needed. Use `state_constraint` only for a constraint present in the TLC config. Do not add guards or assumptions to make a violation disappear.

The Veil file must build without warnings. Above each `#model_check`, comment how its arguments map to the TLC config and how to run it.

## Run and save

Run the Lean file with Lake and save its complete output as `veil.out`, preserving the exit status:

```sh
lake env lean SPEC.lean > veil.out 2>&1
```

Save the Lean source and Veil output in the Statechart output directory. Also save the TLA+ source, TLC config, view module, and pinned Veil/Lake setup needed to reproduce the run.

## Compare TLC and Veil

Write `verification.md` with the source revisions, exact commands, scopes, and a row for each applicable criterion. Mark each row `passed`, `failed`, `not run`, or `not applicable`:

| Criterion | Required comparison |
| --- | --- |
| Invariants agree | Every corresponding rule has the same hold/break result, and each run is non-vacuous. |
| Known violations reproduce | Veil finds the same bug, with states and actions mapped to the TLC path. |
| Distinct-state counts match | Complete one-to-one finite models report the same distinct-state count. |
| Deadlock results agree | Terminal-state semantics and deadlock findings match. |
| Temporal properties agree | Each translated temporal property has the same result; otherwise mark not applicable. |

A passing `#model_check` is exhaustive only for its concrete finite instance and only when no depth bound truncates the search. A successful `#check_invariants` or Lean proof is a different, stronger result; do not substitute one for the required `#model_check`.

Investigate every mismatch. Do not delete properties, weaken rules, add constraints, or change the algorithm to make results agree. If a mismatch remains, show both counterexamples or outputs and mark the cross-check failed. Do not claim the Statechart run is complete until TLC and Veil have both run and their artifacts and comparison exist.
