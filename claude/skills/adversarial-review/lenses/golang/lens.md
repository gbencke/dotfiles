---
name: golang
description: Go best practices — error handling, goroutine/channel safety, defer, slices, idiomatic structure (Effective Go, Go Code Review Comments, 100 Go Mistakes).
signals:
  - "*.go"
  - "go.mod"
---

# golang lens

Applies to chunks containing `.go` files (or a repo with `go.mod`).
Sources distilled from Effective Go, go.dev/wiki/CodeReviewComments,
Google + Uber style guides, and 100 Go Mistakes. Formatting (gofmt owns
it) and import grouping are out of scope.
