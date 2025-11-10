---
name: gopher-100-mistakes-avoid
description: This is an agent that provides code review based on "100 Go Mistakes and How to Avoid Them"*
model: sonnet
---
# Go PR Review Checklist
*Based on "100 Go Mistakes and How to Avoid Them"*

**Legend:**
- **Severity:** `CRITICAL` `HIGH` `MEDIUM` `LOW`
- **Automation:** `[AUTOMATED]` = Can be caught by linters/tools (vet, golangci-lint, race detector, etc.)
---

## 1. Code and Project Organization

### Variable & Code Structure

- [ ] **#1: Unintended Variable Shadowing** `HIGH` `[AUTOMATED]`
  - **Check for:** Variables redeclared in inner blocks that unintentionally shadow outer variables
  - **Look for:** Use of `:=` in nested blocks where a variable with the same name exists in outer scope
  - **Tool:** `go vet -vettool=$(which shadow)`
  - **Example pattern:**
    ```go
    // BAD
    var client *http.Client
    if tracing {
        client, err := createClient() // shadows outer client
    }
    
    // GOOD
    var client *http.Client
    var err error
    if tracing {
        client, err = createClient()
    }
    ```

- [ ] **#2: Unnecessary Nested Code** `MEDIUM`
  - **Check for:** Deeply nested if/else blocks that reduce readability
  - **Look for:** Code with more than 2-3 levels of nesting, especially if/else chains
  - **Best practice:** Align happy path to the left, return early for error cases
  - **Pattern:**
    ```go
    // BAD
    if err == nil {
        if valid {
            // happy path deeply nested
        } else {
            return errors.New("invalid")
        }
    } else {
        return err
    }
    
    // GOOD
    if err != nil {
        return err
    }
    if !valid {
        return errors.New("invalid")
    }
    // happy path on left
    ```

- [ ] **#3: Misusing init Functions** `MEDIUM`
  - **Check for:** `init()` functions that:
    - Make error handling difficult (only can panic)
    - Set up dependencies that complicate testing
    - Create global state
  - **Best practice:** Use explicit initialization functions for resources that can fail
  - **Valid uses:** Static configuration, side effects (like importing SQL drivers)

### Interfaces & Abstractions

- [ ] **#4: Overusing Getters and Setters** `LOW`
  - **Check for:** Unnecessary getter/setter methods without added value
  - **Look for:** Methods like `GetField()` and `SetField()` that just access/set a field
  - **Best practice:** Only use getters/setters if they provide encapsulation, validation, or future flexibility
  - **Naming:** Use `Balance()` not `GetBalance()`, and `SetBalance()` for setters

- [ ] **#5: Interface Pollution** `MEDIUM`
  - **Check for:** Interfaces created "just in case" without concrete need
  - **Look for:** Interfaces with only one implementation
  - **Best practice:** Discover abstractions, don't create them preemptively
  - **Quote:** "Don't design with interfaces, discover them" - Rob Pike

- [ ] **#6: Interface on the Producer Side** `MEDIUM`
  - **Check for:** Interfaces defined in the same package as concrete implementation
  - **Look for:** Package exporting both interface and implementation together
  - **Best practice:** Let consumers define interfaces they need (consumer-side interfaces)
  - **Exception:** Up-front abstractions in standard library (e.g., `io.Reader`)

- [ ] **#7: Returning Interfaces** `MEDIUM`
  - **Check for:** Functions/methods returning interfaces instead of concrete types
  - **Look for:** Return types like `func NewX() Interface`
  - **Best practice:** Return concrete types, accept interfaces
  - **Exception:** `error` type, or well-established abstractions like `io.Reader`

- [ ] **#8: any Says Nothing** `MEDIUM`
  - **Check for:** Overuse of `any` (or `interface{}`) type
  - **Look for:** Function signatures with `any` parameters/returns when specific types could be used
  - **Best practice:** Use `any` only when truly need to accept/return any possible type (marshaling, formatting)
  - **Impact:** Loss of compile-time type safety

- [ ] **#9: Being Confused About When to Use Generics** `MEDIUM`
  - **Check for:** 
    - Premature use of generics without concrete need
    - Using generics when simple duplication would be clearer
    - Type parameters on methods (not allowed, must be on receiver)
  - **Valid uses:** Data structures, functions on slices/maps/channels of any type, factoring out behaviors
  - **Avoid:** Using generics just to call a method of the type argument
  - **Best practice:** Wait until you're writing boilerplate code before introducing generics

- [ ] **#10: Problems with Type Embedding** `HIGH`
  - **Check for:**
    - Embedded types that promote unwanted methods/fields to public API
    - Embeds used solely for syntactic sugar (accessing `Foo.Baz()` vs `Foo.Bar.Baz()`)
    - Sync types embedded (exposes Lock/Unlock publicly)
  - **Example issue:**
    ```go
    // BAD - exposes Lock/Unlock
    type InMem struct {
        sync.Mutex
        m map[string]int
    }
    
    // GOOD
    type InMem struct {
        mu sync.Mutex
        m map[string]int
    }
    ```

### Configuration & Options

- [ ] **#11: Not Using the Functional Options Pattern** `LOW`
  - **Check for:** APIs with many optional parameters using:
    - Multiple constructors (`NewX()`, `NewXWithOptions()`, etc.)
    - Large config structs with unclear defaults
  - **Consider:** Functional options pattern for APIs with optional configurations
  - **Pattern:**
    ```go
    type Option func(*options) error
    
    func WithPort(port int) Option {
        return func(o *options) error {
            if port < 0 {
                return errors.New("invalid port")
            }
            o.port = &port
            return nil
        }
    }
    ```

### Project Structure

- [ ] **#12: Project Misorganization** `MEDIUM`
  - **Check for:**
    - Non-standard project structure without clear rationale
    - Inconsistent package organization (mixing by context and by layer)
    - Packages with unclear purposes
  - **Best practices:**
    - Follow standard layouts (project-layout structure)
    - Keep package granularity balanced (not too many nano-packages, not huge packages)
    - Name packages after what they provide, not what they contain

- [ ] **#13: Creating Utility Packages** `MEDIUM`
  - **Check for:** Packages named `utils`, `common`, `base`, `shared`, `helpers`
  - **Look for:** Generic package names that don't convey purpose
  - **Best practice:** Use expressive package names (e.g., `stringset` instead of `util`)

- [ ] **#14: Ignoring Package Name Collisions** `LOW`
  - **Check for:** Variable names that collide with:
    - Package names (e.g., `redis := redis.NewClient()`)
    - Built-in functions (e.g., `copy := copyFile()`)
  - **Look for:** Variables that shadow packages or built-ins
  - **Solution:** Use different variable names or package aliases

- [ ] **#15: Missing Code Documentation** `LOW`
  - **Check for:** `[AUTOMATED]` (with linters)
    - Exported elements without documentation comments
    - Documentation that doesn't start with element name
    - Missing package documentation
  - **Best practice:**
    - Every exported element must be documented
    - Start with element name: `// Customer is a customer representation.`
    - Document purpose, not implementation

