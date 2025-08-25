## The Ultimate Pre-Pull Request Self-Review Checklist

Use this checklist to thoroughly review your own code *before* you ask others to. A clean, well-documented, and well-tested PR respects your teammates' time and leads to a healthier codebase.

---

### Part 1: The Big Picture & The "Why" 🧐

*(This section ensures your PR has a clear purpose and solves the right problem in the right way.)*

* **1. Is the Purpose Clear?**
    * Does my PR title and description clearly explain **WHAT** the change is, **WHY** it's needed, and **HOW** it solves the problem?
    * Have I linked to the relevant ticket, issue, or design document (e.g., JIRA, GitHub Issue)?
    * If there are visual changes, have I included screenshots, GIFs, or a short video?

* **2. Is the Scope Correct?**
    * Does this PR address **one single concern**? Or is it a "monster PR" that should be broken down into smaller, more manageable PRs?
    * Have I included unrelated refactoring, code formatting, or "drive-by" changes? If so, should they be in a separate PR?

* **3. Is this the Right Approach?**
    * Have I considered alternative solutions? Why is this approach the best one? (Be prepared to explain this in the PR description or comments).
    * Does this change introduce a new dependency? If so, is it absolutely necessary, vetted, and secure?
    * Does this change align with the existing architecture and design patterns of the project? Or does it deviate? If it deviates, is the deviation justified and documented?

---

### Part 2: Functionality & Correctness ✅

*(This section ensures your code actually works as intended under all conditions.)*

* **4. Does It Fulfill All Requirements?**
    * Have I re-read the acceptance criteria in the ticket? Does my code meet every single one?
    * Have I tested the "happy path" (the primary, expected use case)? Does it work flawlessly?
    * Have I manually tested the changes in a local or staging environment?

* **5. Have I Considered Edge Cases?**
    * **Data:** What happens with `null`, `undefined`, empty strings (`""`), empty arrays (`[]`), `0`, or negative numbers?
    * **User Input:** Have I sanitized and validated all user-provided input to prevent security vulnerabilities (e.g., XSS, SQL Injection)?
    * **System State:** How does the code behave if a user is not logged in, has no permissions, or if a required external service is down?
    * **Logic:** Have I checked for "off-by-one" errors in loops, race conditions in concurrent code, or division-by-zero errors?

* **6. Are There Any Regressions?**
    * Could this change negatively impact other parts of the application?
    * Have I run the entire existing test suite? Do all tests still pass?
    * If this is a refactor, does the code produce the *exact same output* for a given input as it did before?

---

### Part 3: Code Quality, Readability & Maintainability 🧠

*(This section ensures your code is clean, understandable, and easy for others to work on in the future.)*

* **7. Is the Code Self-Documenting?**
    * **Naming:** Are my variables, functions, classes, and methods named descriptively and unambiguously? (e.g., `isUserActive` instead of `flag`).
    * **Clarity:** Is the code's intent immediately obvious, or is it overly clever or complex? Could a new developer understand it?
    * **Magic Numbers/Strings:** Have I replaced magic numbers and strings with named constants? (e.g., `const MAX_LOGIN_ATTEMPTS = 5;` instead of `if (attempts > 5)`).

* **8. Does It Adhere to Principles and Style?**
    * **DRY (Don't Repeat Yourself):** Have I avoided duplicating code? Is shared logic properly abstracted into reusable functions or services?
    * **SOLID Principles:**
        * **Single Responsibility:** Does each function and class have one, and only one, reason to change?
        * (And other relevant principles like KISS - Keep It Simple, Stupid).
    * **Style Guide:** Have I run the linter and code formatter (e.g., Prettier, Black, ESLint)? Does my code conform to the project's established style guide?

* **9. Are Comments Used Effectively?**
    * Have I removed all commented-out code?
    * Are my comments explaining **WHY** something is done a certain way, not **WHAT** the code is doing? The code itself should explain the "what".
    * Are there any remaining `TODO` or `FIXME` comments? If so, should they be addressed now or have a corresponding ticket linked?

---

### Part 4: Testing & Verification 🧪

*(This section ensures your changes are verifiable and won't break in the future.)*

* **10. Is the Testing Sufficient?**
    * Have I written new unit tests for the new logic I've introduced?
    * Do the tests cover both the happy path and the edge cases?
    * Have I written new integration tests if the change involves multiple components interacting?
    * Is the overall test coverage for the modified files at an acceptable level?

* **11. Are the Tests High Quality?**
    * Are my test descriptions clear and easy to understand?
    * Are the tests concise and testing only one thing at a time?
    * Are the tests robust and not "flaky" (i.e., they don't fail intermittently for no reason)?

---

### Part 5: Security, Performance, and Error Handling 🔐

*(This section covers non-functional requirements that are critical for robust applications.)*

* **12. Security:**
    * Does this change introduce any potential security vulnerabilities (OWASP Top 10)?
    * Am I logging any sensitive information (passwords, API keys, personal data)?
    * If handling authentication or authorization, have I verified the logic is sound?

* **13. Performance:**
    * Does my code introduce any obvious performance bottlenecks? (e.g., N+1 database queries, loops inside loops over large datasets).
    * Is the code efficient in its use of memory and CPU?
    * For database changes, are queries using appropriate indexes? Have I used `EXPLAIN` to analyze complex queries?

* **14. Error Handling:**
    * How does my code behave when things go wrong? Does it fail gracefully or crash the application?
    * Am I catching specific exceptions, or am I using a broad, catch-all `try...catch` block that might hide bugs?
    * Are error messages user-friendly for the end-user and developer-friendly in the logs?

---

### Part 6: Documentation & Final Polish ✨

*(This is the final check before you click "Create Pull Request".)*

* **15. Is Supporting Documentation Updated?**
    * If I changed an API endpoint, is the API documentation (e.g., Swagger, OpenAPI) updated?
    * If I added a new environment variable, is the `README.md` or configuration guide updated?
    * If I introduced a new process, is the developer documentation updated?

* **16. Is the Git History Clean?**
    * Have I rebased my branch on the latest version of the main/development branch?
    * Are my commit messages clear, concise, and following the project's conventions?
    * Have I squashed my "fixup," "typo," and "WIP" commits into logical, meaningful commits?

* **17. Final Sanity Check:**
    * Have I removed all debugging code (`console.log`, `print()`, `debugger;`)?
    * Have I read through my own code one last time, looking at the "Files Changed" tab in the PR interface? This often reveals simple mistakes.
    * Does the code actually build, compile, and run successfully from a clean state?

***

### The Golden Rule

Before submitting, ask yourself one final question: **"Am I proud of this work? Did I leave the codebase in a better state than I found it?"** If the answer is yes, you're ready to submit.
