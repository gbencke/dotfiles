# reactjs rules — React semantics that fail at runtime

## Hooks rules violations (React will throw, sometimes only in Strict Mode)

- **Conditional hook call** — `if (condition) { useState(...) }` or any hook
  inside an `if`/ternary/`&&`: breaks the internal hooks array on
  re-renders. Hooks must be called in the same order every render.
  `react#conditional-hook`
- **Hook in loop** — `for`/`while`/`.map` containing a hook call: same
  issue, hook count/order changes. `react#hook-in-loop`
- **Hook in nested function** — `useState`/`useEffect` inside a callback,
  event handler, or helper function (not a custom hook): hooks only work at
  component top level. `react#hook-in-nested-function`
- **Hook in class component** — hooks called inside a class component body
  or lifecycle method: hooks are function-only. `react#hook-in-class`
- **Hook in regular function** — hook called in a function that isn't a
  component (no JSX return, lowercase name, not passed to React): React
  can't track it. `react#hook-in-non-component`
- **Early return before hooks** — `if (x) return null;` followed by
  `useState(...)`: hook count changes when condition flips.
  `react#early-return-before-hooks`

## useEffect / useLayoutEffect correctness (the #1 source of production bugs)

- **Missing effect cleanup** — effect creates a subscription, timer,
  listener, connection, or AbortController and doesn't return a cleanup
  function: memory leaks, duplicate listeners, stale subscriptions after
  unmount or re-render. `react#missing-effect-cleanup`
- **Effect with stale closure** — effect reads a prop/state without listing
  it in dependencies: runs with the old value, updates the wrong thing, or
  calls a stale callback. ESLint exhaustive-deps will flag this.
  `react#stale-effect-closure`
- **Empty dependency array when values are used** — `useEffect(() => { ...
  props.foo }, [])`: runs once with initial `foo` and never again, even
  when `foo` changes. Effect will use stale value forever.
  `react#missing-effect-deps`
- **Effect mutating a ref read during render** — component renders with
  `ref.current`, then an effect writes it: the next render sees a new value
  but React doesn't know to re-render. Use state, not a ref.
  `react#effect-mutating-rendered-ref`
- **Effect race condition** — async effect (fetch, timeout) without cleanup
  checking if still mounted / if inputs changed: the effect from render N
  completes after render N+1, overwriting the UI with stale data.
  `react#effect-race-condition`
- **Unnecessary effect** — effect updates state immediately in response to
  prop change (derived state), or runs once on mount doing something that
  should be inline initialization. `react#unnecessary-effect`
- **Effect that should be an event handler** — effect with empty deps doing
  work that belongs in a click/submit handler: runs on every render or only
  mount, bypassing the user action. `react#effect-not-event`
- **useLayoutEffect blocking the paint** — `useLayoutEffect` with expensive
  sync work or `await`: blocks the browser paint. Use `useEffect` unless
  measuring/mutating DOM. `react#blocking-layout-effect`
- **No AbortController for fetch** — `fetch` in effect without an
  AbortController cleanup: request completes after unmount, tries to
  `setState` on unmounted component. `react#fetch-no-abort`

## Dependency arrays (useEffect, useCallback, useMemo)

- **Object/array literal in dependencies** — `useEffect(..., [{ x }])` or
  `[arr]`: new reference every render, infinite loop. Extract to ref or
  state. `react#literal-in-deps`
- **Function in dependencies without useCallback** — function defined in
  component body added to deps: new function every render, effect runs
  every time. Wrap it in `useCallback`. `react#function-in-deps`
- **Missing primitive dependency** — primitive (string, number, boolean) or
  stable reference used in effect but not in array: stale value.
  `react#missing-primitive-dep`
- **Unnecessary dependency causing extra runs** — value in array that
  doesn't affect the effect's behavior: effect runs more than needed, may
  cause performance issues. `react#unnecessary-dep`

## State management anti-patterns

- **Derived state in useState** — `useState(computeFromProps(props))` or
  effect syncing state to props: state and props drift, extra renders. Use
  a variable or `useMemo`. `react#derived-state`
- **State for values that don't need renders** — `useState` for a value
  never rendered, only read in callbacks: causes unnecessary re-renders.
  Use `useRef`. `react#state-for-non-rendered`
