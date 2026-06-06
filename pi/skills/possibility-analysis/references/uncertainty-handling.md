# Uncertainty Handling in Possibility Analysis

This file addresses how to conduct rigorous possibility analysis when information is incomplete, ambiguous, or genuinely unknowable. Standard analysis assumes enough is known to evaluate options. This reference covers what to do when that assumption breaks down.

---

## Taxonomy of Uncertainty

Before choosing how to handle uncertainty, classify it:

| Type | Description | Example | Appropriate Response |
|---|---|---|---|
| **Known unknowns** | We know what we don't know | "We don't yet know the vendor's SLA" | Identify resolution path; stage the decision |
| **Unknown unknowns** | We don't know what we don't know | Emerging tech with no track record | Pre-mortem; build in reversibility |
| **Aleatory uncertainty** | Irreducible randomness | Market timing, hardware failure rates | Model statistically; design for resilience |
| **Epistemic uncertainty** | Reducible through information | Competitor strategy, user behavior | Buy information (research, experiments, probes) |
| **Ambiguity** | The question itself is unclear | "What does success mean here?" | Reframe before proceeding |

The most dangerous mistake is treating epistemic uncertainty (which can be resolved) as aleatory (which cannot). This leads to accepting preventable ignorance as fate.

---

## Decision Staging

When uncertainty is high and will resolve with time, the right possibility is often **not to decide yet** — but in a disciplined way.

### Structure of a Staged Decision

1. **Identify the resolution point**: What specific information, when known, would shift which option dominates?
2. **Set the trigger condition**: Define what observable event or data point constitutes "now we know enough"
3. **Choose the cheapest option that preserves optionality until the resolution point**
4. **Set a deadline for forced decision**: Even under uncertainty, avoid infinite deferral

**Example**: Choosing between two database architectures when workload characteristics are unknown. Resolution point: 3 months of production load data. Staged decision: deploy the more flexible option behind an abstraction layer; commit to the specialist option only after the data is in.

### Cost of Waiting vs. Cost of Deciding Wrong

Always compare:
- Cost of waiting (foregone value, opportunity cost, decision fatigue)
- Expected cost of deciding wrong (reversibility cost × probability of being wrong)

If Cost(waiting) < Expected cost(wrong decision), defer.

---

## Real Options in Engineering Decisions

A real option is a right — but not obligation — to take a future action. Options have value when:
- Uncertainty is high (the option pays off if things go one way but not another)
- Time will resolve the uncertainty
- The option cost is low relative to the potential payoff

### Common Real Options in Software Systems

**The Architecture Option**: Design the system to make a future change cheap. Example: build behind an interface now (small cost) so the underlying implementation can be swapped later (avoiding large future cost if your current choice proves wrong).

**The Experiment Option**: Run a small test before committing. Pay a known small cost to learn, then decide. Particularly valuable when the key question is about demand or user behavior.

**The Delay Option**: Defer commitment until a forcing function arrives. The market, regulation, or technology may resolve the uncertainty without any active decision.

**The Abandonment Option**: Design a system or initiative so it can be stopped cleanly if early signals are bad. Modularity, kill switches, and clean contracts all preserve abandonment options.

### When Options Are Cheap, Buy Them

If the cost of preserving optionality is small relative to the decision stakes, the right possibility is almost always: pay the option cost. This is not indecision — it is rational risk management.

---

## Pre-Mortem Analysis

Developed by Gary Klein. Project forward to a hypothetical failure: "It is 12 months from now. We chose Option X and it has failed significantly. Write the story of how it happened."

This technique works because:
- It removes social pressure to remain positive about a chosen option
- It activates different cognitive modes (diagnostic rather than projective)
- It surfaces failure modes that are visible only in hindsight

### How to Run a Pre-Mortem in Possibility Analysis

For each option in the viable frontier:

1. Assume the option was implemented and failed
2. Generate the 3 most plausible failure narratives
3. For each narrative, ask: "Was this foreseeable? Could it have been mitigated?"
4. Update the option's risk profile based on findings
5. If a failure mode appears across multiple options, surface it as a systemic risk

Pre-mortems often reveal that what looked like an implementation risk is actually a framing risk — the option was solving the wrong problem.

---

## Sensitivity Analysis

When recommendations depend on uncertain inputs, test how sensitive the recommendation is to changes in those inputs.

### Simple Sensitivity Test

For the recommended option, identify the 2–3 most load-bearing assumptions. Then ask: "If this assumption is wrong by 2×, does the recommendation change?"

If the recommendation is robust to 2× error in key assumptions: high confidence.
If the recommendation flips with even modest error: low confidence; the analysis is sensitive, and that should be stated explicitly.

**Example**: Recommending a serverless architecture based on estimated monthly invocations of 10M. If actual usage is 50M (5× error), the cost profile is dramatically different. The recommendation is sensitive to this assumption; it should be stated and monitored.

---

## Minimum Viable Analysis

When speed matters and full analysis is not possible, prioritize:

1. **Identify the one most load-bearing uncertainty** — the thing you most don't know that most affects the decision
2. **Find the cheapest way to resolve it** — spike, prototype, conversation, research
3. **Make the most reversible decision that doesn't foreclose options** while awaiting resolution
4. **Set a decision deadline** — uncertainty is not permission for indefinite delay

This is not cutting corners. It is concentrating analysis resources where they have the highest marginal value.

---

## Epistemic Honesty Standards

Possibility analysis is only useful if uncertainty is represented honestly. Apply these standards:

**State confidence levels explicitly.** "This will work" and "this might work if X" are different claims. Say which one you mean.

**Name the key assumptions.** Every recommendation rests on assumptions. Surface the top 3 explicitly. If any assumption is wrong, state which conclusions would change.

**Distinguish analysis from advocacy.** When presenting possibilities, separate the role of map-maker (here are the options, here are the tradeoffs) from the role of advisor (here is what I recommend, and why). Conflating them leads to biased maps.

**Prefer narrow confident claims over broad uncertain ones.** "Option A is faster to implement given current team capacity" is more useful than "Option A is better." The former is verifiable; the latter is vague.

**Acknowledge when you don't know.** "The right answer here depends on X, which I don't have enough context to judge" is a legitimate and useful output of analysis. False precision is worse than acknowledged uncertainty.
