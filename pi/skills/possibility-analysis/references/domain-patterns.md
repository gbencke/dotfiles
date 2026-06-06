# Domain Patterns for Possibility Analysis

Common possibility structures for recurring decision domains. Use these as starting-point maps — they are not exhaustive, but they prevent reinventing the wheel and help identify when a situation is structurally standard vs. genuinely novel.

---

## Software Architecture Decisions

### Core Axes
- Centralized vs. Distributed (ownership, data, computation)
- Synchronous vs. Asynchronous (coupling, latency, reliability)
- Build vs. Buy vs. Compose (control, cost, time-to-value)
- Consistency vs. Availability (CAP theorem reality)
- Coupling spectrum: Tight → Loose → Event-driven → Choreography

### Standard Possibility Levels

**Level 1 (Obvious)**
- Add a service/module that handles the new concern
- Extend an existing service
- Use a managed cloud service

**Level 2 (Non-obvious)**
- Move the problem upstream (prevent rather than handle)
- Push complexity to the consumer (make the API more flexible, shift burden out)
- Use an event-driven pattern to decouple producers from consumers
- Introduce a materialized view or read model to serve the use case without touching the write path

**Level 3 (Constraint-challenging)**
- Abandon a consistency requirement by moving to eventual consistency
- Bypass the existing architecture with a sidecar/proxy
- Reframe a read-performance problem as a write-model problem
- Move computation to the edge or to the client

**Level 4 (Boundary)**
- Do nothing: accept the current limitation and route around it operationally
- Consolidate: merge services that have grown too interdependent to be useful as separate units
- Sunset: retire the component and migrate workloads elsewhere

### Common Failure Modes to Surface
- The new service is actually just a microservice anti-pattern (a distributed monolith)
- The performance solution moves the bottleneck rather than eliminating it
- The vendor lock-in cost is hidden in the "Buy" option
- The "Compose" option underestimates integration surface area

---

## Build vs. Buy vs. Adapt

This is one of the most frequently occurring decision structures. The canonical possibility space:

| Option | Fits When | Watch For |
|---|---|---|
| Build from scratch | Core differentiator, unique requirements, long-term strategic asset | Underestimating full cost (maintenance, hiring, evolution) |
| Buy/SaaS | Commodity capability, fast time-to-value, cost < build | Vendor lock-in, data ownership, feature ceiling |
| Buy + adapt | Good fit but needs integration or customization | Customization debt, upgrade friction |
| Open source + own | Control + community leverage | Maintenance burden without vendor support |
| Compose from primitives | Existing components cover 80%, gap is small | Integration surface, version drift |
| Outsource/partner | Non-core capability, external expertise | Quality control, knowledge transfer, dependency |

**Key question to resolve first**: Is this capability a differentiator or a commodity? If commodity: lean toward buy. If differentiator: lean toward build.

---

## Technical Debt Decisions

### Possibility Clusters

**Leave it**: Accept the debt as a known cost. Valid when the code is stable, low-change, and the debt is localized.

**Contain it**: Don't fix it, but wrap it. Anti-corruption layer, adapter, facade. Prevents the debt from spreading into new code.

**Incremental improvement**: Improve it progressively as you touch it (Boy Scout Rule). Works for high-change code with low unit risk per change.

**Strangler Fig**: Build the replacement alongside the old system, route traffic incrementally, decommission when complete. The standard pattern for legacy migration.

**Big Bang rewrite**: Risky. Almost always underestimated. Valid only when the old system is completely opaque, the debt is pervasive, and team understands the domain well enough to not make the same mistakes.

**Extract and replace**: Identify the highest-pain component, extract it into a replaceable unit, replace it, repeat. Hybrid of strangler fig and incremental.

### Key Questions
- Is the debt slowing feature delivery, or is it just ugly?
- Is it localized or systemic?
- Is the team able to change this safely (test coverage, knowledge)?
- What is the cost of inaction over the next 12 months?

---

## Team and Organizational Decisions

### Core Axes (from Team Topologies)
- Conway's Law alignment: does the team structure match the system architecture?
- Cognitive load: what can the team actually hold in their heads?
- Team type: Stream-aligned, Platform, Enabling, Complicated Subsystem
- Interaction mode: Collaboration, X-as-a-service, Facilitating

### Possibility Clusters

**Staffing a new capability**
- Hire: control, culture fit, cost (time and money)
- Contract: speed, flexibility, knowledge transfer risk
- Upskill existing team: retention, slower, motivated
- Partner/outsource: speed, dependency risk, alignment cost
- Platform team to enable others: leverage, prerequisite investment

**Team struggling with throughput**
- Remove work: deprioritize, kill projects, reduce WIP
- Add people: classic but often counterproductive short-term (Brook's Law)
- Reduce coordination cost: split team, reduce dependencies, clearer interfaces
- Improve tooling/automation: longer payoff, sustainable
- Change team structure: re-align to reduce cognitive load

**Common Failure Mode**: Treating an organizational problem as a technical problem, or vice versa. Always ask: is the constraint here human, technical, or process?

---

## Product Strategy Decisions

### Possibility Structure for "What to Build Next"

**Expand depth**: Go deeper in the existing value proposition for existing users. Usually lower risk, high retention impact.

**Expand breadth**: Serve adjacent use cases or adjacent user segments with the existing core. Medium risk, growth focused.

**Expand reach**: Take the existing product to new markets (geo, vertical, segment). Medium-high risk, requires distribution investment.

**Platform move**: Expose the core capability as a platform others build on. High leverage, high investment, requires network effects.

**New bet**: Build something outside current strengths. High risk, necessary for long-term relevance. Treat as a real option, not a roadmap item.

**Do less**: Remove features, reduce scope, focus ruthlessly. Counterintuitive but often the right answer when the product has grown unfocused.

### Key Evaluation Question
For each product option: "Who specifically benefits from this, how much do they benefit, and how do we know?"

Vague answers indicate the option needs more research, not less analysis.

---

## Infrastructure and Platform Decisions

### Compute
- Serverless (Lambda, Cloud Run): low ops, cold start, concurrency limits, per-request pricing
- Container (ECS, Kubernetes): control, operational overhead, consistent latency
- VM/dedicated: full control, highest ops burden, lowest variable cost at scale
- Edge: latency-critical, near-user computation, limited runtime environment

### Data Storage
- Relational (PostgreSQL, Aurora): ACID, joins, schema discipline, vertical scaling limits
- Document (DynamoDB, MongoDB): flexible schema, horizontal scale, query limitations
- Columnar/Analytical (Redshift, BigQuery, DuckDB): analytics, poor for OLTP
- Graph (Neptune): relationship traversal, specialized
- Time-series (InfluxDB, TimescaleDB): IoT, metrics, append-heavy
- Blob/object (S3): unstructured, cheap, not queryable natively

**First question**: Is this OLTP or OLAP? Get this wrong and no amount of optimization saves you.

### Messaging and Integration
- Synchronous REST/gRPC: simplest, tight coupling, latency visible
- Async queue (SQS, RabbitMQ): decoupled, at-least-once, ordering not guaranteed
- Event streaming (Kafka, Kinesis): high-throughput, replay, ordered partitions
- Event bus (EventBridge): loose coupling, routing, filtered fan-out
- Pub/sub (SNS): fan-out, no persistence

**Key question**: What are your delivery guarantees, and what does a consumer do when a message is missed?
