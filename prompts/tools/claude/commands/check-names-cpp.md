---
allowed-tools: Bash(git add:_), Bash(git status:_), Bash(git commit:_), Bash(git branch:_), Bash(git checkout:\*)
argument-hint: [scope]
description: Check the naming of variables, methods, classes and functions in C++ code, in the files selected by the user.
---

### **Prompt:**

Analyze the provided C++17 code. Your task is to refactor the code by performing two main actions:

1.  **Review and Correct Naming Conventions:** Systematically check all namespaces, classes, structs, functions, variables, and constants against common C++ style guides.
2.  **Generate Inline Documentation:** Create clear and compliant **Doxygen** documentation comments for all public-facing elements.

Follow the specific instructions below.

---

### **1. Code for Analysis**

```cpp
// PASTE YOUR C++ CODE HERE
```

---

### **2. C++ Naming Convention Rules**

Apply the following C++ naming conventions. If a name does not comply, rename it and ensure all its usages are updated throughout the code.

- **Namespaces, Classes, Structs, & Enums:** Use **PascalCase** (e.g., `DatabaseConnection`, `UserData`).
- **Functions & Methods:** Use **snake_case** (e.g., `calculate_total_price()`, `get_user_name()`).
- **Variables & Function Parameters:** Use **snake_case** (e.g., `user_data`, `is_active`).
- **Constants (`constexpr`, `const`) & Macros:** Use **UPPERCASE_SNAKE_CASE** (e.g., `MAX_CONNECTIONS`, `API_KEY`).
- **Private/Protected Member Variables:** Use **snake_case** with a trailing underscore (e.g., `connection_string_`, `user_cache_`).

---

### **3. Documentation Generation Rules**

Generate **Doxygen** documentation comments (using `///` or `/** ... */` style) for all public namespaces, classes, methods, and functions. The documentation should be comprehensive and use the following standard Doxygen commands where applicable:

- `@brief`: A brief, one-line summary of the element's purpose.
- `@param`: A description of a function's or method's parameter.
- `@return`: A description of the function's or method's return value.
- `@throws`: A description of an exception that may be thrown.
- `@note`: An optional note to provide additional information.

**Example of a Doxygen Comment Block:**

```cpp
/**
 * @brief Processes user data based on the provided session information.
 *
 * This function serves as an example to demonstrate the expected
 * Doxygen format for a C++ function.
 *
 * @param user_id The unique identifier for the user.
 * @param session_token The authentication token for the current session.
 * @return True if the processing was successful, false otherwise.
 * @throws std::invalid_argument If the user_id is zero or negative.
 */
bool process_user_data(int user_id, const std::string& session_token) {
    if (user_id <= 0) {
        throw std::invalid_argument("User ID must be a positive integer.");
    }
    // ... function logic
    return true;
}
```

---

### **4. Output Requirements**

Present the final output as a **single, complete C++ code block** containing the refactored code. The final code must have:

1.  All names corrected to follow the specified conventions.
2.  Comprehensive, well-formatted Doxygen comments added to all public-facing elements.
3.  A brief summary at the very top of the script (as a multiline comment `/* ... */`) listing the major renaming and documentation changes made.
