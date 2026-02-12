# The Pydantic Code Review Checklist
### Applying Zinsser's Method to Data Modeling

> *"My four articles of faith: clarity, simplicity, brevity and humanity."*
> — William Zinsser, *On Writing Well*

Code, like prose, is written once and read many times. Zinsser taught that good nonfiction writing is the product of **hard thinking made to look effortless** — a sentence that describes every well-designed Pydantic model. This checklist maps his writing principles to concrete review questions for modern Pydantic v2 code.

---

## I. CLARITY — Does the model say exactly what it means?

Zinsser's first principle: *"Clear thinking becomes clear writing; one can't exist without the other."* In Pydantic, clarity means the type system communicates **intent** — a reader should understand the domain constraints without reading a single docstring.

### Type Precision

- [ ] Are fields typed with the **narrowest possible type**? A field that accepts `str` when it should accept `Literal["active", "inactive"]` is like a vague pronoun — the reader must guess what the author meant.
- [ ] Do union types use **discriminators** instead of relying on smart matching? Ambiguous unions are ambiguous sentences — the reader (and the runtime) shouldn't have to guess which branch you intended.
  ```python
  # Unclear — Pydantic must guess
  event: ScheduledEvent | OnDemandEvent

  # Clear — intent is explicit
  event: Annotated[ScheduledEvent | OnDemandEvent, Field(discriminator="event_type")]
  ```
- [ ] Are `Optional` fields **truly optional**, or are they masking a required field that sometimes arrives late? `None` as a default is a design decision, not a convenience.
- [ ] Do `Literal` types replace stringly-typed fields wherever a fixed set of values exists?

### Naming

- [ ] Does each model name describe a **domain concept**, not an implementation detail? `UserDTO` says nothing about the domain; `UserRegistrationRequest` says everything.
- [ ] Do field names match the **ubiquitous language** of the domain? If the business says "invoice", don't call it `billing_record`.
- [ ] Are aliases used only for **external interface concerns** (JSON casing, legacy APIs), never to rename what should have been named correctly in the first place?

### Validation Intent

- [ ] Is every `field_validator` and `model_validator` doing work that **cannot** be expressed through type annotations or `Field()` constraints? Declarative constraints (handled by the Rust core) are always clearer — and faster — than imperative Python validators.
  ```python
  # Validator doing what a type annotation should do
  @field_validator("age")
  def check_age(cls, v):
      if v < 0 or v > 150:
          raise ValueError("Invalid age")
      return v

  # Let the type system speak
  age: Annotated[int, Field(ge=0, le=150)]
  ```
- [ ] Do `before` validators handle **data coercion** (incoming shape normalization) and `after` validators handle **business rule enforcement** (cross-field invariants)? Mixing these purposes is like mixing verb tenses in a paragraph.
- [ ] Are `model_validator(mode="wrap")` usages justified? Wrap validators are the most powerful but least clear — they should be reserved for genuinely complex validation flows where you need control over the entire pipeline.

---

## II. SIMPLICITY — Is this the simplest model that could work?

Zinsser's second principle: *"The secret of good writing is to strip every sentence to its cleanest components."* In Pydantic, simplicity means **no model carries structure it doesn't need**.

### Model Architecture

- [ ] Does each model represent **one concept**? A model with 15+ fields likely conflates multiple concerns. Zinsser would say: if your paragraph needs a subheading, it's really two paragraphs.
- [ ] Is inheritance used to **share genuine domain relationships**, not just to avoid typing? Prefer composition (nested models) over inheritance when there's no true "is-a" relationship.
- [ ] Are `RootModel` types used only when the **root value itself** is the concept (a list, a dict, a scalar)? Don't reach for `RootModel` to work around structural awkwardness.
- [ ] Is `TypeAdapter` used instead of throwaway models when validating **standalone types** (unions, lists, primitives) outside a model context?

### Configuration

- [ ] Does `model_config` use `ConfigDict()` (not the legacy `class Config`)? This is the v2 way — using the old form is like writing "whom" incorrectly; technically parseable, but signals you haven't updated your thinking.
  ```python
  # Modern
  model_config = ConfigDict(
      strict=True,
      extra="forbid",
      from_attributes=True,
  )
  ```
- [ ] Is `extra="forbid"` the default posture? Silently accepting unknown fields is like accepting any word in a sentence — you lose the ability to catch misspellings in your data.
- [ ] Is `strict=True` used where **type coercion would hide bugs**? Lax mode is a convenience; strict mode is a contract. Know which one you're choosing and why.
- [ ] Is `frozen=True` set on models that represent **value objects** (things that should never change after creation)?

### Serialization

- [ ] Are `model_dump()` and `model_dump_json()` used instead of the deprecated `.dict()` and `.json()`?
- [ ] Do serialization aliases (`serialization_alias`) cleanly separate **internal naming** from **wire format**? You shouldn't have to think about JSON casing when reading business logic.
- [ ] Is `exclude_none=True` or `exclude_unset=True` used at the **call site**, not baked into the model definition? Serialization policy is context-dependent — a PATCH endpoint differs from a GET response.
- [ ] Are `computed_field` properties used for **derived values** instead of post-init mutations or property overrides?

---

## III. BREVITY — Is every field and validator earning its place?

Zinsser's third principle: *"Examine every word you put on paper. You'll find a surprising number that don't serve any purpose."* In Pydantic, brevity means **no redundant validation, no dead fields, no ceremony**.

