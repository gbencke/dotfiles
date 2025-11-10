# IMPLEMENTATION PLANNING AND EXECUTION (Phase 4)

## Pre-Implementation Validation

**Prompt Pattern: Fact Check List + Chain of Verification**

"Before generating implementation tasks, verify the design foundation:

### Design Completeness Check
Generate verification questions for each aspect:

**Requirements Coverage**:
1. List all functional requirements
2. For each requirement, identify the design elements that implement it
3. Are there requirements not covered by the design?
4. Are there design elements not driven by requirements?

**Architectural Consistency**:
1. Review all ADRs: Are there conflicts or inconsistencies?
2. Review all component interfaces: Are they complete and consistent?
3. Review data models: Are there relationship gaps or contradictions?
4. Review security decisions: Are all attack surfaces addressed?

**Constitutional Compliance**:
For each constitutional principle:
- How is it enforced in the design?
- Are there violations? If so, are they justified?
- What implementation guardrails are needed?

Generate answers to each verification question. If any answer reveals a gap, flag as BLOCKING and return to design phase.

Confidence assessment: Do you have ≥95% confidence that the design is complete and correct? If not, what specific uncertainties remain?"

## Implementation Strategy

**Prompt Pattern: Recipe + Cognitive Verifier**

"Develop the implementation strategy:

### Build Order Analysis (Dependency Graph)

**Critical Path Components**:
List components in dependency order (components with no dependencies first):
1. [Component]: Why this must be built first? What does it enable?
2. [Component]: What does it depend on? What does it enable?
...

**Parallel Opportunities**:
Identify components that can be built in parallel (no dependencies between them):
- Parallel Track 1: [Components]
- Parallel Track 2: [Components]
...

**Integration Points**:
Identify where components must integrate:
- [Integration]: Between [Component A] and [Component B]
  - What is integrated?
  - How is integration tested?
  - What are the risks?

### Test-First Strategy

**Test Pyramid**:
- **Unit tests**: What component-level tests are needed?
- **Integration tests**: What integration scenarios must be tested?
- **System tests**: What end-to-end scenarios must be tested?
- **Acceptance tests**: How are requirements verified?

**Test Order**:
For TDD, tests must be written before implementation. Order:
1. [Test category]: Tests for [component/feature]
2. [Test category]: Tests for [component/feature]
...

### Risk Mitigation

**Technical Risks**:
For each HIGH or CRITICAL risk from design:
- [Risk]: Description
  - Mitigation approach
  - Validation method
  - Fallback plan
  - When to validate (early/late/continuous)

**Proof-of-Concept Needs**:
What unknowns require PoC before full implementation?
- [Unknown]: What we don't know
  - PoC approach
  - Success criteria
  - Time box
  - Decision point"

## Task Breakdown

**Prompt Pattern: Template + Output Automater**

"Break down implementation into concrete, executable tasks:

### Task Structure

For each component in build order:

**Category: Setup / Tests / Core / Integration / Polish**

**T-XXX [P]**: [Task description - single, clear outcome]

**Component**: [Component name from architecture]

**Requirement traceability**: [FR-XXX references]

**Prerequisites**: [List T-XXX of tasks that must complete first, or "None"]

**Task type**: Test / Implementation / Integration / Documentation

**Outcome**: What exists after this task? (Be specific)

**Acceptance criteria**:
- [ ] Criterion 1 (testable/verifiable)
- [ ] Criterion 2 (testable/verifiable)
- [ ] Criterion 3 (testable/verifiable)

**Estimated complexity**: S / M / L / XL
- Rationale for estimate

**Notes/Guidance**: 
- Key implementation considerations
- Architectural constraints to respect
- ADR references
- Potential pitfalls

**[P] marker**: Add [P] if this task can run in parallel with others (no shared files/state)

### Task Generation Rules

1. **TDD Enforcement**: For every implementation task, generate test task first
   - Test task: T-XXX: "Write tests for [feature]"
   - Implementation task: T-XXX+1: "Implement [feature] to pass tests"

2. **Granularity**: Each task should be completable in a single focused session (2-4 hours)

3. **Dependency Clarity**: 
   - Different files = parallelizable (use [P])
   - Same file = sequential (no [P])
   - Logical dependency = sequential regardless of files

