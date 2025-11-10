# TECHNICAL REQUIREMENTS ANALYSIS (Phase 2)

## Constitutional Compliance Check

**Prompt Pattern: Fact Check List + Reflection**

"Review the project constitution and business requirements. For each constitutional principle:

1. [PRINCIPLE]: State the principle
2. **Relevance**: Does this apply to our requirements?
3. **Implications**: What technical constraints does this create?
4. **Conflicts**: Any tension with business requirements?
5. **Validation approach**: How will we verify compliance?

Generate a fact-check list of technical assumptions we need to validate."

## Technical Landscape Survey

**Prompt Pattern: Alternative Approaches + Persona (Architect)**

"Act as an experienced software architect who thinks in first principles. For the given requirements:

### Technical Paradigm Analysis
For each potential approach (list 4-6 fundamentally different paradigms):

**Paradigm P-XXX**: [Name]
- **Fundamental approach**: How does this paradigm solve the problem conceptually?
- **Architectural style**: Monolith/Microservices/Serverless/Event-driven/etc.
- **Data architecture**: How is state managed conceptually?
- **Communication patterns**: Synchronous/asynchronous/streaming/etc.
- **Scaling approach**: Vertical/horizontal/both
- **Consistency model**: Strong/eventual/causal

**Tradeoff Analysis** (First Principles):
- What does this paradigm optimize for?
- What does it sacrifice?
- What fundamental constraints does it impose?
- When does this paradigm break down?
- What are the hard-to-change decisions?

[NOTE: Focus on architectural concepts, not specific technologies yet]"

## Technical Feasibility Assessment

**Prompt Pattern: Cognitive Verifier + Template**

"For each paradigm, break down feasibility into component questions:

### Feasibility Dimension Analysis

**Capability Feasibility**:
- Can this paradigm meet functional requirements? (Score: Yes/Partial/No)
- Which requirements are natural vs forced in this paradigm?
- Are there conceptual misalignments?

**Performance Feasibility**:
- Expected latency characteristics?
- Throughput characteristics?
- Scalability limits?
- Resource consumption profile?

**Complexity Feasibility**:
- Development complexity (Score: Low/Medium/High)
- Operational complexity (Score: Low/Medium/High)
- Cognitive load for team (Score: Low/Medium/High)
- Estimated effort multiplier vs simplest approach

**Risk Feasibility**:
- Technical risks (list with severity: CRITICAL/HIGH/MEDIUM/LOW)
- Team skill gaps (list with severity)
- Dependency risks (list with severity)
- Unknown unknowns (what could surprise us?)

**Maintainability Feasibility**:
- How easy to modify after initial implementation?
- How easy to debug when issues occur?
- How easy to onboard new team members?

Synthesize into: Recommended / Viable / Not Recommended with reasoning"

## Decision Criteria Framework

**Prompt Pattern: Reflection + First Principles**

"Establish the criteria for architectural decisions:

### Hard Constraints (Cannot Violate)
From constitution and requirements:
- [CONSTRAINT-XXX]: Description and source
- Verification method
- Impact if violated

### Optimization Targets (Priority Order)
What are we optimizing for?
1. [PRIMARY]: e.g., User experience / Time to market / Cost efficiency / Scalability
   - Measurement approach
   - Threshold for success
2. [SECONDARY]: ...
3. [TERTIARY]: ...

### Reversibility Analysis
For each major decision dimension:
- **Hard to change later** (requires deep analysis now):
  * Data models and persistence strategy
  * Core API contracts
  * Fundamental architectural style
  * Integration patterns
  * [Add domain-specific irreversible decisions]
  
- **Easy to change later** (can defer or iterate):
  * UI implementation details
  * Internal algorithms
  * Performance optimizations
  * Tooling choices
  * [Add domain-specific reversible decisions]

Strategy: Invest analysis time on hard-to-change decisions; use agile iteration for easy-to-change decisions."

## Technology Landscape (Not Technology Selection)

**Prompt Pattern: Persona + Visualization**

"As a technology strategist, map the technology landscape WITHOUT selecting technologies:

### Technology Categories Needed
For each architectural component:
- **Component**: [Name from architecture]
- **Category**: What type of technology is needed? (e.g., "time-series database", "message broker", "API gateway")
- **Essential properties**: What capabilities MUST it have?
- **Nice-to-have properties**: What would be beneficial?
- **Anti-requirements**: What must it NOT be/do?

### Integration Patterns
- How will components communicate conceptually?
- What integration guarantees are needed? (at-least-once, exactly-once, ordering, etc.)
- What are the failure modes and recovery patterns?

[NOTE: Describe WHAT we need, not WHICH specific technologies]

Create a Graphviz diagram showing:
- Major conceptual components
- Communication patterns between them
- Data flow direction
- Critical integration points"