### Clutter Removal

- [ ] Are there fields with `default=None` that **no consumer ever reads**? Dead fields are dead words — remove them.
- [ ] Are there validators that **duplicate** what `Field()` constraints already enforce? Every redundant check is a sentence the reader must parse for no new information.
- [ ] Are `Annotated` types used to create **reusable type aliases** instead of repeating the same `Field()` constraints across models?
  ```python
  # Cluttered — same constraint in every model
  class Order:
      amount: float = Field(ge=0, decimal_places=2)
  class Refund:
      amount: float = Field(ge=0, decimal_places=2)

  # Clean — the constraint is named once
  PositiveAmount = Annotated[float, Field(ge=0, decimal_places=2)]
  class Order:
      amount: PositiveAmount
  class Refund:
      amount: PositiveAmount
  ```
- [ ] Do custom validators avoid **re-validating nested models**? Pydantic already validates nested structures recursively. Adding manual checks on nested model fields is writing the same sentence twice.
- [ ] Is `TypeAdapter` reused (instantiated once, called many times) rather than **recreated per call**? Each instantiation rebuilds the validator schema — like rereading the dictionary before writing every sentence.

### Performance Awareness

- [ ] For hot paths, is `model_validate_json()` used instead of parsing JSON manually then calling `model_validate()`? The Rust core can parse JSON directly, skipping the Python dict intermediary.
- [ ] Are `Sequence` and `Mapping` replaced with `list` and `dict` when the concrete type is known? Abstract types add isinstance checks that concrete types skip.
- [ ] Is `FailFast` (v2.8+) applied to sequence fields where **one bad element should abort validation**, rather than collecting all errors?
- [ ] Does the code use `model_construct()` only when the data is **already validated** (e.g., from a trusted database)? Skipping validation is a deliberate editorial decision, not a performance shortcut.

---

## IV. HUMANITY — Does this model serve the humans who maintain it?

Zinsser's fourth principle: *"Readers identify with people, not with abstractions."* In Pydantic, humanity means the model is **kind to the next developer** — the one debugging at 2 AM, the one onboarding next month.

### Error Messages

- [ ] Do custom validators raise `ValueError` with **domain-meaningful messages**, not generic "invalid value" strings? An error message is a micro-document — it should tell the reader what went wrong and what right looks like.
  ```python
  # Unhelpful
  raise ValueError("Invalid")

  # Humane
  raise ValueError(
      f"Discount {v}% exceeds maximum allowed (50%). "
      f"Discounts above 50% require manager approval."
  )
  ```
- [ ] Are `json_schema_extra` and `Field(description=...)` used to produce **self-documenting OpenAPI schemas**? The schema is often the first (and sometimes only) documentation a consumer sees.
- [ ] Do discriminated union errors clearly indicate **which discriminator value was unexpected** and what values are valid?

### Evolution Safety

- [ ] Can a new field be added **without breaking existing consumers**? Fields with defaults are backward-compatible; required fields are breaking changes. This is the prose equivalent of not changing the meaning of a term mid-article.
- [ ] Are deprecated fields handled with **explicit `deprecated=True`** (v2.8+) or `warnings` in validators, not silently removed?
- [ ] Is `exclude_if` (v2.12+) used for **conditional serialization** rather than complex `model_serializer` overrides?
- [ ] Is the model tested with **both valid and invalid inputs**? A model that only tests the happy path is like prose that only works when the reader already agrees.

### Documentation as Craft

- [ ] Does each model have a docstring that explains **why it exists**, not what fields it has? The fields are self-documenting; the purpose is not.
- [ ] Are complex validators annotated with **examples of inputs they accept and reject**?
- [ ] Is the module organized so that **reading top to bottom tells a story**? Base types first, then composed models, then entry points. Zinsser called this "the lead and the ending" — your module should have both.

---

## V. UNITY — Is the codebase consistent with itself?

Zinsser's method chapter on Unity: *"Every successful piece of nonfiction should leave the reader with one provocative thought. Not two, not three — just one."* In Pydantic, unity means **one way to do things throughout the codebase**.

### Consistency Checks

- [ ] Is there a **single base model** with shared `ConfigDict` that all domain models inherit from? Divergent configs across models is like switching writing styles mid-article.
- [ ] Is the project on a **single Pydantic version** with consistent import patterns? Mixing `from pydantic.v1` with v2 imports signals an incomplete migration.
- [ ] Is the validator style consistent — all `@field_validator` or all `Annotated[..., BeforeValidator()]`? Both are valid; mixing them without a principle is not.
- [ ] Is `model_dump()` vs `model_dump_json()` usage consistent with the layer? Serialization to dict for internal use, to JSON for wire — don't mix the layers.
- [ ] Are `Annotated` type aliases gathered in a **shared types module**, not scattered across files?

---

## The Revision Pass

Zinsser's deepest conviction: *"The essence of writing is rewriting."* After the first pass through this checklist, ask three meta-questions:

1. **Could someone unfamiliar with this codebase read this model and understand the domain?** If not, the model lacks clarity.
2. **Could I delete any field, validator, or configuration line without changing behavior?** If yes, the model has clutter.
3. **Does the error output, when things go wrong, help or confuse the person debugging?** If it confuses, the model lacks humanity.

---

*Checklist version: Pydantic v2.12+ (February 2026)*
*Method: Adapted from William Zinsser's "On Writing Well" (1976, 30th anniversary ed.)*
