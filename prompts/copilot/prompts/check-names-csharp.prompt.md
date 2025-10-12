---
allowed-tools: Bash(git add:_), Bash(git status:_), Bash(git commit:_), Bash(git branch:_), Bash(git checkout:\*)
argument-hint: [scope]
description: Check the naming of variables, methods, classes and functions in C\# code, in the files selected by the user.
---

### **Prompt:**

Analyze the provided C\# code in the scope specified by $1. Your task is to refactor the code by performing two main actions:

1.  **Review and Correct Naming Conventions:** Systematically check all class, interface, method, property, and variable names against standard Microsoft C\# coding conventions.
2.  **Generate Inline Documentation:** Create clear and compliant **XML Documentation Comments** for all public-facing types and members.

Follow the specific instructions below.

---

### **1. Code for Analysis**

```csharp
// PASTE YOUR C# CODE HERE
```

---

### **2. C\# Naming Convention Rules**

Apply the following standard C\# naming conventions. If a name does not comply, rename it and ensure all its usages are updated throughout the code.

- **Classes, Interfaces, Enums, Structs, & Delegates:** Use **PascalCase** (e.g., `DatabaseConnection`, `ILoggerService`).
- **Interfaces:** Prefix with an `I` (e.g., `IUserRepository`).
- **Public Methods, Properties, & Events:** Use **PascalCase** (e.g., `CalculateTotal()`, `UserName`).
- **Method Parameters & Local Variables:** Use **camelCase** (e.g., `userId`, `totalPrice`).
- **Private or Internal Fields:** Use **`_camelCase`** (e.g., `_connectionString`).
- **Constants (`const`) & `readonly` fields:** Use **PascalCase** (e.g., `MaxConnections`, `ApiKey`).

---

### **3. Documentation Generation Rules**

Generate **XML Documentation Comments** (`///`) for all public classes, interfaces, methods, and properties. The documentation should be comprehensive and use the following standard XML tags where applicable:

- `<summary>`: A brief description of the type or member's purpose.
- `<param name="name">`: A description of a method's parameter.
- `<returns>`: A description of a method's return value.
- `<exception cref="ExceptionType">`: A description of an exception that may be thrown.
- `<remarks>`: Optional extra information about the type or member.

**Example of an XML Documentation Comment block:**

```csharp
/// <summary>
/// Processes user data based on the provided session information.
/// </summary>
/// <param name="userId">The unique identifier for the user.</param>
/// <param name="sessionToken">The authentication token for the current session.</param>
/// <returns>A boolean value indicating if the processing was successful.</returns>
/// <exception cref="System.ArgumentException">Thrown when userId is less than or equal to zero.</exception>
/// <exception cref="System.Security.Authentication.AuthenticationException">Thrown when the sessionToken is invalid.</exception>
public bool ProcessUserData(int userId, string sessionToken)
{
    if (userId <= 0)
    {
        throw new System.ArgumentException("User ID must be positive.", nameof(userId));
    }
    // ... function logic
    return true;
}
```

---

### **4. Output Requirements**

Present the final output as a **single, complete C\# code block** containing the refactored code. The final code must have:

1.  All names corrected to follow standard C\# conventions.
2.  Comprehensive, well-formatted XML documentation comments added to all public types and members.
3.  A brief summary at the very top of the script (as a multiline comment `/* ... */`) listing the major renaming and documentation changes made.
