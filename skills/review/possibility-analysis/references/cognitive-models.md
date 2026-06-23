# Cognitive Models for Possibility Generation

This file contains mental models and heuristics for Phase 2 of possibility analysis — the divergent phase where the goal is to expand the space of what is considered.

---

## Inversion

Instead of asking "how do we achieve X?", ask "what would guarantee we fail to achieve X?" Then invert the answers.

This works because the human mind is better at finding failure modes than at generating creative solutions. Inversion converts a generative problem (hard) into a diagnostic problem (easier), then reverses the findings.

**Application**: List every way the current approach could go wrong. Each failure mode implies a design constraint or alternative path.

---

## Constraint Relaxation

Take the binding constraint and ask: "What becomes possible if this constraint did not exist?"

Then ask: "What would it cost to actually relax this constraint? Is the cost worth the options it opens?"

This is especially powerful for **assumed constraints** — things that are treated as fixed but have never been verified. A significant fraction of stated constraints in engineering and organizational decisions are historical artifacts, not physical laws.

**Categories of constraints to test:**
- Time ("we need this in Q2") — is Q2 a market reality or an internal deadline?
- Technology ("we're on AWS") — is this a strategic commitment or a default?
- Scope ("this is a feature in service X") — does it have to be?
- Team ("only our team can touch this") — does it have to be?
- Budget ("we have $X") — is this a hard cap or an estimate?

---

## Analogical Reasoning

Find a domain that has solved a structurally similar problem and ask: "How did they do it, and what translates?"

The key is **structural similarity**, not surface similarity. A logistics problem and a distributed systems consistency problem may be structurally similar even though the domains look nothing alike.

**Steps:**
1. Abstract the problem to its structure ("we have a coordination problem between N actors with asymmetric information")
2. Find domains that have solved that abstract problem (markets, biology, game theory, military logistics, etc.)
3. Translate the solution mechanism back into the specific domain

**Danger**: Cargo-cult analogies that copy surface features without understanding the mechanism. Always ask "why did this work in that domain?" before applying it.

---

## Decomposition and Recomposition

Break the problem into its components, then recombine them differently.

Many solutions are stuck because they treat a bundle of concerns as atomic. Decomposition reveals which sub-problems can be solved independently, in different orders, or by different actors.

**Decomposition axes:**
- **Temporal**: What happens first, and what depends on what?
- **Spatial**: What is co-located, and what could be distributed?
- **Ownership**: Who does what, and is that the only valid assignment?
- **Coupling**: What is bundled together that could be separated?

After decomposition, recompose in non-standard ways. Often the novel solution is an unconventional recombination of known components.

---

## The Null Option

Always include "do nothing" or "accept the current state" as an explicit option — not as a dismissal, but as a genuine alternative with its own profile.

The null option serves as a **baseline** against which all other options are measured. If no alternative beats the null option on the dimensions that matter, the right answer may be inaction.

The null option also reveals what the cost of inaction actually is — which is often unstated and underestimated.

---

## Scope Shifting

Ask whether the problem is being solved at the right level of abstraction.

- **Zoom out**: Is there a higher-level solution that makes this problem irrelevant? (Dissolving the problem rather than solving it)
- **Zoom in**: Is the stated problem actually a symptom? Is there a more fundamental fix?

**Example of zooming out**: A team struggling with slow deployment might be trying to optimize a CI pipeline. Zoomed out: the real problem is slow feedback cycles. A feature flag system might be a better solution than faster CI.

**Example of zooming in**: A team struggling with "too many bugs in production" might be trying to improve QA. Zoomed in: the bugs cluster in one module written by one engineer who left. The real problem is a knowledge silo.

---

## Real Options Thinking

Some decisions are not binary choices — they are **options to be acquired or exercised**.

A real option is: pay a small cost now to preserve the right (not obligation) to take a path later, contingent on new information.

**When to think in options:**
- When uncertainty is high and will resolve with time
- When the cost of reversing a decision is high
- When timing matters — being early has costs, being late has costs

**Implication**: "Let's run a small experiment" is often the right possibility — not as delay, but as a deliberate option acquisition. You buy information, then decide.

---

## Second-Order Thinking

Ask not just "what will this option cause?" but "what will that cause cause?"

First-order thinking: "If we migrate to a microservices architecture, we get better scalability."
Second-order thinking: "Better scalability will increase deployment frequency, which requires better observability, which requires tooling investment, which requires team capacity that we don't currently have."

Second-order effects frequently reverse first-order conclusions. A solution that looks clearly better in the first-order can be clearly worse in the second-order.

**Practice**: For each option, trace the causal chain at least two steps forward. Look for feedback loops, unintended consequences, and second-order costs.

---

## Reversibility Classification

Classify each option by reversibility before evaluating it. This is a constraint on risk, not on quality.

- **Fully reversible**: Can be undone at low cost (e.g., feature flags, A/B tests, soft migrations)
- **Partially reversible**: Can be undone but with significant cost or delay (e.g., database migrations, organizational restructuring)
- **Irreversible**: Cannot be undone or the cost is prohibitive (e.g., public API commitments, certain vendor lock-ins, data deletion)

Jeff Bezos called these Type 1 (irreversible) and Type 2 (reversible) decisions. The key insight: **treat them differently**. Irreversible decisions warrant much more careful analysis; reversible decisions warrant faster execution.

**Application**: When options cluster at similar quality, prefer the more reversible one. Reserve irreversible commitments for cases where confidence is high.
