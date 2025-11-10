# BUSINESS REQUIREMENTS ELICITATION (Phase 1)

## Constitutional Principles (Project-Specific)
[Generate or reference project constitution covering:]
- Non-negotiable requirements (security, compliance, performance)
- Organizational constraints (technology standards, team skills)
- Quality imperatives (testing philosophy, documentation requirements)
- Simplicity gates (complexity justification thresholds)
- Integration principles (API-first, library-first, etc.)

## Problem Statement (First-Principles Analysis)

**Prompt Pattern: Flipped Interaction + Question Refinement**

"I will describe a software project need. Your role is to understand the fundamental problem through questioning, not solution proposing.

1. Ask me questions to understand:
   - WHO are the users/stakeholders?
   - WHAT problems are they experiencing?
   - WHY do current approaches fail?
   - WHAT outcomes would represent success?
   - WHAT are the absolute constraints?

2. After each answer, suggest a refined version that includes more conceptual clarity.

3. Mark any area requiring clarification with [NEEDS CLARIFICATION: specific question]

4. Continue until you can articulate the problem in first-principles terms without assuming any solution approach.

5. Express the problem as fundamental needs, not technical requirements."

## Requirements Specification

**Prompt Pattern: Persona (Domain Expert) + Cognitive Verifier**

"Act as a domain expert who understands [DOMAIN] deeply. Break down the requirements into these conceptual levels:

### L1: Goals (The Overarching Intent)
- What is the fundamental goal?
- Why does this matter to users/business?
- How do we measure success without technology references?

### L2: Domains (The Conceptual Areas)
- What logical domains does this span?
- How do domains relate to each other?
- What are the boundaries between domains?

### L3: Functional Requirements (What Must Happen)
For each requirement:
- [FR-XXX] Requirement stated as user-observable behavior
- Testable: How would we know this works?
- Success criteria: What measurable outcomes?
- Priority: MUST / SHOULD / COULD
- [NEEDS CLARIFICATION] if uncertain

### L4: Key Entities and Relationships
- What are the core conceptual entities?
- How do they relate logically?
- What are their essential properties?
- What lifecycle states exist?

[NOTE: NO technology, frameworks, languages, or implementation details allowed]"

## Edge Cases and Constraints

**Prompt Pattern: Alternative Approaches + Reflection**

"For this problem domain:

1. Identify 5-7 edge cases that reveal boundary conditions
2. List hard constraints (cannot be changed) vs soft constraints (preferences)
3. Consider alternative ways users might accomplish their goals
4. Explain reasoning for why each edge case matters
5. Identify assumptions we're making about the problem domain

For each edge case, ask: Does this reveal a gap in our conceptual understanding?"

## Acceptance Scenarios

**Prompt Pattern: Template + Cognitive Verifier**

"Generate acceptance scenarios using this template:

**Scenario AS-XXX**: [Descriptive name]
- **Given**: [Initial state - no technical terms]
- **When**: [User action or system event]
- **Then**: [Expected observable outcome]
- **Success Metric**: [How we measure success]

Generate verification questions:
1. Does this scenario test a core requirement?
2. Is the outcome unambiguous and observable?
3. Are there hidden assumptions?
4. Does this cover both happy path and error conditions?

Create scenarios until all functional requirements have test coverage."
