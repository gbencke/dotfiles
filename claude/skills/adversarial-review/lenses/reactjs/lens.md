---
name: reactjs
description: React correctness — hooks rules, dependency arrays, effect misuse, render-phase side effects, stale closures, key/ref correctness, unnecessary re-renders.
signals:
  - "*.jsx"
  - "*.tsx"
  - "package.json:react"
  - "import React"
  - "from 'react'"
  - "from \"react\""
---

# reactjs lens

Applies to chunks containing `.jsx`/`.tsx` files (or `package.json` with
`react` dependency). Reviews React-specific defects — code that compiles,
passes a happy-path test, and fails in production: hooks rules violations,
stale closures, missing effect cleanup, race conditions, unnecessary
re-renders, incorrect keys. The runtime errors that only appear under
specific user flows or when components unmount.

Out of scope: formatting/import order (Prettier/ESLint own them), generic
N+1 queries (performance lens), type-system escape hatches that aren't
React-specific (typescript lens), accessibility basics (a11y deserves its
own lens). In scope: the defects that exist *because* of React's rules and
mental model.
