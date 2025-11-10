# TECHNICAL DESIGN: ARCHITECTURE DECISION AND SPECIFICATION (Phase 3)

## Architecture Decision Records (ADRs)

**Prompt Pattern: Template + Reflection + Persona (Architect)**

"You are an architect making binding decisions. For each major architectural decision:

### ADR-XXX: [Decision Title]

**Status**: Proposed / Accepted / Deprecated / Superseded

**Context** (The Problem Space):
- What decision are we making?
- Why is this decision necessary now?
- What are the forces at play? (constraints, requirements, tradeoffs)
- What constitutional principles are relevant?

**Decision Required**:
State the decision needed in Y-statement format:
'In the context of [use case/context], facing [concern], we decided for [option] and against [alternatives] to achieve [goals], accepting [downsides].'

**Options Considered**:
For each option (minimum 3):

**Option O-XXX**: [Name]
- **Description**: How would this work conceptually?
- **Pros**: What does this optimize for?
- **Cons**: What are the downsides?
- **Constitutional alignment**: Does this comply with principles?
- **Reversibility**: How hard to change later? (Score: Irreversible/Hard/Moderate/Easy)
- **Risk level**: CRITICAL/HIGH/MEDIUM/LOW
- **Complexity impact**: Significant/Moderate/Minimal

**Decision Made**: [Selected option]

**Rationale** (First-Principles Reasoning):
- Why is this the best option given our context?
- What tradeoffs are we accepting?
- What assumptions are we making?
- What are the long-term implications?
- How does this align with constitutional principles?
- What would make us reconsider this decision?

**Consequences** (Architectural Implications):
- **Positive**: What does this enable?
- **Negative**: What does this constrain?
- **Neutral**: What side effects exist?
- **Debt**: What technical debt are we accepting?

**Validation Approach**:
- How will we verify this decision is correct?
- What metrics indicate success?
- What would indicate we made the wrong choice?

**Dependencies**:
- What other decisions does this constrain?
- What decisions must be made before implementing this?

**Confidence Level**: Low / Medium / High
- What reduces confidence in this decision?
- What research or experiments would increase confidence?

---

Create ADRs for:
- Overall architectural style (monolith/microservices/etc.)
- Data architecture and persistence strategy
- API architecture and contracts
- Security architecture
- Deployment architecture
- Integration patterns
- Error handling strategy
- [Domain-specific major decisions]"

## Component Architecture Specification

**Prompt Pattern: Template + Cognitive Verifier + Visualization**

"For each major component in the architecture:

### Component C-XXX: [Name]

**Responsibility** (Single Responsibility):
- What is this component's core purpose?
- What capabilities does it provide?
- What is explicitly NOT its responsibility?

**Conceptual Model**:
- What domain concepts does it encapsulate?
- What is its internal conceptual structure?
- What invariants must it maintain?

**Interface Contract** (Conceptual):
- **Inputs**: What information does it consume?
- **Outputs**: What information does it produce?
- **Preconditions**: What must be true before operations?
- **Postconditions**: What is guaranteed after operations?
- **Invariants**: What is always true?

**Dependencies**:
- What other components does it depend on conceptually?
- Why is each dependency necessary?
- Can dependencies be eliminated or inverted?

**State Management**:
- What state does this component own?
- What is the lifecycle of its state?
- How is consistency maintained?
- What are the failure modes?

**Verification Questions**:
1. Does this component have exactly one reason to change?
2. Can we swap implementations without changing interfaces?
3. Are dependencies pointing in the right direction?
4. Is state management clear and bounded?
5. Can we test this component in isolation?

Create a Graphviz diagram showing:
- All components as boxes
- Interfaces as labeled edges
- Data flow with arrows
- Dependency direction
- State ownership"

## Data Architecture and Models

**Prompt Pattern: First Principles + Template**

"Design the conceptual data architecture:

### Entity Models (Conceptual, Not Physical)

For each core entity:

**Entity E-XXX**: [Name]

**Essential Properties** (What makes this entity what it is):
- [Property]: Type, Constraints, Nullability
- Why is this property essential?

**Optional Properties** (Context-specific):
- [Property]: Type, Constraints, Nullability
- When is this property relevant?

**Relationships** (How entities connect):
- **Relates to**: [Other entity]
- **Relationship type**: One-to-one / One-to-many / Many-to-many
- **Cardinality**: [Min, Max]
- **Ownership**: Who owns the relationship?
- **Lifecycle**: How does the relationship evolve?

**State Transitions**:
- What states can this entity be in?
- What transitions are valid?
- What triggers transitions?
- What invariants hold in each state?

**Consistency Requirements**:
- What consistency guarantees are needed? (Strong/Eventual/Causal)
- What are the consequences of inconsistency?
- How will consistency be maintained?

### Data Flow Patterns

**Read Patterns**:
- How will data be queried?
- What query patterns must be efficient?
- What are the access patterns?

**Write Patterns**:
- How will data be created/updated?
- What write patterns must be supported?
- What are the concurrent access patterns?

**Consistency Patterns**:
- Where can we accept eventual consistency?
- Where do we need strong consistency?
- How are conflicts resolved?

### Data Partitioning Strategy (If Needed)

- How will data be partitioned conceptually?
- What is the partitioning key?
- How are cross-partition operations handled?
- What are the implications for queries?"

## API Contract Specification

**Prompt Pattern: Template + Fact Check List**

"Design API contracts at the conceptual level:

### API Endpoint: [Operation Name]

**Purpose**: What does this operation accomplish?

**Request Contract**:
```
Conceptual structure (not specific format):
{
  "requiredData": ["field1", "field2"],
  "optionalData": ["field3"],
  "constraints": {
    "field1": "must be X",
    "field2": "must satisfy Y"
  }
}
```

**Response Contract** (Success):
```
{
  "provided": ["result1", "result2"],
  "guarantees": "what is guaranteed about the response",
  "invariants": "what relationships hold in the response"
}
```

**Response Contract** (Errors):
- **Error condition**: [Description]
  - When does this occur?
  - What information is provided?
  - Is it recoverable?
  - What should caller do?

**Idempotency**: Is this operation idempotent? Why/why not?

**Ordering guarantees**: Are there ordering requirements or guarantees?

**Performance characteristics**:
- Expected latency profile
- Expected throughput capacity
- Limiting factors

**Fact-check list**:
- Is the request contract complete (all necessary information)?
- Is the response contract complete (all promised information)?
- Are all error conditions identified?
- Are the guarantees clearly stated?
- Are the constraints enforceable?"

## Security and Error Handling Architecture

**Prompt Pattern: Persona (Security Expert) + Alternative Approaches**

"Act as a security architect and reliability engineer:

### Security Architecture Decisions

**Authentication Strategy**:
- How will identity be established?
- What are the trust boundaries?
- ADR reference: [ADR-XXX]

**Authorization Strategy**:
- How will permissions be modeled?
- How are access decisions made?
- ADR reference: [ADR-XXX]

**Data Protection Strategy**:
- What data requires protection?
- How is data protected at rest/in transit?
- ADR reference: [ADR-XXX]

### Error Handling Philosophy

**Error Categories**:
1. **Expected errors** (business logic):
   - How are these represented?
   - How are they communicated?
   - Recovery strategy?

2. **Unexpected errors** (system failures):
   - How are these detected?
   - How are they logged?
   - Recovery strategy?

3. **Catastrophic errors** (total failures):
   - How are these handled?
   - What is the fallback?
   - What is preserved?

**Failure Mode Analysis**:
For each critical component:
- What can go wrong?
- What are the symptoms?
- What is the impact?
- What is the mitigation?
- What is the recovery path?"