- [ ] **#16: Not Using Linters** `MEDIUM` `[AUTOMATED]`
  - **Check for:** PR without running standard linters
  - **Required linters:**
    - `go vet`
    - `golangci-lint` (recommended)
    - `errcheck` (for unchecked errors)
    - `gocyclo` (for complexity)
  - **Best practice:** Automated linter execution in CI/pre-commit hooks

---

## 2. Data Types

### Basic Types

- [ ] **#17: Creating Confusion with Octal Literals** `MEDIUM` `[AUTOMATED]`
  - **Check for:** Integer literals starting with `0` that might be misread
  - **Look for:** Numbers like `010` (equals 8, not 10)
  - **Best practice:** Use `0o` prefix for octal (e.g., `0o644` for file permissions)

- [ ] **#18: Neglecting Integer Overflows** `HIGH`
  - **Check for:**
    - Integer arithmetic on smaller types without overflow checks
    - Incrementing/adding integers near type limits
    - Type conversions that could overflow
  - **Critical in:** Memory-constrained projects, large numbers, conversions
  - **Solution:** Check against `math.MaxInt`, `math.MinInt`, or use `math/big` package

- [ ] **#19: Not Understanding Floating Points** `HIGH`
  - **Check for:**
    - Direct comparison of floats using `==` operator
    - Assumption of exact decimal representation
    - Chained operations without considering order
  - **Best practices:**
    - Compare floats within a delta (e.g., `testify.InDelta`)
    - Group operations with similar magnitude
    - Perform multiplication/division before addition/subtraction for accuracy

### Slices

- [ ] **#20: Not Understanding Slice Length and Capacity** `HIGH`
  - **Check for:** Confusion between `len()` and `cap()` in slice operations
  - **Key concepts:**
    - Length = number of elements accessible
    - Capacity = size of backing array
    - `append` on full slice creates new backing array
  - **Impact:** Unexpected behavior with `append`, slicing operations

- [ ] **#21: Inefficient Slice Initialization** `MEDIUM`
  - **Check for:** Slices created with `make([]T, 0)` when length is known
  - **Look for:**
    - Loops that append to empty slices with known iterations
    - Slice conversions where target size is predictable
  - **Best practice:**
    ```go
    // If length known
    s := make([]T, length)
    
    // If capacity known but length varies
    s := make([]T, 0, capacity)
    ```

- [ ] **#22: Being Confused About nil vs. Empty Slices** `MEDIUM`
  - **Check for:**
    - Functions returning `[]T{}` instead of `nil` when no elements
    - Unnecessary non-nil empty slice allocations
  - **Best practice:** Return `nil` for empty slices (no allocation needed)
  - **Note:** Both nil and empty slices have `len() == 0`

- [ ] **#23: Not Properly Checking if a Slice is Empty** `LOW`
  - **Check for:** Checking `slice != nil` instead of `len(slice) != 0`
  - **Best practice:** Always use `len(slice) == 0` to check emptiness (works for both nil and empty)

- [ ] **#24: Not Making Slice Copies Correctly** `HIGH`
  - **Check for:**
    - `copy(dst, src)` with uninitialized `dst`
    - Forgetting that copy copies `min(len(src), len(dst))` elements
  - **Pattern:**
    ```go
    // BAD
    var dst []int
    copy(dst, src) // copies 0 elements!
    
    // GOOD
    dst := make([]int, len(src))
    copy(dst, src)
    ```

- [ ] **#25: Unexpected Side Effects Using Slice Append** `CRITICAL`
  - **Check for:**
    - Appending to slices passed as function arguments
    - Slicing operations followed by append that might modify original slice
  - **Issue:** If slice isn't full, append modifies backing array, affecting original
  - **Solutions:**
    - Use full slice expression: `s[:i:i]` to limit capacity
    - Make explicit copy before append
  - **Example:**
    ```go
    // BAD - can modify original
    func process(s []int) {
        s2 := s[:2]
        s2 = append(s2, 10) // might modify s!
    }
    
    // GOOD - limit capacity
    func process(s []int) {
        s2 := s[:2:2]
        s2 = append(s2, 10)
    }
    ```

- [ ] **#26: Slices and Memory Leaks** `CRITICAL`
  - **Check for:**
    - Slicing large slices/arrays to keep small portions (leaks capacity)
    - Slices of pointers/structs with pointer fields being sliced
  - **Issues:**
    - `largeSlice[:5]` keeps entire backing array in memory
    - Slicing doesn't allow GC to reclaim unused elements with pointers
  - **Solutions:**
    - Use slice copy: `copy(make([]T, n), large[:n])`
    - Set remaining elements to nil for pointer slices
    - Use `strings.Clone()` for substrings (Go 1.18+)

### Maps

- [ ] **#27: Inefficient Map Initialization** `MEDIUM`
  - **Check for:** Maps created without initial size when size is known
  - **Look for:** `make(map[K]V)` in loops or heavy insertion scenarios
  - **Best practice:** `make(map[K]V, expectedSize)` to avoid rehashing
  - **Impact:** ~60% faster with preallocation in benchmarks

- [ ] **#28: Maps and Memory Leaks** `HIGH`
  - **Check for:**
    - Maps that grow large and never shrink (maps never release buckets)
    - Long-lived maps with fluctuating size
  - **Issue:** Deleting elements doesn't reduce bucket count
  - **Solutions:**
    - Periodically recreate map
    - Use `map[K]*V` instead of `map[K]V` for large values
    - Consider if map is right data structure

- [ ] **#29: Comparing Values Incorrectly** `HIGH`
  - **Check for:**
    - Using `==` on structs containing slices/maps
    - Comparing `any` types with `==` (can panic at runtime)
  - **Solutions:**
    - Use `reflect.DeepEqual()` (slower, distinguishes nil vs empty)
    - Implement custom `Equal()` method for performance
    - Check standard library for existing comparisons (e.g., `bytes.Compare`)
  - **Note:** `reflect.DeepEqual` is ~100x slower than `==`

---

## 3. Control Structures

- [ ] **#30: Ignoring That Elements Are Copied in Range Loops** `HIGH`
  - **Check for:**
    - Modifying struct values in range loop expecting changes to original
    - Using range value variable for mutations
  - **Issue:** Range loop value is a **copy**
  - **Solutions:**
    ```go
    // BAD
    for _, item := range items {
        item.field = newValue // only modifies copy!
    }
    
    // GOOD - use index
    for i := range items {
        items[i].field = newValue
    }
    
    // OR - use slice of pointers
    for _, item := range items { // items is []*Item
        item.field = newValue
    }
    ```

- [ ] **#31: Ignoring How Arguments Are Evaluated in Range Loops** `MEDIUM`
  - **Check for:**
    - Assuming range expression is re-evaluated each iteration
    - Modifying slice/channel during range iteration expecting behavior change
  - **Key concept:** Range expression evaluated **only once** (copied to temp variable)
  - **Examples:**
    ```go
    // This terminates (s copied before loop)
    s := []int{1, 2, 3}
    for range s {
        s = append(s, 10) // modifies original, not range copy
    }
    
    // This never ends
    for i := 0; i < len(s); i++ {
        s = append(s, 10) // len(s) evaluated each iteration
    }
    ```