4. **Completion Definition**: Task done when:
   - All acceptance criteria pass
   - Tests pass
   - Code reviewed against ADRs
   - Documentation updated

### Example Task Sequence:

**Category: Setup**
T-001 [P]: Create project structure and configuration
T-002 [P]: Set up testing framework and initial tests
T-003 [P]: Configure development environment

**Category: Tests (for critical component)**
T-004: Write unit tests for Authentication service
T-005: Write integration tests for Authentication flow

**Category: Core**
T-006: Implement Authentication service (satisfies T-004)
T-007: Implement User model with validation
T-008: Implement Session management

**Category: Integration**
T-009: Integrate Authentication with API layer
T-010: Test end-to-end authentication flow

**Category: Polish**
T-011: Add error handling and logging
T-012: Performance optimization based on profiling
T-013: Documentation completion"

## Implementation Prompt Generation

**Prompt Pattern: Meta Language + Context Manager**

"For each task, generate a detailed implementation prompt that can be given to a coding agent or developer:

### Task Implementation Prompt Template

```
TASK: [T-XXX: Task description]

CONTEXT:
- **Requirement**: [What user need does this serve? Reference FR-XXX]
- **Architecture**: [Which component? Reference ADR-XXX for decisions]
- **Design constraints**: [From architecture phase]
  * [Constraint 1 from ADR]
  * [Constraint 2 from ADR]
- **Prerequisites completed**: [What can we assume exists?]

OBJECTIVE:
[What should exist after this task is done? Be specific about observable outcomes]

IMPLEMENTATION GUIDANCE:
1. **Approach**: [High-level approach based on architecture]
2. **Interface contract**: [Expected interface based on component specification]
3. **State management**: [How state should be handled]
4. **Error handling**: [Error handling strategy from architecture]
5. **Testing**: [What tests must pass?]

CONSTRAINTS:
- Constitutional: [Relevant principles from constitution]
- Architectural: [Relevant ADRs]
- Quality: [Performance, security, etc. requirements]

SUCCESS CRITERIA:
- [ ] [Criterion 1 - testable]
- [ ] [Criterion 2 - testable]
- [ ] [Criterion 3 - testable]
- [ ] All tests pass
- [ ] Code follows [style guide]
- [ ] Documentation updated

ANTI-PATTERNS TO AVOID:
- [Common mistake 1 based on architecture]
- [Common mistake 2 based on architecture]

VERIFICATION:
After implementation, verify:
1. [Verification check 1]
2. [Verification check 2]
3. Run [specific tests]

NOTES:
[Any additional context, potential pitfalls, optimization opportunities]
```

Generate this prompt structure for all tasks."

## Implementation Monitoring

**Prompt Pattern: Reflection + Alternative Approaches**

"Create monitoring and validation approach for implementation phase:

### Progress Tracking
- **Completion metric**: What percentage of tasks are done?
- **Quality metric**: What percentage of tests pass?
- **Requirement metric**: What percentage of requirements are implemented?

### Quality Validation (Continuous)

**Code Quality Gates**:
- Static analysis: [Tools and thresholds]
- Test coverage: [Threshold, e.g., 80%]
- Code review: [Checklist based on ADRs]
- Security scan: [Tools and acceptable findings]

**Architectural Conformance**:
For each ADR:
- How do we verify implementation follows the decision?
- What metrics indicate conformance?
- What code smells indicate violation?

### Issue Resolution

When implementation deviates from design:
1. **Document the deviation**: What differs from design?
2. **Analyze the cause**: Why did deviation occur?
   - Design flaw?
   - Misunderstanding?
   - Changed requirements?
   - Technical blocker?
3. **Evaluate impact**: What are the consequences?
4. **Decision point**:
   - Update implementation to match design (preferred)
   - Update design to reflect reality (if design was flawed)
   - Escalate if major architectural change needed
5. **Update ADR if design changes**: Record the evolution

### Completion Criteria

Implementation phase complete when:
- [ ] All tasks completed
- [ ] All tests passing
- [ ] All requirements implemented and verified
- [ ] All code quality gates passed
- [ ] All security requirements satisfied
- [ ] All architectural conformance checks passed
- [ ] Documentation complete
- [ ] Stakeholder acceptance criteria met"
