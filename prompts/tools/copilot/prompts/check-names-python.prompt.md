---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git branch:*), Bash(git checkout:*)
argument-hint: [scope]
description: Check the naming of variables, methods, classes and functions in python code, in the files selected by the user.
---

### **Prompt:**

Analyze the provided Python code. Your task is to refactor the code by performing two main actions:

1.  **Review and Correct Naming Conventions:** Systematically check all variable, function, class, and method names against Python's **PEP 8** style guide.
2.  **Generate Inline Documentation:** Create clear and compliant docstrings for each class, method, and function.

Follow the specific instructions below.

---

### **1. Code for Analysis**

```python
# PASTE YOUR PYTHON CODE HERE
```

---

### **2. PEP 8 Naming Convention Rules**

Apply the following standard Python naming conventions. If a name does not comply, rename it and ensure all its usages are updated throughout the code.

- **Variables & Functions:** Use **snake_case** (e.g., `user_data`, `calculate_total_price()`).
- **Constants:** Use **UPPERCASE_SNAKE_CASE** (e.g., `MAX_CONNECTIONS`, `API_KEY`).
- **Classes:** Use **PascalCase** (also known as CapWords) (e.g., `DatabaseConnection`, `UserProfile`).
- **Methods:** Use **snake_case** (e.g., `get_username()`, `update_email()`).

---

### **3. Documentation Generation Rules**

Generate **Google-style docstrings** for all classes, methods, and functions. The docstrings should be comprehensive and include the following sections where applicable:

- A brief, one-line summary of the object's purpose.
- A more detailed description if necessary.
- `Args:` section to describe each parameter, its type, and its purpose.
- `Returns:` section to describe the return value, its type, and what it represents.
- `Raises:` section to list any exceptions that the code might raise.

**Example of a Google-style docstring:**

```python
def example_function(param1: int, param2: str) -> bool:
    """Calculates a result based on two inputs.

    This function serves as an example to demonstrate the expected
    docstring format.

    Args:
        param1 (int): The first integer parameter.
        param2 (str): The second string parameter.

    Returns:
        bool: True if the calculation is successful, False otherwise.

    Raises:
        ValueError: If param1 is a negative number.
    """
    if param1 < 0:
        raise ValueError("param1 cannot be negative.")
    return True
```

---

### **4. Output Requirements**

Present the final output as a **single, complete Python code block** containing the refactored code. The final code must have:

1.  All names corrected to follow PEP 8 conventions.
2.  Comprehensive, well-formatted Google-style docstrings added to all classes, functions, and methods.
3.  A brief summary at the very top of the script (as a multiline comment) listing the major renaming and documentation changes made.