- [ ] **#32: Ignoring Impact of Using Pointer Elements in Range Loops** `CRITICAL`
  - **Check for:** Storing addresses of range loop variables
  - **Classic bug:**
    ```go
    // BAD
    var results []*Result
    for _, item := range items {
        results = append(results, &item) // all point to same variable!
    }
    
    // GOOD - create local copy
    for _, item := range items {
        item := item // shadow variable
        results = append(results, &item)
    }
    
    // OR - use index
    for i := range items {
        results = append(results, &items[i])
    }
    ```

- [ ] **#33: Making Wrong Assumptions During Map Iterations** `HIGH`
  - **Check for:**
    - Assumptions about map iteration order
    - Code depending on insertion order
    - Expectations about when new entries appear during iteration
  - **Key facts:**
    - Iteration order is **not specified** (deliberately randomized)
    - New entries during iteration **may or may not** appear in same iteration
    - No guarantee about order between iterations
  - **Solution:** Use separate data structures if ordering matters

- [ ] **#34: Ignoring How the break Statement Works** `HIGH`
  - **Check for:**
    - `break` in switch/select inside loops expecting to break loop
    - Missing labels when breaking outer statements
  - **Issue:** `break` terminates **innermost** for/switch/select
  - **Solution:**
    ```go
    // Use labels
    loop:
        for {
            switch {
            case condition:
                break loop // breaks loop, not switch
            }
        }
    ```

- [ ] **#35: Using defer Inside a Loop** `HIGH`
  - **Check for:** `defer` statements inside loops (especially file operations)
  - **Issue:** Defers execute when **function returns**, not at iteration end
  - **Impact:** Resource leaks (file descriptors, connections)
  - **Solutions:**
    ```go
    // BAD
    for _, file := range files {
        f, _ := os.Open(file)
        defer f.Close() // only closes when function returns!
    }
    
    // GOOD - extract to function
    for _, file := range files {
        if err := processFile(file); err != nil {
            return err
        }
    }
    
    func processFile(filename string) error {
        f, _ := os.Open(filename)
        defer f.Close() // closes at end of each iteration
        // ...
    }
    ```

---

## 4. Strings

- [ ] **#36: Not Understanding the Concept of a Rune** `HIGH`
  - **Check for:**
    - String operations assuming 1 character = 1 byte
    - Using `len(string)` expecting character count
  - **Key concepts:**
    - Rune = Unicode code point (`int32` alias)
    - UTF-8 encodes runes in 1-4 bytes
    - `len(string)` returns **byte count**, not rune count
  - **Get rune count:** `utf8.RuneCountInString(s)`

- [ ] **#37: Inaccurate String Iteration** `HIGH`
  - **Check for:**
    - Using index to access runes: `s[i]` (gets byte, not rune)
    - Substring operations on multi-byte characters using byte indices
  - **Solutions:**
    ```go
    // For each rune
    for i, r := range s {
        // i = starting byte index
        // r = rune
    }
    
    // Get ith rune
    runes := []rune(s)
    r := runes[i]
    ```

- [ ] **#38: Misusing Trim Functions** `MEDIUM`
  - **Check for:** Confusion between `TrimRight/TrimLeft` and `TrimSuffix/TrimPrefix`
  - **Difference:**
    - `TrimRight("123oxo", "xo")` = `"123"` (removes all trailing runes in set)
    - `TrimSuffix("123oxo", "xo")` = `"123o"` (removes exact suffix once)

- [ ] **#39: Under-Optimized String Concatenation** `MEDIUM`
  - **Check for:**
    - Using `+` operator in loops for string concatenation
    - Building strings without `strings.Builder`
  - **Performance impact:** Each `+=` creates new string (immutable)
  - **Solution:**
    ```go
    var sb strings.Builder
    sb.Grow(totalBytes) // if size known
    for _, s := range strings {
        sb.WriteString(s)
    }
    result := sb.String()
    ```
  - **Rule of thumb:** Use `strings.Builder` for 5+ concatenations

- [ ] **#40: Useless String Conversions** `MEDIUM`
  - **Check for:**
    - Converting `[]byte` to `string` and back when `bytes` package could be used
    - I/O operations using strings when working with `[]byte`
  - **Best practice:** Use `bytes` package directly when doing I/O
  - **Example:** `bytes.TrimSpace(b)` instead of converting to string

- [ ] **#41: Substrings and Memory Leaks** `HIGH`
  - **Check for:**
    - Substring operations on large strings keeping only small portion
    - Storing substrings long-term
  - **Issue:** Substring shares backing array with original string
  - **Solutions:**
    ```go
    // BAD - keeps full 1MB in memory
    uuid := logMessage[:36] // logMessage is 1MB
    
    // GOOD - copy substring
    uuid := string([]byte(logMessage[:36]))
    
    // OR - Go 1.18+
    uuid := strings.Clone(logMessage[:36])
    ```

---

## 5. Functions and Methods

- [ ] **#42: Not Knowing Which Type of Receiver to Use** `HIGH`
  - **Must be pointer:**
    - Method mutates receiver
    - Receiver contains field that cannot be copied (e.g., `sync.Mutex`)
  - **Should be pointer:**
    - Large receiver (avoid expensive copy)
  - **Must be value:**
    - To enforce immutability
    - Receiver is map, function, or channel
  - **Should be value:**
    - Small array/struct with no mutable fields
    - Basic types (int, float64, string)
  - **Best practice:** Default to value receiver unless good reason for pointer

- [ ] **#43: Never Using Named Result Parameters** `LOW`
  - **Check for:** Opportunities where named results would improve readability
  - **Use when:**
    - Multiple results of same type need clarification
    - Interface definitions (helps document intent)
  - **Example:** `func getCoordinates(addr string) (lat, lng float32, err error)`

- [ ] **#44: Unintended Side Effects with Named Result Parameters** `MEDIUM`
  - **Check for:**
    - Named result parameters initialized to zero value causing bugs
    - Returning wrong value due to shadowing
  - **Example issue:**
    ```go
    func f(ctx context.Context) (lat, lng float32, err error) {
        // ...
        if ctx.Err() != nil {
            return 0, 0, err // err is nil (zero value)!
        }
    }
    
    // GOOD
    if err := ctx.Err(); err != nil {
        return 0, 0, err
    }
    ```

- [ ] **#45: Returning a nil Receiver** `CRITICAL`
  - **Check for:** Functions returning interfaces where nil pointer is converted to interface
  - **Classic bug:**
    ```go
    func (c Customer) validate() error {
        var m *MultiError // nil pointer
        if c.invalid {
            m = &MultiError{}
            m.Add(errors.New("invalid"))
        }
        return m // returns non-nil interface with nil pointer!
    }
    
    // GOOD
    if m != nil {
        return m
    }
    return nil // explicit nil
    ```
  - **Remember:** nil pointer converted to interface ≠ nil interface

- [ ] **#46: Using a Filename as a Function Input** `MEDIUM`
  - **Check for:** Functions accepting `filename string` instead of `io.Reader`
  - **Issues:**
    - Hard to test (need actual files)
    - Not reusable (file-specific)
  - **Best practice:**
    ```go
    // BAD
    func process(filename string) error
    
    // GOOD
    func process(r io.Reader) error
    ```
  - **Benefits:** Abstraction, easier testing, reusability

