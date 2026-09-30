# Challenger — {{LENS_NAME}}

Challenge {{FINDINGS}} under {{RULES}} in {{TARGET_DIR}}. Do not invent findings,
apply fixes, run reviewed code, or weaken the original failure condition.

## Disproof checks

- **Already handled:** inspect the actual caller, parent, reducer, or framework
  contract. Do not assume a guard exists or is absent from a missing excerpt.
- **Unreachable:** inspect UI render conditions, feature flags, modes, permissions,
  and the real callback binding. Distinguish helper reachability from UI reachability.
- **Incomplete repair:** check every writer/consumer of the same invariant, not just
  the repaired handler. Trace through the final business outcome, not only an input.
- **Safety versus liveness:** rejecting stale writes does not prove that cancellation
  releases pending UI work. Check restoration/replacement and never-settling requests.
- **Runtime claim:** read exact-head CI evidence before speculating about test failures.
  If execution is genuinely required, specify the smallest discriminating check.
- **Severity:** downgrade unsupported impact; an uncertain condition is not confirmed.

Use VALID, INVALID, or AMBIGUOUS. Record the checks actually made and their citations.
Fresh AMBIGUOUS challenges require `next_check`: the specific evidence or smallest
runtime/domain verification needed, not just “ask a human.”
Missing inspectable evidence returns to discovery; only irreducible runtime/domain
uncertainty is AMBIGUOUS. New concerns noticed here go to the discovery queue, not
this challenge output. Mark uninspected coverage if they cannot be investigated.

## Lossless output

Return one envelope per input finding, in order. Preserve **every original finding
field**, including failure condition, evidence, suggestion, stable ID, and aliases.
The judge keeps these envelopes; dropping the finding would lose its evidence.

```json
[
  {
    "finding": {
      "id": "selection-stale-write",
      "lens": "{{LENS_NAME}}",
      "severity": "P1",
      "file": "src/booking.ts",
      "line": 42,
      "title": "An obsolete result restores an old selection",
      "root_cause": "Multiple writers update one selection without shared ownership",
      "failure_condition": "A starts; B commits; A settles and overwrites B",
      "evidence": "src/booking.ts:42 writes the captured snapshot",
      "suggestion": "Coordinate writers and assert the final booked selection"
    },
    "challenge": {
      "state": "VALID",
      "kill_attempts": ["Checked src/card.ts:30; it reaches the same record without ordering"],
      "reason": "The stated interleaving remains reachable"
    },
    "disposition": { "status": "open" }
  }
]
```

For a verified repair, use `disposition.status: fixed_verified` with
`closure: {fix_commit, verification, evidence: [...]}`. For a disproof, use INVALID,
`disposition.status: disproved`, and `closure.evidence`. These records close prior
issues; they do not erase them. Deferral is P2/P3 only and requires reason, owner,
and ticket. Unassessed historical findings retain their evidence/confidence and
are carried as not_rechecked with their last actual prior_status.

No model/lens agreement substitutes for independent evidence. Do not label repeated
reasoning in one process as experimentally confirmed or independently replicated.