- **Multiple setState calls causing batching issues** — multiple `setState`
  in an async callback or native event (outside React's event system):
  causes multiple renders in React <18, may still be inefficient.
  `react#unbatched-updates`
- **State mutation instead of replacement** — `setState(arr.push(x))` or
  `setState({...obj, obj.nested.x = y})`: React compares references, sees
  same object, doesn't re-render. `react#state-mutation`
- **Previous state ignored in updater** — `setState(count + 1)` instead of
  `setState(c => c + 1)` when called multiple times in quick succession:
  reads stale value, some updates lost. `react#setState-race`
- **useState for server state** — local state holding API data without
  error/loading states, refetch logic, or cache: should use
  React Query/SWR/RTK Query. `react#manual-server-state`
- **Props as initial state only** — `useState(props.value)` where changes
  to `props.value` should update the component: initial value is captured,
  prop updates ignored. `react#props-as-initial-state-only`

## Performance and unnecessary re-renders

- **Inline function in JSX prop** — `<Child onClick={() => ...} />` or
  `<Child render={() => ...} />`: new function every render, `Child`
  re-renders even with `React.memo`. Wrap in `useCallback` or extract.
  `react#inline-function-prop`
- **Inline object/array in JSX prop** — `<Child config={{ x }} />` or
  `items={[...]}`: new reference every render, breaks memoization. Extract
  or `useMemo`. `react#inline-object-prop`
- **Missing React.memo on expensive leaf** — pure component receiving same
  props but re-rendering because parent re-renders: wrap in `memo()`.
  `react#missing-memo`
- **Memoization without appropriate deps** — `useMemo(() => expensive(),
  [])` but uses props/state: returns stale value. Or `useMemo` with deps
  that change every render (objects/arrays): no benefit, just overhead.
  `react#broken-memoization`
- **Context causing global re-renders** — single context value holding
  multiple unrelated fields, consumer re-renders when any field changes.
  Split contexts or use selectors. `react#monolithic-context`
- **Large component doing too much** — component with 10+ hooks, multiple
  concerns, long render: hard to optimize, re-renders everything when
  anything changes. `react#component-too-large`

## Keys and lists

- **Missing key prop in list** — `.map` returning elements without `key`:
  React can't track identity, causes bugs on reorder/insert/delete.
  `react#missing-key`
- **Index as key when order changes** — `key={i}` where list can be
  filtered, sorted, or items inserted: React reuses wrong DOM nodes, state
  attaches to wrong items. `react#index-as-key`
- **Non-unique keys** — duplicate `key` values in same list: React can't
  distinguish elements, state corruption. `react#non-unique-keys`
- **Key on wrapper instead of element** — `<Fragment key={id}>` or `<div
  key={id}>` wrapping the actual repeated element instead of on the mapped
  component itself. `react#key-on-wrong-element`

## Refs correctness

- **Reading ref.current during render** — `const x = ref.current` or `if
  (ref.current)` in component body: render phase should be pure, ref
  mutations are side effects. `react#ref-read-during-render`
- **Writing ref.current during render** — `ref.current = x` in component
  body: same issue, plus React may call render multiple times.
  `react#ref-write-during-render`
- **useRef instead of useState when UI depends on value** — `ref.current =
  x` then render using `ref.current`: changing ref doesn't trigger
  re-render, UI stays stale. `react#ref-for-rendered-value`
- **Callback ref leaking old values** — callback ref `(node) => { ...
  outerScope }` without dependencies: closure captures old props/state.
  `react#callback-ref-stale-closure`
- **forwardRef not used when passing ref to DOM** — custom component
  receiving `ref` prop without `forwardRef`: ref is ignored, doesn't attach
  to DOM node. `react#missing-forwardRef`
- **String refs** — `ref="myRef"` (legacy): deprecated, removed in future
  React. `react#string-ref`

## Event handling

- **Event handler calling preventDefault in async callback** — `async
  onClick` with `await`, then `e.preventDefault()`: event is nullified,
  throws. Call `preventDefault()` synchronously. `react#async-preventdefault`
- **Event object used after async boundary** — `e.target` read after
  `await`: event pooling (React <17) or nullification causes error. Read
  needed properties before async work. `react#event-after-async`
- **Event handler with stale closure** — handler inline or in `useCallback`
  with missing deps: runs with old props/state. `react#stale-handler-closure`

## JSX correctness and rendering pitfalls

- **Boolean in JSX expression rendering "false"** — `{count && <div>}`:
  when `count` is `0`, renders "0" instead of nothing. Use `{count > 0 &&
  ...}` or `{count ? ... : null}`. `react#boolean-rendering-zero`
- **Array.map without null check** — `{items.map(...)}` where `items` can
  be `null`/`undefined`: runtime error. Guard with `items?.map` or
  `items?.length`. `react#map-on-null`
- **Ternary returning undefined** — `{condition ? <A /> : undefined}`:
  React renders nothing, but explicit `null` is clearer.
  `react#undefined-render`
- **Dangerously setting HTML without sanitization** — `dangerouslySetInnerHTML`
  with user input or API response not sanitized: XSS. Use DOMPurify or a
  markdown library. `react#dangerouslySetInnerHTML-xss`
- **Adjacent JSX text and expression without space** — `<div>Hello{name}</div>`:
  renders "Helloworld" instead of "Hello world". Add space in text or wrap.
  `react#jsx-missing-space`

## Context misuse

- **Prop drilling instead of context** — passing prop through 3+ levels of
  components that don't use it: maintenance burden, unnecessary re-renders.
  `react#prop-drilling`
- **Context for frequently changing value** — context holding fast-changing
  state (input value, mouse position): all consumers re-render on every
  change. Use state colocation or external store. `react#high-frequency-context`
- **Default context value that could be undefined** — `createContext({
  data: null })` but some components assume `data` exists: crashes on first
  render before Provider mounts. `react#unsafe-context-default`

## Component design and API

- **Component with boolean props** — `<Button primary secondary disabled />`
  where only one should be true: use a `variant` string prop.
  `react#boolean-props`
- **Render prop + children together** — component accepting both
  `children` and `render`/`renderX`: confusing API, one should win.
  `react#render-prop-and-children`
- **Children when slot props are meant** — `children` used for multiple
  distinct areas: ambiguous. Use named `header={...}` `footer={...}` props.
  `react#children-as-multiple-slots`
- **Optional callback prop without default noop** — `onClick?.()` called
  everywhere: use default `onClick = () => {}` in destructure.
  `react#callback-optional-noise`
- **Component returning different types conditionally** — sometimes returns
  a component, sometimes `null`, sometimes a fragment: confusing TS types.
  Always return JSX or `null`. `react#inconsistent-return-type`

## TypeScript-specific React issues (cross-reference with typescript lens)

- **any in component props** — `props: any` or `children: any`: disables
  checking at the component boundary. `react#any-props`
- **Untyped children** — `children` prop without `ReactNode` /
  `ReactElement` type. `react#untyped-children`
- **Event handler with wrong event type** — `onClick: (e: Event)` instead
  of `React.MouseEvent`, or `onChange: any`: loses type checking.
  `react#wrong-event-type`
- **Component returning JSX Element instead of ReactElement/JSX.Element** —
  incorrect return type, may fail with some type configurations.
  `react#wrong-jsx-return-type`
- **Generic component without proper type inference** — `<List<T>>` that
  doesn't infer `T` from props, forcing users to always specify it.
  `react#generic-no-inference`

## React 18+ specific (concurrent features)

- **useTransition misuse** — `startTransition` wrapping non-urgent state
  updates but the update is actually urgent (form submission, navigation):
  delays feedback. `react#wrong-transition-use`
- **useDeferredValue on frequently changing input** — `useDeferredValue(searchQuery)`
  where query updates every keystroke: creates lag without batching benefit.
  Throttle/debounce instead. `react#deferred-high-frequency`

## Server Components / Next.js (when detected)

- **async Client Component** — `"use client"` component with `async
  function`: breaks, Client Components can't be async.
  `react#async-client-component`
- **useState/useEffect in Server Component** — hooks in a component without
  `"use client"` directive: Server Components can't use state/effects.
  `react#hook-in-server-component`
- **Importing Server Component into Client** — `"use client"` imports a
  component without the directive: breaks the server/client boundary, sends
  server code to client. `react#server-component-in-client`

## Class components (legacy, but still in scope if present)

- **Direct state mutation** — `this.state.x = y` instead of `setState`:
  doesn't trigger re-render. `react#class-state-mutation`
- **setState in render** — `this.setState` called during `render()`:
  infinite loop. `react#setState-in-render`
- **Binding issue** — event handler accessing `this` without binding in
  constructor or arrow function: `this` is undefined. `react#class-this-undefined`
- **componentWillMount / componentWillReceiveProps** — deprecated lifecycle
  methods: removed in future versions, unsafe with async rendering.
  `react#unsafe-lifecycle`

Severity: Hooks rules violations, missing effect cleanup, effect race
conditions, state mutation, `dangerouslySetInnerHTML` without sanitization,
event after async boundary, wrong server/client boundaries = **P0/P1**.
Stale closures, missing deps, derived state, index as key, ref correctness,
`any` in props, XSS risks = **P1**. Unnecessary re-renders, missing
memoization when needed, boolean props, prop drilling, untyped children =
**P2**. Inconsistent return types, `useMemo` without real perf benefit =
**P3**.

Findings must name the component, the specific hook or JSX, and the user
flow or re-render that triggers the defect. "Could cause issues" without a
concrete scenario dies to the challenger. "Missing `React.memo`" without
proof of an expensive render or hot re-render path is not a finding.
