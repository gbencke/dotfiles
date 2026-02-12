# Python Code Review Checklist (3.12+)
*Based on Zinsser's principles: Clarity, Simplicity, Brevity, Humanity*

## 1. **Conceptual Clarity**
**First Principle: Code should reveal intent, not obscure it**

- [ ] Does the code express *what* it does before *how* it does it?
- [ ] Are abstractions at the right level? (Not too generic, not too specific)
- [ ] Can you understand the business logic without reading implementation details?
- [ ] Does naming reveal purpose rather than implementation?

## 2. **Type System Coherence**
**First Principle: Types document contracts and enable reasoning**

- [ ] Are generic types (`type` aliases, PEP 695) used to express reusable abstractions?
- [ ] Do TypedDict patterns match actual data shape contracts?
- [ ] Are variance annotations (covariant/contravariant) used where substitution matters?
- [ ] Does the type system prevent impossible states at compile time?
- [ ] Are `Never`, `NoReturn`, and exhaustiveness checking used to prove completeness?

## 3. **Resource Lifecycle**
**First Principle: Acquire late, release early, make lifetimes explicit**

- [ ] Are context managers used for all resource acquisition?
- [ ] Is async context management (`async with`) used for async resources?
- [ ] Are resource lifetimes bounded and obvious from structure?
- [ ] Do generators/iterators express lazy evaluation where appropriate?

## 4. **Error Handling Philosophy**
**First Principle: Errors are type information; exceptions are control flow**

- [ ] Are exception groups (`ExceptionGroup`, 3.11+) used for concurrent failures?
- [ ] Does each function have a clear error contract (what exceptions, when)?
- [ ] Are sentinel values avoided in favor of `Optional[T]` or exceptions?
- [ ] Do error messages provide actionable context?
- [ ] Are errors caught at the right abstraction boundary?

## 5. **Composition Over Complexity**
**First Principle: Small, composable pieces beat large, monolithic structures**

- [ ] Are functions pure where possible (same input → same output)?
- [ ] Is state mutation isolated and explicit?
- [ ] Do data structures use immutability by default (`frozenset`, `tuple`, dataclasses(frozen=True))?
- [ ] Are pattern matching (`match`/`case`) used to decompose complex conditionals?
- [ ] Can this be expressed as a pipeline of transformations?

## 6. **Performance Characteristics**
**First Principle: Know your algorithm's complexity; optimize when measured**

- [ ] Is algorithmic complexity appropriate for the problem scale?
- [ ] Are comprehensions/generator expressions used over manual loops for data transformation?
- [ ] Is eager evaluation (`list()`) vs lazy evaluation (`iter()`) chosen deliberately?
- [ ] Are structural pattern matching patterns ordered by frequency?
- [ ] Have actual bottlenecks been profiled before optimization?

## 7. **Concurrent Execution Model**
**First Principle: Make concurrent state explicit; isolate shared mutable state**

- [ ] Is async/await used for I/O-bound concurrency?
- [ ] Are task groups (`asyncio.TaskGroup`, 3.11+) used for structured concurrency?
- [ ] Is shared state protected by appropriate synchronization primitives?
- [ ] Can this be expressed without shared state (message passing, immutability)?
- [ ] Are race conditions prevented by design, not by luck?

## 8. **Testing as Specification**
**First Principle: Tests document contracts; they are executable specifications**

- [ ] Do tests express *what* should happen, not *how* it's implemented?
- [ ] Are property-based tests used for universal invariants?
- [ ] Do tests cover edge cases and boundary conditions conceptually?
- [ ] Can tests serve as usage examples?

## 9. **Dependency Direction**
**First Principle: Depend on abstractions; point toward stability**

- [ ] Do high-level modules avoid depending on low-level details?
- [ ] Are protocols (`Protocol`) used to define behavioral contracts?
- [ ] Can modules be tested in isolation?
- [ ] Is the dependency graph acyclic?

## 10. **Evolution and Deprecation**
**First Principle: Code should be easy to change correctly**

- [ ] Are backwards-incompatible changes flagged with `warnings.warn(DeprecationWarning)`?
- [ ] Do public APIs have stable type signatures?
- [ ] Can implementation change without affecting callers?
- [ ] Is versioning semantic and meaningful?

---

## The Zinsser Question
*Before approving any code, ask:*

**"If I read this six months from now, will I understand *why* it exists, not just *what* it does?"**

If the answer is no, the code needs revision—not comments, but better structure.
