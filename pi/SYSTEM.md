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
- [ ] Comments and file headers match the changed code

### Comments and File Headers

When you change a source file, update its comments and its file header in the same commit.

- **Comments:** Fix or delete every comment the change makes wrong (doc comments, inline comments, `shortcut:` notes). Keep each doc comment on the symbol it describes. If you move code, move its comments with it.
- **File header:** If the file starts with a header block (SUMMARY and CALL GRAPH), keep it current:
  - SUMMARY: rewrite it when the purpose of the file changes. Write it in ASD-STE100 (use the `asd-ste100` skill).
  - CALL GRAPH: when you add, remove or rename a symbol, or change what it calls, update its tree. Also update the trees in the other files that call it.
- New source file in a repo that uses these headers: add a header in the same format.
- Before calling the work done, read the header and comments of each changed file against the code.

### Test Guidelines

- Test behavior, not implementation
- One assertion per test when possible
- Clear test names describing scenario
- Use existing test utilities/helpers
- Tests should be deterministic

### TypeScript / JavaScript

Write TS/JS to pass the `pinned-eslint` skill from the first draft.

- Before writing any TS/JS, read the pinned-eslint `SKILL.md`, section "Write code that passes", and follow it.
- Before calling the work done, run pinned-eslint on the changed files and fix every error. Never add `eslint-disable` or raise a limit.
- If the repo's own ESLint or Prettier config conflicts (e.g. a wider line length), follow the repo and say so.

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
2. Describe in detail the changes made 

## Commit Creation Guidelines
1. Make sure to remove any mention to Claude in the PR Description
2. Describe in detail the changes made 

## External Systems

* Use JIRA_TOKEN and JIRA_EMAIL to access JIRA Ticket and Confluence
* When running any script, it can be python or shell, always prefer run in the background with nohup and keep tailing it with a timeout
* Do not run scripts without a clear tool timeout