- [ ] **#47: Ignoring How defer Arguments and Receivers Are Evaluated** `HIGH`
  - **Check for:**
    - Defer with arguments/receivers expecting later values
    - Mutable values passed to defer expecting final state
  - **Key concept:** Arguments evaluated **immediately**, not when defer executes
  - **Solutions:**
    ```go
    // BAD
    var status string
    defer notify(status) // evaluates "" immediately
    status = "ready"
    
    // GOOD - pointer
    defer notify(&status)
    
    // OR - closure
    defer func() { notify(status) }()
    ```
  - **Note:** For pointer receivers, mutations are visible; for value receivers, they're not

---

## 6. Error Management

- [ ] **#48: Panicking** `CRITICAL`
  - **Check for:** Inappropriate use of `panic()` for normal error handling
  - **Valid uses:**
    - Programmer errors (e.g., `nil` argument to function requiring non-nil)
    - Failed mandatory dependency initialization
  - **Invalid uses:**
    - Expected errors (validation, I/O errors, etc.)
    - Any error that caller might want to handle
  - **Best practice:** Return errors, don't panic (except in truly exceptional conditions)

- [ ] **#49: Ignoring When to Wrap an Error** `HIGH`
  - **Check for:**
    - Missing context in error messages
    - Using `%v` when `%w` would be appropriate (or vice versa)
  - **Use `%w` (wrapping) when:**
    - Want to add context AND keep source error available
    - Caller might want to check error type/value
  - **Use `%v` (transforming) when:**
    - Want to hide implementation details
    - Don't want coupling to source error
  - **Pattern:**
    ```go
    // Wrapping (source error available)
    return fmt.Errorf("failed to connect: %w", err)
    
    // Transforming (source error hidden)
    return fmt.Errorf("failed to connect: %v", err)
    ```

- [ ] **#50: Checking an Error Type Inaccurately** `HIGH`
  - **Check for:**
    - Using type assertion/switch for wrapped errors
    - Not using `errors.As()` for error type checking
  - **Issue:** Type checks fail with wrapped errors
  - **Solution:**
    ```go
    // BAD
    if err, ok := err.(MyError); ok { }
    
    // GOOD
    var myErr MyError
    if errors.As(err, &myErr) { }
    ```

- [ ] **#51: Checking an Error Value Inaccurately** `HIGH`
  - **Check for:**
    - Using `==` for sentinel error comparison with wrapped errors
    - Not using `errors.Is()`
  - **Solution:**
    ```go
    // BAD
    if err == sql.ErrNoRows { }
    
    // GOOD
    if errors.Is(err, sql.ErrNoRows) { }
    ```

- [ ] **#52: Handling an Error Twice** `MEDIUM`
  - **Check for:**
    - Logging error AND returning it
    - Multiple log statements for same error
  - **Rule:** Handle error **once** (log OR return, not both)
  - **Best practice:** Wrap errors for context, handle at appropriate level
  - **Example:**
    ```go
    // BAD
    if err != nil {
        log.Printf("failed: %v", err)
        return err // handled twice!
    }
    
    // GOOD
    if err != nil {
        return fmt.Errorf("operation failed: %w", err)
    }
    ```

- [ ] **#53: Not Handling an Error** `HIGH` `[AUTOMATED]`
  - **Check for:** Ignored error returns without explicit acknowledgment
  - **Best practice:**
    ```go
    // BAD
    notify() // error ignored silently
    
    // GOOD - explicit
    _ = notify()
    
    // BETTER - with comment if rationale needed
    // At-most once delivery; acceptable to miss some
    _ = notify()
    ```
  - **Tool:** `errcheck` linter

- [ ] **#54: Not Handling defer Errors** `MEDIUM`
  - **Check for:**
    - `defer rows.Close()` without error handling
    - `defer file.Close()` on writable files without checking error
  - **Solutions:**
    ```go
    // Minimum - explicit ignore
    defer func() { _ = rows.Close() }()
    
    // Better - log error
    defer func() {
        if err := rows.Close(); err != nil {
            log.Printf("failed to close: %v", err)
        }
    }()
    
    // Propagate using named returns
    func query() (err error) {
        // ...
        defer func() {
            closeErr := rows.Close()
            if err == nil {
                err = closeErr
            }
        }()
    }
    ```

---

## 7. Concurrency: Foundations

- [ ] **#55: Mixing Up Concurrency and Parallelism** `MEDIUM`
  - **Check for:** Confusion in discussions/design about concurrent vs parallel
  - **Definitions:**
    - **Concurrency:** Structure to deal with multiple things at once (design)
    - **Parallelism:** Doing multiple things at once (execution)
  - **Key insight:** Concurrency enables parallelism, but they're different concepts

- [ ] **#56: Thinking Concurrency Is Always Faster** `CRITICAL`
  - **Check for:**
    - Adding concurrency without benchmarking
    - Creating goroutines for trivial workloads
    - Assuming parallel version is always better
  - **Reality:** Goroutine overhead can outweigh benefits for small workloads
  - **Best practice:**
    - Start with sequential version
    - Profile and benchmark before parallelizing
    - Define threshold for parallel execution
  - **Example:** Merge sort only beneficial in parallel with workload > 2048 elements

- [ ] **#57: Being Puzzled About When to Use Channels or Mutexes** `HIGH`
  - **Check for:** Wrong synchronization primitive choice
  - **Guidelines:**
    - **Mutexes:** For parallel goroutines sharing state (synchronization)
    - **Channels:** For concurrent goroutines coordinating work (communication/orchestration)
    - **Channels:** For ownership transfer
  - **Remember:** "Share memory by communicating, don't communicate by sharing memory"

- [ ] **#58: Not Understanding Race Problems** `CRITICAL` `[AUTOMATED]`
  - **Check for:**
    - Data races (multiple goroutines accessing same location, at least one writing)
    - Race conditions (behavior depends on uncontrolled timing)
  - **Key distinction:**
    - Data race = undefined behavior, must be fixed
    - Race condition = non-deterministic but might be acceptable depending on requirements
  - **Prevention:**
    ```go
    // Use atomic operations
    atomic.AddInt64(&counter, 1)
    
    // Use mutexes
    mu.Lock()
    counter++
    mu.Unlock()
    
    // Use channels
    ch <- 1
    counter += <-ch
    ```
  - **Tool:** Run tests with `-race` flag

- [ ] **#59: Not Understanding Concurrency Impacts of Workload Type** `HIGH`
  - **Check for:**
    - Worker pool sizes not matching workload type
    - CPU-bound work with unlimited goroutines
  - **Guidelines:**
    - **CPU-bound:** Pool size ≈ `runtime.GOMAXPROCS(0)` (number of logical cores)
    - **I/O-bound:** Pool size depends on external system capacity
  - **Reason:** CPU-bound benefits from matching core count; I/O-bound limited by external resources

- [ ] **#60: Misunderstanding Go Contexts** `HIGH`
  - **Check for:**
    - Missing context in long-running operations
    - Creating contexts incorrectly
    - Not respecting context cancellation
  - **Context carries:**
    - Deadline: `context.WithTimeout()`, `context.WithDeadline()`
    - Cancellation signal: `context.WithCancel()`
    - Key-value pairs: `context.WithValue()`
  - **Best practices:**
    - Always call `cancel()` in defer (prevents goroutine leaks)
    - Use `context.Background()` for top-level contexts
    - Use `context.TODO()` when context unclear/not yet available
    - Context-aware operations should check `ctx.Done()` channel

