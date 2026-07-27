---
name: typescript
description: TypeScript best practices — type safety, unsafe escape hatches, async correctness, idiomatic types.
signals:
  - "*.ts"
  - "*.tsx"
  - "tsconfig.json"
---

# typescript lens

Applies to chunks containing `.ts`/`.tsx` files (or a repo with
`tsconfig.json`). Reviews type-system misuse and async correctness — the
defects that compile clean and fail in production. Style-only nits that a
formatter or linter owns (semicolons, import order) are out of scope.
