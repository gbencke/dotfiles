# Development Guidelines

## Philosophy

### Core Beliefs

- **Incremental progress over big bangs** - Small changes that compile and pass tests
- **Learning from existing code** - Study and plan before implementing
- **Pragmatic over dogmatic** - Adapt to project reality
- **Clear intent over clever code** - Be boring and obvious

### Simplicity Means

- Single responsibility per function/class
- Avoid premature abstractions
- No clever tricks - choose the boring solution
- If you need to explain it, it's too complex

## Technical Standards

### Architecture Principles

- **Composition over inheritance** - Use dependency injection
- **Interfaces over singletons** - Enable testing and flexibility
- **Explicit over implicit** - Clear data flow and dependencies
- **Test-driven when possible** - Never disable tests, fix them

### Error Handling

- Fail fast with descriptive messages
- Include context for debugging
- Handle errors at appropriate level
- Never silently swallow exceptions

## Decision Framework

When multiple valid approaches exist, choose based on:

1. **Testability** - Can I easily test this?
2. **Readability** - Will someone understand this in 6 months?
3. **Consistency** - Does this match project patterns?
4. **Simplicity** - Is this the simplest solution that works?
5. **Reversibility** - How hard to change later?

## Quality Gates

### Definition of Done

- [ ] Tests written and passing
- [ ] Code follows project conventions
- [ ] No linter/formatter warnings
- [ ] Commit messages are clear
- [ ] Implementation matches plan
- [ ] No TODOs without issue numbers

### Test Guidelines

- Test behavior, not implementation
- One assertion per test when possible
- Clear test names describing scenario
- Use existing test utilities/helpers
- Tests should be deterministic

## Writing Guidelines

### Core Principles (Zinsser Method)
**Brevity is power.** Strip every sentence to its cleanest components. Remove every word that serves no function. Replace phrases with words. Choose simple words over complex ones.

### Clutter Elimination
- Cut qualifiers: "very", "quite", "rather", "somewhat", "pretty much"
- Remove redundant pairs: "each and every", "first and foremost", "various and sundry"
- Eliminate throat-clearing: "It is important to note that", "The fact that"
- Avoid inflated phrases: Use "now" not "at this point in time"
- Delete meaningless jargon: "utilize" → "use", "implement" → "do"

### Business Writing Rules
- Lead with the result, not the process
- Use active voice: "We fixed the bug" not "The bug was fixed"
- Write for the reader who knows nothing about your work
- State conclusions first, then explain if needed
- One idea per sentence, one topic per paragraph

### Technical Documentation
- Start with what it does, not how it works
- Use concrete examples over abstract descriptions
- Write instructions as commands: "Run tests" not "You should run tests"
- Assume intelligence but not knowledge
- Test your writing: Can someone follow it without you there?

### Code-Related Writing
- Variable names are sentences: make them clear, not clever
- Error messages should tell users what to do next
- Documentation should answer "why", code shows "what"
- PR descriptions: State changes and impacts, skip the journey
- Commit messages: What changed and why, in present tense

### The Zinsser Test
Before committing any written text, ask:
1. Can I cut this sentence in half?
2. Is there a simpler word?
3. Does the reader need to know this?
4. Am I saying this twice?

Remember: Clear writing is clear thinking. If you can't write it simply, you don't understand it well enough.

## PR Creation Guidelines
1. Make sure to remove any mention to Claude in the PR Description
2. DEscribe in detail thje changes made 