---

## 8. Concurrency: Practice

- [ ] **#61: Propagating an Inappropriate Context** `HIGH`
  - **Check for:**
    - HTTP request context propagated to async operations
    - Context cancellation affecting unintended operations
  - **Issue:** HTTP context cancels when response written, can cancel async work
  - **Solution:** Create detached context or new context for async operations

- [ ] **#62: Starting a Goroutine Without Knowing When to Stop It** `CRITICAL`
  - **Check for:**
    - Goroutines started without clear termination path
    - Missing cleanup for goroutine resources
  - **Requirements:**
    - Every goroutine must have termination plan
    - Application shutdown should wait for goroutines or signal them to stop
  - **Pattern:**
    ```go
    type Worker struct {
        done chan struct{}
    }
    
    func (w *Worker) Close() {
        close(w.done)
        // wait for cleanup
    }
    
    func (w *Worker) work() {
        for {
            select {
            case <-w.done:
                // cleanup
                return
            // do work
            }
        }
    }
    ```

- [ ] **#63: Not Being Careful with Goroutines and Loop Variables** `CRITICAL`
  - **Check for:**
    - Goroutines using loop variables in closures
    - `go func() { use(loopVar) }()` patterns
  - **Classic bug:**
    ```go
    // BAD - all goroutines see last value
    for _, item := range items {
        go func() {
            process(item) // item changes!
        }()
    }
    
    // GOOD - copy to local variable
    for _, item := range items {
        item := item
        go func() {
            process(item)
        }()
    }
    
    // OR - pass as parameter
    for _, item := range items {
        go func(i Item) {
            process(i)
        }(item)
    }
    ```

- [ ] **#64: Expecting Deterministic Behavior Using select and Channels** `HIGH`
  - **Check for:**
    - Code assuming select chooses first ready case
    - Priority handling without explicit logic
  - **Key fact:** Select chooses **randomly** if multiple cases ready
  - **For priorities:**
    ```go
    // Use nested select with default
    select {
    case v := <-highPriority:
        handle(v)
    default:
        select {
        case v := <-highPriority:
            handle(v)
        case v := <-lowPriority:
            handle(v)
        }
    }
    ```

- [ ] **#65: Not Using Notification Channels** `LOW`
  - **Check for:** Using `chan bool` or `chan int` for signaling (no data)
  - **Best practice:** Use `chan struct{}` for notifications
  - **Reason:** Empty struct occupies zero bytes, makes intent clear

- [ ] **#66: Not Using nil Channels** `MEDIUM`
  - **Check for:** Complex case handling in select that could use nil channels
  - **Use case:** Dynamically removing cases from select statement
  - **Key behavior:**
    - Sending to nil channel blocks forever
    - Receiving from nil channel blocks forever
  - **Pattern:**
    ```go
    for ch1 != nil || ch2 != nil {
        select {
        case v := <-ch1:
            if closed {
                ch1 = nil // remove from select
            }
        case v := <-ch2:
            if closed {
                ch2 = nil
            }
        }
    }
    ```

- [ ] **#67: Being Puzzled About Channel Size** `MEDIUM`
  - **Check for:**
    - Magic numbers for channel sizes without rationale
    - Buffered channels without clear reason
  - **Guidelines:**
    - Default to **unbuffered** (`make(chan T)`) for synchronization
    - Use size of **1** as default for buffered
    - Use specific size only for:
      - Worker pool (size = number of workers)
      - Rate limiting (size = limit)
  - **Document rationale** for sizes > 1

- [ ] **#68: Forgetting About Possible Side Effects with String Formatting** `HIGH`
  - **Check for:**
    - String formatting in concurrent code (especially with mutexes held)
    - Formatting structs that might call methods
  - **Issues:**
    - Can traverse mutable context values (data race)
    - Can cause deadlocks if formatter acquires same mutex
  - **Example:**
    ```go
    // BAD - deadlock
    func (c *Customer) UpdateAge(age int) error {
        c.mu.Lock()
        defer c.mu.Unlock()
        
        if age < 0 {
            return fmt.Errorf("invalid for %v", c) // calls String(), deadlock!
        }
    }
    
    // GOOD - format individual fields
    return fmt.Errorf("invalid for customer %s", c.id)
    ```

- [ ] **#69: Creating Data Races with append** `CRITICAL` `[AUTOMATED]`
  - **Check for:** Concurrent appends to shared slices
  - **Issue:**
    - If slice not full: appends modify same backing array (data race)
    - If slice full: creates new array (race-free, but might not be intended behavior)
  - **Solution:** Consider append on shared slices as data race (avoid in concurrent code)
  - **Alternative:** Use channels or mutexes

- [ ] **#70: Using Mutexes Inaccurately with Slices and Maps** `HIGH`
  - **Check for:**
    - Assigning slice/map to local variable thinking it's a copy
    - Critical sections that don't protect actual data mutations
  - **Issue:**
    ```go
    // BAD - not a deep copy!
    mu.Lock()
    local := shared // local and shared point to same data!
    mu.Unlock()
    
    for k, v := range local { // data race!
        process(v)
    }
    ```
  - **Solutions:**
    - Lock for entire operation
    - Make deep copy inside lock

- [ ] **#71: Misusing sync.WaitGroup** `HIGH`
  - **Check for:**
    - `wg.Add()` called inside goroutine (should be before)
    - Not calling `wg.Done()` in defer
    - Wrong delta values
  - **Correct pattern:**
    ```go
    var wg sync.WaitGroup
    wg.Add(n) // BEFORE goroutines
    
    for i := 0; i < n; i++ {
        go func() {
            defer wg.Done() // ensure it's called
            // work
        }()
    }
    
    wg.Wait()
    ```

- [ ] **#72: Forgetting About sync.Cond** `LOW`
  - **Check for:** Busy-wait loops that could use condition variables
  - **Use case:** Multiple goroutines waiting for same condition
  - **When to use:** Repeated notifications to multiple goroutines (broadcasts)
  - **Pattern:**
    ```go
    cond := sync.NewCond(&sync.Mutex{})
    
    // Listener
    cond.L.Lock()
    for !condition {
        cond.Wait() // unlocks, waits, re-locks
    }
    cond.L.Unlock()
    
    // Notifier
    cond.L.Lock()
    // update condition
    cond.L.Unlock()
    cond.Broadcast() // wake all waiters
    ```

- [ ] **#73: Not Using errgroup** `LOW`
  - **Check for:** Manual goroutine coordination with errors that could use errgroup
  - **Use case:** Launch multiple goroutines, wait for all, get first error
  - **Benefits:**
    - Handles error propagation
    - Context cancellation on first error
    - Simpler than manual sync.WaitGroup + error handling
  - **Package:** `golang.org/x/sync/errgroup`

- [ ] **#74: Copying a sync Type** `CRITICAL` `[AUTOMATED]`
  - **Check for:**
    - Value receivers on methods with sync fields
    - Passing sync types by value to functions
    - Structs containing sync types passed by value
  - **Types that must not be copied:**
    - `sync.Mutex`, `sync.RWMutex`
    - `sync.Cond`, `sync.Map`, `sync.Once`, `sync.Pool`, `sync.WaitGroup`
  - **Solution:** Always use pointers for types containing sync primitives
  - **Tool:** `go vet` detects this

