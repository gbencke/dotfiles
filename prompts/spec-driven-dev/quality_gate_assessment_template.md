# QUALITY GATE: [Phase Name]

## Gate Objective
Verify ≥95% confidence in conceptual understanding of [PHASE CONCEPTS] before proceeding to [NEXT PHASE].

NOTE: This gate checks understanding of CURRENT PHASE CONCEPTS ONLY. It does NOT check future phase details.

## Level 1: Syntactic Verification (Automated)

**Structure Completeness Checks**:
```python
def verify_structure():
    checks = {
        "required_sections_present": [...],
        "required_fields_complete": [...],
        "templates_followed": [...],
        "format_valid": [...]
    }
    return all(checks.values())
```

**Anti-Pattern Detection**:
```python
def detect_anti_patterns():
    anti_patterns = {
        "premature_implementation": check_for_tech_details_in_requirements(),
        "missing_rationale": check_for_decisions_without_reasoning(),
        "ambiguous_criteria": check_for_untestable_requirements(),
        "constitutional_violations": check_against_constitution()
    }
    return [ap for ap, found in anti_patterns.items() if found]
```

## Level 2: Semantic Verification (LLM Self-Assessment)

**Conceptual Understanding Questions**:

Generate 15-20 verification questions covering:
- Core concepts from this phase
- Relationships between concepts
- Rationale for decisions made
- Tradeoffs understood
- Implications recognized
- Assumptions identified

**Scoring Rubric**:
- YES (confident, with evidence): 1.0 point
- PARTIAL (uncertain, incomplete): 0.5 points  
- NO (don't know, contradictory): 0.0 points

**Confidence Calculation**:
```
Confidence = (Total Points / Total Questions) × 100%
Pass threshold: ≥95%
```

**Explanation Requirement**:
For each question, provide:
- Answer (YES/NO/PARTIAL)
- Evidence from phase artifacts
- Specific gaps if PARTIAL or NO
- Impact on next phase if gaps exist

## Level 3: Pragmatic Verification (Cross-Validation)

**Concept Application Exercises**:

Test understanding through application:
1. **Traceability Exercise**: Map phase N inputs to phase N outputs
2. **Alternative Generation**: Generate alternative approaches
3. **Impact Analysis**: Predict consequences of changes
4. **Edge Case Handling**: Explain handling of boundary conditions
5. **Integration Validation**: Show how concepts connect

**Minimum Standards**:
- Can complete ≥80% of exercises
- Explanations demonstrate deep understanding
- Can identify gaps in own knowledge
- Can articulate uncertainty clearly

## Level 4: Meta-Verification (Cross-Phase Consistency)

**Consistency Checks**:
- Do this phase's outputs satisfy previous phase's requirements?
- Are there contradictions with earlier decisions?
- Do concepts align across phases?
- Is there conceptual drift?

**Alignment Validation**:
```
For each concept in current phase:
  - What requirement/decision drove this?
  - Is it traceable to previous phase?
  - Does it contradict anything?
  - Does it satisfy constitutional principles?
```

## Confidence Assessment Algorithm

```python
def assess_gate_confidence():
    syntactic_score = run_automated_checks()  # 0-100
    semantic_score = run_llm_self_verification()  # 0-100
    pragmatic_score = run_application_exercises()  # 0-100
    meta_score = run_consistency_checks()  # 0-100
    
    # Weighted combination
    overall_confidence = (
        0.20 * syntactic_score +
        0.40 * semantic_score +
        0.25 * pragmatic_score +
        0.15 * meta_score
    )
    
    # Identify weak areas
    weak_areas = [
        area for area, score in {
            "syntactic": syntactic_score,
            "semantic": semantic_score,
            "pragmatic": pragmatic_score,
            "meta": meta_score
        }.items() if score < 95
    ]
    
    return {
        "overall_confidence": overall_confidence,
        "pass": overall_confidence >= 95,
        "weak_areas": weak_areas,
        "detailed_scores": {...}
    }
```

## Gate Decision Matrix

| Overall Confidence | Weak Areas | Decision | Action |
|-------------------|------------|----------|---------|
| ≥95% | None | **PASS** | Proceed to next phase |
| 90-94% | Minor gaps | **CONDITIONAL PASS** | Document assumptions, proceed with caution |
| 80-89% | Significant gaps | **REVISE** | Address gaps, re-run gate |
| <80% | Major gaps | **FAIL** | Return to phase start, major rework needed |

## Remediation Strategies

**If Semantic Score Low (<95%)**:
- Run additional cognitive verifier prompts
- Generate more explanation questions
- Use reflection pattern to identify confusion
- Apply alternative approaches pattern

**If Pragmatic Score Low (<95%)**:
- Work through more application examples
- Test concepts in different contexts
- Generate and evaluate edge cases
- Perform impact analysis exercises

**If Meta Score Low (<95%)**:
- Review all prior phase artifacts
- Check for conceptual drift
- Validate traceability explicitly
- Reconcile contradictions

## Human Review Criteria

Human reviewer should verify:
- [ ] Conceptual clarity matches experience expectations
- [ ] No obvious gaps in understanding
- [ ] Decisions are well-reasoned
- [ ] Approach is feasible
- [ ] Quality is sufficient to proceed
- [ ] Confidence assessment is accurate

Human can override gate decision with documented justification.
