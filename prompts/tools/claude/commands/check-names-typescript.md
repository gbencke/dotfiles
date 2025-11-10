---
allowed-tools: Bash(git add:_), Bash(git status:_), Bash(git commit:_), Bash(git branch:_), Bash(git checkout:\*)
argument-hint: [scope]
description: Check the naming of variables, methods, classes and functions in typescript code, in the files selected by the user.
---

### **Prompt:**

Analyze the provided TypeScript in the scope specified by $1 . Your task is to refactor the code by performing two main actions:

1.  **Review and Correct Naming Conventions:** Systematically check all variable, function, class, interface, type, and method names against standard TypeScript conventions.
2.  **Generate Inline Documentation:** Create clear and compliant **JSDoc** comments for each exported class, interface, type, method, and function.

Follow the specific instructions below.

---

### **1. Code for Analysis**

```typescript
// PASTE YOUR TYPESCRIPT CODE HERE
```

---

### **2. Naming Convention Rules**

Apply the following standard TypeScript naming conventions. If a name does not comply, rename it and ensure all its usages are updated throughout the code.

- **Variables, Functions, & Methods:** Use **camelCase** (e.g., `userData`, `calculateTotalPrice()`).
- **Constants:** Use **UPPERCASE_SNAKE_CASE** for global or immutable constants (e.g., `MAX_CONNECTIONS`, `API_KEY`). Use `camelCase` for block-scoped `const` declarations that are not global constants.
- **Classes, Interfaces, & Type Aliases:** Use **PascalCase** (also known as CapWords) (e.g., `DatabaseConnection`, `IUserProfile`, `AuthToken`).
- **Private Properties & Methods:** Prefix with an underscore `_` (e.g., `_privateState`, `_internalCalculation()`).

---

### **3. Documentation Generation Rules**

Generate **JSDoc** comment blocks (`/** ... */`) for all exported classes, interfaces, types, methods, and functions. The documentation should be comprehensive and include the following tags where applicable:

- A brief, one-line summary of the object's purpose.
- A more detailed description if necessary.
- `@param {type} name` - A description of each parameter, its type, and its purpose.
- `@returns {type}` - A description of the return value, its type, and what it represents.
- `@throws {ErrorType}` - A description of any errors that the code might throw.
- `@example` - An optional usage example.

**Example of a JSDoc comment block:**

```typescript
/**
 * Calculates a result based on two inputs.
 *
 * This function serves as an example to demonstrate the expected
 * JSDoc format for a TypeScript function.
 *
 * @param {number} userId - The ID of the user to process.
 * @param {string} sessionToken - The authentication token for the session.
 * @returns {boolean} True if the calculation is successful, false otherwise.
 * @throws {Error} If the sessionToken is invalid or expired.
 */
function exampleFunction(userId: number, sessionToken: string): boolean {
  if (!sessionToken) {
    throw new Error("Invalid session token provided.");
  }
  // ... function logic
  return true;
}
```

---

### **4. Output Requirements**

Present the final output as a **single, complete TypeScript code block** containing the refactored code. The final code must have:

1.  All names corrected to follow standard TypeScript conventions.
2.  Comprehensive, well-formatted JSDoc comments added to all relevant code elements.
3.  A brief summary at the very top of the script (as a multiline comment `/* ... */`) listing the major renaming and documentation changes made.