---

## 9. The Standard Library

### Time Handling

- [ ] **#75: Providing a Wrong time Duration** `MEDIUM`
  - **Check for:**
    - Passing raw integers where `time.Duration` expected
    - Assuming milliseconds instead of nanoseconds
  - **Issue:** `time.Duration` is nanoseconds, passing `1000` means 1 microsecond not 1 second
  - **Best practice:**
    ```go
    // BAD
    time.Sleep(1000) // 1 microsecond!
    
    // GOOD
    time.Sleep(1000 * time.Millisecond)
    time.Sleep(time.Second)
    ```

- [ ] **#76: time.After and Memory Leaks** `HIGH`
  - **Check for:** `time.After()` in loops or frequently-called functions
  - **Issue:** Resources not released until timer expires (200 bytes per call)
  - **Solution:**
    ```go
    // BAD - memory leak in loop
    for {
        select {
        case <-ch:
        case <-time.After(time.Hour): // allocates each iteration!
        }
    }
    
    // GOOD - reuse timer
    timer := time.NewTimer(time.Hour)
    for {
        timer.Reset(time.Hour)
        select {
        case <-ch:
        case <-timer.C:
        }
    }
    ```

### JSON Handling

- [ ] **#77: Common JSON-Handling Mistakes** `MEDIUM`
  - **Check for:**
    - **Type embedding with JSON:** Embedded `time.Time` overrides marshaling
    - **Monotonic clock:** Comparing `time.Time` structs after JSON round-trip
    - **Map of any:** Assuming integers, getting `float64`
  - **Issues:**
    ```go
    // Embedded field takes over marshaling
    type Event struct {
        ID int
        time.Time // overrides entire struct marshaling!
    }
    
    // Unmarshal to map[string]any
    var m map[string]any
    json.Unmarshal([]byte(`{"age": 30}`), &m)
    age := m["age"].(int) // PANIC! It's float64
    ```
  - **Solutions:**
    - Name embedded fields if they implement json.Marshaler
    - Use `time.Time.Equal()` not `==` for comparison
    - Expect `float64` for all numbers in `map[string]any`

### SQL

- [ ] **#78: Common SQL Mistakes** `HIGH`
  - **Check for:**
    - **Not pinging after** `sql.Open()`: Doesn't guarantee connection
    - **Default connection pooling:** Not configuring `SetMaxOpenConns`, `SetMaxIdleConns`, `SetConnMaxIdleTime`, `SetConnMaxLifetime`
    - **Not using prepared statements:** Security and performance issue
    - **Null value handling:** Not using `sql.NullXXX` or pointers for nullable columns
    - **Missing** `rows.Err()` check after iteration
  - **Patterns:**
    ```go
    // Ensure connection
    db, err := sql.Open("mysql", dsn)
    if err := db.Ping(); err != nil { ... }
    
    // Configure pool
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)
    
    // Prepared statements
    stmt, err := db.Prepare("SELECT * FROM users WHERE id = ?")
    rows, err := stmt.Query(id)
    
    // Nullable columns
    var name sql.NullString
    rows.Scan(&name)
    
    // Check iteration errors
    for rows.Next() { ... }
    if err := rows.Err(); err != nil { ... }
    ```

### Resource Management

- [ ] **#79: Not Closing Transient Resources** `CRITICAL`
  - **Check for:**
    - `resp.Body` not closed after `http.Get/Post`
    - `sql.Rows` not closed after query
    - `os.File` not closed
    - Any `io.Closer` not being closed
  - **Best practices:**
    ```go
    // HTTP - always close body
    resp, err := http.Get(url)
    if err != nil {
        return err
    }
    defer func() {
        if err := resp.Body.Close(); err != nil {
            log.Printf("failed to close: %v", err)
        }
    }()
    
    // Read body even if not used (for connection reuse)
    _, _ = io.Copy(io.Discard, resp.Body)
    
    // SQL rows
    rows, err := db.Query(...)
    if err != nil {
        return err
    }
    defer rows.Close()
    
    // Files - propagate close errors for writes
    func write(filename string) (err error) {
        f, err := os.Create(filename)
        defer func() {
            closeErr := f.Close()
            if err == nil {
                err = closeErr
            }
        }()
        _, err = f.Write(data)
        return
    }
    ```

### HTTP

- [ ] **#80: Forgetting the return Statement After Replying to an HTTP Request** `HIGH`
  - **Check for:** Missing `return` after `http.Error()` or response writing
  - **Issue:** `http.Error()` doesn't stop handler execution
  - **Pattern:**
    ```go
    // BAD
    if err != nil {
        http.Error(w, "error", 500)
        // continues execution!
    }
    
    // GOOD
    if err != nil {
        http.Error(w, "error", 500)
        return
    }
    ```

- [ ] **#81: Using the Default HTTP Client and Server** `CRITICAL`
  - **Check for:**
    - `http.Get()`, `http.Post()` without custom client
    - `&http.Client{}` or `http.DefaultClient`
    - `http.ListenAndServe()` without timeout configuration
  - **Issues:**
    - No timeouts (can hang forever)
    - Default connection pooling might not fit needs
  - **Production requirements:**
    ```go
    // Client
    client := &http.Client{
        Timeout: 5 * time.Second,
        Transport: &http.Transport{
            DialContext: (&net.Dialer{
                Timeout: time.Second,
            }).DialContext,
            TLSHandshakeTimeout:   time.Second,
            ResponseHeaderTimeout: time.Second,
            MaxIdleConnsPerHost:   10, // default is 2!
        },
    }
    
    // Server
    srv := &http.Server{
        Addr:              ":8080",
        ReadHeaderTimeout: 500 * time.Millisecond,
        ReadTimeout:       500 * time.Millisecond,
        WriteTimeout:      time.Second,
        IdleTimeout:       time.Minute,
        Handler:           handler,
    }
    ```

---

## 10. Testing

### Test Organization

- [ ] **#82: Not Categorizing Tests** `MEDIUM`
  - **Check for:**
    - No distinction between unit/integration/e2e tests
    - Tests that require external dependencies mixed with pure unit tests
  - **Methods:**
    - **Build tags:** `//go:build integration`
    - **Environment variables:** `if os.Getenv("INTEGRATION") != "true" { t.Skip() }`
    - **Short mode:** `if testing.Short() { t.Skip() }`
  - **Best practice:** Integration tests should be opt-in, not run by default

- [ ] **#83: Not Enabling the -race Flag** `CRITICAL` `[AUTOMATED]`
  - **Check for:**
    - Tests of concurrent code without race detection
    - CI pipelines missing `-race` flag
  - **Requirement:** All concurrent code must be tested with `go test -race`
  - **Overhead:** 2-20x slower, 5-10x memory - use in CI/local only, not production

- [ ] **#84: Not Using Test Execution Modes** `LOW`
  - **Check for:**
    - Long-running tests not marked with `t.Parallel()`
    - Tests with hidden dependencies on execution order
  - **Flags:**
    - `-parallel=n`: Run n tests in parallel
    - `-shuffle=on`: Randomize execution order (Go 1.17+)
  - **Use shuffle** to find tests with ordering dependencies

