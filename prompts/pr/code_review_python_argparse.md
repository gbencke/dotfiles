# Reviewing Modern Command-Line Argument Passing in Python

*A Zinsser-method checklist — each item earns its place by being essential, not decorative.*

---

## Why Zinsser's Method Here?

Zinsser's core thesis: **every word must do work.** A CLI interface is the same contract — every flag, every positional argument must justify its existence. Clutter in prose confuses readers; clutter in a CLI confuses users. The checklist below applies that discipline to reviewing how a Python program receives instructions from the outside world.

---

## 1 · The Fundamental Contract

Before any library or technique, the first principle: a command-line interface is a **boundary** between the caller (human or script) and your program's internal logic. Review against that idea.

- [ ] **Is the boundary clean?** Raw input from `sys.argv` is an untyped list of strings. Does the code convert this into typed, validated domain objects as early as possible — or does it leak raw strings deep into business logic?
- [ ] **Is the interface the minimal sufficient surface?** Every argument you expose is a promise you maintain. Could any argument be removed, combined, or given a sensible default without losing capability?
- [ ] **Does it follow the Principle of Least Surprise?** Would a user familiar with Unix conventions (`-v`, `--verbose`, `--output FILE`) predict your interface without reading docs?

---

## 2 · The Parsing Strategy

Python offers a spectrum from manual to declarative. The conceptual question is: **where does the parsing knowledge live?**

- [ ] **Imperative vs. Declarative** — Is the argument structure *described* (declarative: argparse, typer) or *manually extracted* (imperative: `sys.argv` slicing)? Declarative parsers separate the *what* from the *how*, making the interface self-documenting.
- [ ] **Schema-first thinking** — Does the code define what it *expects* before it processes what it *received*? This is the same principle as API schema validation — declare the shape, then let the framework reject malformed input.
- [ ] **Single Responsibility** — Is argument parsing isolated from argument *consumption*? The parser should produce a clean data structure; business logic should never know it came from a CLI.

---

## 3 · Type Safety at the Boundary

The deepest conceptual shift in modern Python CLI tooling (typer, click) is moving type conversion from runtime string manipulation to **declared type annotations**.

- [ ] **Are types declared, not inferred?** A `--port` flag should be declared as `int`, not parsed as `str` and cast later. The earlier the type boundary, the earlier the error.
- [ ] **Are constraints expressed, not enforced?** Choices, ranges, file existence — are these declared as part of the argument definition, or scattered as `if` checks downstream? Constraints declared at the boundary are visible in `--help`; constraints hidden in code are invisible.
- [ ] **Are complex types composed?** If an argument represents something richer than a primitive (a date range, a connection string, a config object), is there a custom type or callback that converts at parse time?

---

## 4 · Subcommands as Domain Decomposition

Modern CLI tools (`git`, `docker`, `aws`) use subcommands. This is domain-driven design applied to the shell.

- [ ] **Does the command hierarchy mirror the domain model?** `myapp user create` is clearer than `myapp --action create --entity user` because nouns and verbs are in their natural positions.
- [ ] **Is shared context handled at the right level?** Global flags (like `--verbose` or `--config`) should live on the parent command. Subcommand-specific flags should live on the subcommand. This is the same scoping principle as variable scope in code.
- [ ] **Are subcommands independently testable?** Each subcommand should be callable as a function with typed arguments — the CLI layer is just one entry point.

---

## 5 · Defaults, Environment, and Configuration Layering

Arguments rarely come from one source. The conceptual model is a **layered override chain**.

- [ ] **Is the precedence chain explicit?** The standard order: hardcoded defaults → config file → environment variables → CLI arguments. Each layer overrides the previous. Is this order documented and consistent?
- [ ] **Are environment variables a first-class source?** Modern tools (typer, click) can bind `--database-url` to `DATABASE_URL` automatically. If your tool runs in containers or CI, env vars are often the *primary* interface, not the CLI.
- [ ] **Is the resolved configuration inspectable?** Can a user run `myapp config show` (or `--dry-run`) to see what values the program *actually* resolved after all layers merged? This is the observability principle applied to configuration.

---

## 6 · Help Text as Documentation Contract

Zinsser's deepest principle: **write for your reader, not yourself.** Help text is your CLI's documentation.

- [ ] **Does `--help` tell a story?** Not just a list of flags, but: what does this tool *do*, in one sentence? Then the flags. Zinsser would say: lead with purpose, follow with mechanics.
- [ ] **Are argument names self-explanatory?** `--output` over `--o`. `--retry-count` over `--rc`. Abbreviations save keystrokes but cost comprehension. Offer short aliases (`-o`) but name the canonical form for clarity.
- [ ] **Are examples included?** The best CLI help includes a `Examples:` section. One concrete invocation teaches more than ten lines of flag descriptions.
- [ ] **Is the epilog used for context?** argparse and click support epilog text — use it for "see also", links to docs, or common workflows.

---

## 7 · Error Messages as User Empathy

A bad error message is like bad prose — it forces the reader to re-read and guess.

- [ ] **Does the error say what went wrong AND what to do?** `"Missing required argument: --config"` is good. `"Error: None"` is hostile.
- [ ] **Are suggestions offered?** Modern CLIs suggest corrections: `"Unknown command 'stats'. Did you mean 'status'?"` This is the same principle as compiler error recovery.
- [ ] **Is the exit code meaningful?** `0` for success, non-zero for failure. Different failure modes should use different codes. Scripts that call your tool depend on this contract.

---

## 8 · Testability

- [ ] **Can the CLI be tested without invoking a subprocess?** If argument parsing produces a typed data structure (a dataclass, a Pydantic model, a named tuple), unit tests can construct that structure directly. The CLI is just one deserializer.
- [ ] **Are integration tests exercising the actual CLI entry point?** Click's `CliRunner` and typer's `CliRunner` exist for this — they simulate invocation without spawning a process.
- [ ] **Are edge cases covered?** Empty input, Unicode arguments, extremely long values, arguments that look like flags (`--name="--help"`).

---

## 9 · The Modern Python Landscape (Conceptual Map)

| Approach | Core Idea | When It Fits |
|---|---|---|
| `sys.argv` | Raw access, no abstraction | Tiny scripts, learning exercises |
| `argparse` | Declarative schema in stdlib | No external deps allowed, moderate complexity |
| `click` | Decorators as interface declarations | Composable, plugin-based CLIs |
| `typer` | Type hints *are* the schema | Python 3.10+, when type annotations drive design |
| `fire` | Introspection of existing code | Rapid prototyping, exposing functions as CLI |

The conceptual progression: from *"parse strings yourself"* → *"declare a schema"* → *"let the type system be the schema."* Each step moves knowledge from imperative code into declarative structure.

---

## The Zinsser Test

Read your CLI's `--help` output aloud. If any line doesn't earn its place — if it's jargon, redundancy, or filler — cut it. A CLI is prose your users read under pressure. Make every word work.
