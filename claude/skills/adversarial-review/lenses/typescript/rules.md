# typescript rules — type safety and async correctness

## Escape hatches (the compiler is off here — every use is a finding candidate)

- **`any`** — in annotations, generics (`Array<any>`), or leaking from
  untyped calls (`JSON.parse` returns `any` — assign it to a typed variable
  or validate at the boundary). `unknown` is the honest top type; `any`
  disables checking on everything it touches. `ts#any`
- **Unsafe assertions** — `x as T` where the value isn't provably `T`;
  double assertions `x as any as T` (always a lie, never justified);
  asserting API/IO responses instead of validating them. Parse at the
  boundary, then let types flow. `ts#unsafe-assertion`
- **Non-null `!`** — `foo!.bar` where the null case is reachable (array
  lookup, map get, DOM query, optional field). If the invariant is real,
  assert with a thrown error that names it; `!` fails silently as
  `undefined is not an object`. `ts#non-null-bang`
- **`@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`** without a comment
  stating the reason. Suppressed errors hide the defect the compiler found.
  `ts#ts-ignore`

## Type modeling

- **Assertion instead of discriminated union** — switching on a shape via
  `as` chains instead of a `kind`/`type` tag union with `never`-exhaustive
  switch. Add a variant later and nothing fails to compile.
  `ts#missing-discriminated-union`
- **Boolean/flag parameters** — `doThing(x, true, false)` where the call
  site is unreadable; use an options object with named fields.
  `ts#boolean-trap`
- **Stringly-typed APIs** — parameters accepting `string` where a union of
  literals (`'read' | 'write'`) or an enum models the real domain.
  `ts#stringly-typed`
- **Duplicated inline types** — the same object shape written inline in 2+
  places instead of one named `interface`/`type` (they will drift).
  `ts#inline-type-drift`
- **`Function`/`object` types** — the capital-F/empty types that accept
  nearly everything; name the signature/shape. `ts#vague-type`

## Async correctness (compile-clean, production-red)

- **Floating promises** — an async call not awaited/returned/`void`-ed in
  a context where its completion or rejection matters. Unhandled rejections
  become unobserved failures. `ts#floating-promise`
- **forEach with async callback** — `arr.forEach(async …)` runs everything
  concurrently and nothing awaits it; `for…of` for sequential,
  `Promise.all(arr.map(...))` for concurrent. `ts#async-forEach`
- **Missing error path on awaited IO** — await inside try/catch that
  swallows, or no catch at all on a call whose rejection is a real scenario
  (cross-reference error-handling lens; report here only the async-shape
  part). `ts#unhandled-rejection`
- **`Promise<any>`** — async function without a return type where the
  resolved value is untyped. `ts#untyped-promise`

## Idiomatic modern TS

- Missing optional chaining/nullish coalescing where `&&` ladders or `||`
  misuse falsy values (`count || 0` is fine; `count || default` when `0` is
  valid is a bug — use `??`). `ts#falsy-default`
- `var`, or `let` never reassigned (use `const`). `ts#var-let`
- Type imports not marked `import type` when the repo uses
  `isolatedModules`/verbatim module syntax. `ts#type-import`

Severity: `as any as T` and boundary-assertion on IO = P1 (the type system
is off exactly where untrusted data enters). `any` leakage into exported
API = P1. Local escape hatches with a reachable null/failure = P1, else P2.
Idiomatic items = P3.