- [ ] **#85: Not Using Table-Driven Tests** `LOW`
  - **Check for:**
    - Duplicated test logic across multiple test functions
    - Many test functions with similar structure
  - **Best practice:**
    ```go
    func TestFoo(t *testing.T) {
        tests := map[string]struct {
            input    string
            expected int
        }{
            "case1": {input: "a", expected: 1},
            "case2": {input: "b", expected: 2},
        }
        
        for name, tt := range tests {
            t.Run(name, func(t *testing.T) {
                got := foo(tt.input)
                if got != tt.expected {
                    t.Errorf("got %v, want %v", got, tt.expected)
                }
            })
        }
    }
    ```
  - **With parallel:** Shadow loop variable (`tt := tt`)

### Test Quality

- [ ] **#86: Sleeping in Unit Tests** `HIGH`
  - **Check for:** `time.Sleep()` in tests (sign of flakiness)
  - **Issue:** Non-deterministic, slow tests
  - **Solutions:**
    - Use synchronization (channels, waitgroups)
    - Retry with timeout
    - Mock time dependencies
  - **Never:** Rely on sleep duration for correctness

- [ ] **#87: Not Dealing with the time API Efficiently** `MEDIUM`
  - **Check for:**
    - Tests calling `time.Now()` directly (brittle, non-deterministic)
    - Time-dependent logic hard to test
  - **Solutions:**
    ```go
    // Option 1: Inject time as dependency
    type Cache struct {
        now func() time.Time
    }
    
    // Production
    c := Cache{now: time.Now}
    
    // Test
    c := Cache{now: func() time.Time {
        return fixedTime
    }}
    
    // Option 2: Accept time as parameter
    func (c *Cache) TrimOlderThan(t time.Time)
    ```

- [ ] **#88: Not Using testing Utility Packages** `LOW`
  - **Check for:**
    - HTTP tests without `httptest` package
    - Reader/Writer tests without `iotest` package
  - **httptest:**
    - `httptest.NewRecorder()` for handler testing
    - `httptest.NewServer()` for client testing
  - **iotest:**
    - `iotest.TestReader()` for custom reader validation
    - `iotest.ErrReader()`, `iotest.TimeoutReader()` for error resilience testing

### Benchmarking

- [ ] **#89: Writing Inaccurate Benchmarks** `HIGH`
  - **Check for:**
    - Expensive setup inside benchmark loop without timer reset
    - Not assigning results to prevent compiler optimization
    - Micro-benchmarks without understanding of observer effect
  - **Best practices:**
    ```go
    var result int // global
    
    func BenchmarkFoo(b *testing.B) {
        // Expensive setup
        data := createLargeDataset()
        b.ResetTimer() // reset after setup
        
        var r int // local
        for i := 0; i < b.N; i++ {
            r = foo(data) // assign to local
        }
        result = r // assign to global
    }
    
    // For per-iteration setup
    func BenchmarkBar(b *testing.B) {
        for i := 0; i < b.N; i++ {
            b.StopTimer()
            setup()
            b.StartTimer()
            bar()
        }
    }
    ```
  - **Avoid observer effect:** Recreate data in CPU-bound benchmarks
  - **Use:** `benchstat` tool for statistical analysis

- [ ] **#90: Not Exploring All the Go Testing Features** `LOW`
  - **Check for:**
    - Missing code coverage analysis
    - Tests not using `-coverpkg` for cross-package coverage
    - No setup/teardown when needed
  - **Features:**
    - `-coverprofile=coverage.out` then `go tool cover -html=coverage.out`
    - `-coverpkg=./...` for full coverage
    - `TestMain(m *testing.M)` for package-level setup/teardown
    - `t.Cleanup()` for test-specific cleanup
    - `t.Helper()` for utility functions (better error reporting)
    - Test from `package_test` to enforce public API only

---

## 11. Optimizations

### CPU & Memory

- [ ] **#91: Not Understanding CPU Caches** `MEDIUM`
  - **Check for:**
    - Data structures not optimized for cache locality
    - Random memory access patterns in hot paths
  - **Key concepts:**
    - Cache line = 64 bytes (typically)
    - Spatial locality: access nearby memory
    - Temporal locality: reuse recently accessed memory
  - **Optimization:** Organize data sequentially, access sequentially
  - **Example:** Slice of structs vs struct of slices (struct of slices often faster for column access)

- [ ] **#92: Writing Concurrent Code That Leads to False Sharing** `HIGH`
  - **Check for:**
    - Concurrent goroutines modifying adjacent fields (within same cache line)
    - Parallel counters/metrics in same struct
  - **Issue:** Cache line invalidation affects nearby variables even if logically independent
  - **Solution:**
    ```go
    // BAD
    type Metrics struct {
        counter1 int64
        counter2 int64 // false sharing!
    }
    
    // GOOD - add padding
    type Metrics struct {
        counter1 int64
        _        [56]byte // cache line padding
        counter2 int64
    }
    ```
  - **Impact:** Can cause 40%+ performance degradation

- [ ] **#93: Not Taking Into Account Instruction-Level Parallelism** `LOW`
  - **Check for:** CPU-bound hot paths with data hazards
  - **Look for:** Sequential operations that could be restructured for parallel execution
  - **Advanced optimization:** Reduce data dependencies to allow CPU parallel execution
  - **Note:** Only relevant for performance-critical CPU-bound code

- [ ] **#94: Not Being Aware of Data Alignment** `MEDIUM`
  - **Check for:**
    - Structs with fields in random order
    - Large structs in hot paths
  - **Best practice:** Sort struct fields by size descending
  - **Impact:**
    ```go
    // BAD - 24 bytes
    type Foo struct {
        b1 byte  // 1 byte + 7 padding
        i  int64 // 8 bytes
        b2 byte  // 1 byte + 7 padding
    }
    
    // GOOD - 16 bytes
    type Foo struct {
        i  int64 // 8 bytes
        b1 byte  // 1 byte
        b2 byte  // 1 byte + 6 padding
    }
    ```
  - **Benefit:** Reduced memory, better cache locality

### Stack vs Heap

- [ ] **#95: Not Understanding Stack vs. Heap** `HIGH`
  - **Check for:**
    - Unnecessary pointer usage "to avoid copy"
    - Returning pointers to local variables without reason
  - **Key concepts:**
    - Stack: Fast, no GC needed, goroutine-local, self-cleaning
    - Heap: Slower, requires GC, shared across goroutines
  - **Escape analysis rules:**
    - Sharing down → stack
    - Sharing up → heap (returning pointer to local)
    - Global variables → heap
    - Pointer sent to channel → heap
    - Variable too large → heap
    - Variable size unknown at compile time → heap
  - **Check:** `go build -gcflags="-m"` to see escape analysis
  - **Best practice:** Prefer values unless semantics require sharing

- [ ] **#96: Not Knowing How to Reduce Allocations** `MEDIUM`
  - **Check for:**
    - Hot paths with frequent allocations
    - Opportunities to reuse objects
  - **Techniques:**
    - Pre-allocate slices/maps with known size
    - Return values not pointers when possible
    - Use `sync.Pool` for frequently allocated temporary objects
    - Avoid string concatenation in loops (use `strings.Builder`)
  - **Pattern:**
    ```go
    var bufferPool = sync.Pool{
        New: func() any {
            return make([]byte, 1024)
        },
    }
    
    func process() {
        buf := bufferPool.Get().([]byte)
        buf = buf[:0] // reset
        defer bufferPool.Put(buf)
        // use buf
    }
    ```

### Compiler & Runtime

- [ ] **#97: Not Relying on Inlining** `LOW`
  - **Check for:** Small, frequently-called functions not being inlined
  - **Use:** Fast-path inlining pattern (extract slow path to separate function)
  - **Check inlining:** `go build -gcflags="-m=2"`
  - **Pattern:**
    ```go
    // Fast path inlined
    func Lock() {
        if atomic.CompareAndSwapInt32(&m.state, 0, 1) {
            return
        }
        m.lockSlow() // slow path extracted
    }
    ```

- [ ] **#98: Not Using Go Diagnostics Tooling** `CRITICAL`
  - **Check for:**
    - Performance optimization without profiling
    - Production services without pprof enabled
  - **Tools:**
    - **CPU profile:** `go test -cpuprofile=cpu.out` or `/debug/pprof/profile`
    - **Heap profile:** `/debug/pprof/heap`
    - **Goroutine profile:** `/debug/pprof/goroutine`
    - **Block profile:** `runtime.SetBlockProfileRate()`, `/debug/pprof/block`
    - **Mutex profile:** `runtime.SetMutexProfileFraction()`, `/debug/pprof/mutex`
    - **Execution tracer:** `go test -trace=trace.out`
  - **Best practice:**
    - Enable pprof in production (safe, minimal overhead)
    - Profile before optimizing (don't guess)
    - Use `go tool pprof -http=:8080 profile.out`

- [ ] **#99: Not Understanding How the GC Works** `MEDIUM`
  - **Check for:**
    - Applications with GC-induced latency issues
    - Unnecessary heap allocations
    - Wrong `GOGC` configuration for workload
  - **Key concepts:**
    - GC triggered when heap doubles (default `GOGC=100`)
    - Stop-the-world phases use 25% CPU
    - More heap allocations = more GC pressure
  - **Tuning:**
    - Reduce `GOGC` for slower heap growth (more frequent GC)
    - Increase `GOGC` for request bursts (less frequent GC)
    - Consider `debug.SetGCPercent()` or `GOGC` env var
  - **Trace GC:** `GODEBUG=gctrace=1`

- [ ] **#100: Not Understanding the Impacts of Running Go in Docker and Kubernetes** `CRITICAL`
  - **Check for:**
    - Deployments without `GOMAXPROCS` configuration
    - CPU throttling in Kubernetes (high latency spikes)
  - **Issue:**
    - `GOMAXPROCS` defaults to host CPU count, not container limits
    - Can create more threads than CPU quota allows → throttling
  - **Solution:**
    ```go
    import _ "go.uber.org/automaxprocs"
    ```
  - **Impact:** Can cause 300% latency penalty if not addressed
  - **Alternative:** Manually set `GOMAXPROCS` to match container CPU limit

---

## Special Review Sections

### Critical Security & Correctness

**Review these with extra scrutiny in ALL PRs:**

1. `#25` - Unexpected slice append side effects → Data corruption
2. `#26` - Slice memory leaks → Memory exhaustion
3. `#45` - Returning nil receiver → nil pointer panics
4. `#48` - Inappropriate panicking → Service crashes
5. `#58` - Data races → Undefined behavior
6. `#62` - Goroutine leaks → Resource exhaustion
7. `#63` - Goroutine loop variable bugs → Wrong data processing
8. `#69` - Data races with append → Corruption
9. `#74` - Copying sync types → Data races, deadlocks
10. `#79` - Not closing resources → Resource leaks
11. `#81` - Default HTTP client/server → Hangs, timeouts in production

### Automated Checks (Should be in CI)

These should be caught by CI, but verify they ran:

- `#1` - Variable shadowing (`go vet -vettool=shadow`)
- `#15` - Missing documentation (linters)
- `#16` - Linter execution (`golangci-lint`)
- `#17` - Octal literal confusion (linters)
- `#53` - Unhandled errors (`errcheck`)
- `#74` - Copying sync types (`go vet`)
- `#83` - Race conditions (`go test -race`)

### Pre-Production Checklist

**Before deploying to production, verify:**

- All tests pass with `-race` flag
- HTTP clients have timeouts configured (#81)
- HTTP servers have timeouts configured (#81)
- Database connection pools configured (#78)
- `GOMAXPROCS` handled for containerized environments (#100)
- pprof endpoints enabled for diagnostics (#98)
- Resource cleanup uses defer correctly (#79, #54)

---

## Quick Reference: Common Patterns to Watch

### Dangerous Patterns (Always Review)

```go
// 1. Shadowing in conditionals
if x, err := foo(); err != nil { } // shadows x from outer scope

// 2. Goroutine with loop variable
for _, item := range items {
    go func() { use(item) }() // BUG!
}

// 3. Slice append side effects
s2 := s1[:2]
s2 = append(s2, x) // might modify s1!

// 4. Missing return after http.Error
if err != nil {
    http.Error(w, "error", 500)
    // missing return - continues execution!
}

// 5. Defer in loop
for _, file := range files {
    f, _ := os.Open(file)
    defer f.Close() // doesn't close until function returns!
}

// 6. Nil pointer to interface
var p *MyType
return p // returns non-nil interface!

// 7. Unchecked slice copy
var dst []int
copy(dst, src) // copies 0 elements

// 8. Map/slice with ==
if slice1 == slice2 { } // compile error
if any1 == any2 { } // can panic at runtime
```

### Performance Red Flags

```go
// 1. String concatenation in loops
for _, s := range strings {
    result += s // creates new string each time
}

// 2. time.After in loops
for {
    select {
    case <-time.After(time.Hour): // memory leak!
    }
}

// 3. Unnecessary conversions
bytes.TrimSpace([]byte(string(b))) // double conversion

// 4. Empty slice initialization
for _, x := range data {
    results = append(results, process(x)) // repeated growth
}

// 5. Default HTTP client
http.Get(url) // no timeouts!
```

---

## Usage Notes

1. **Severity Guidelines:**
   - `CRITICAL`: Can cause crashes, data loss, security issues, or production outages
   - `HIGH`: Can cause bugs, memory leaks, or significant performance issues
   - `MEDIUM`: Can cause confusion, maintainability issues, or minor performance impacts
   - `LOW`: Style, convention, or nice-to-have improvements

2. **Review Approach:**
   - For new features: Focus on #62, #63, #25, #26, #81, #100
   - For concurrent code: All items in sections 7-8
   - For performance optimization: Verify with profiling (#98) before merging
   - For API changes: #4-#11, #46

3. **When in Doubt:**
   - Run `go vet ./...`
   - Run `golangci-lint run`
   - Run tests with `-race -shuffle=on -cover`
   - Check `go build -gcflags="-m"` for escape analysis

4. **Remember:**
   - Readability > Performance (in most cases)
   - Correctness > Everything
   - Profile before optimizing (#98)
   - Tests should prove correctness, not assume it
