---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git branch:*), Bash(git checkout:*)
argument-hint: [scope] [path]
description: Start Code review, 
---

# Review Code

## Check Prerequisites

The $1 argument should be: "source-tree" or "staged-files" or "current-branch"
if $1 argument is "source-tree", then $2 argument should be the path, relative to the repo root, if the argument $2 is not provided, then STOP.

## Create Git Branch

If everything is OK, then create a new branch by running the following command:
```
git checkout -b "$(git branch --show-current)-review-$(date '+%Y%m%d-%H%M%S')"
```

## Load the Scope

After the checkout was executed successfully, then load all the files from the path provided and its subdirectories into the context.

## Execute the Code Review

You are an expert software architect and senior developer. 

This checklist helps guide code reviews by focusing on improving the internal structure and design of the code without changing its external behavior. It's structured according to the refactoring pyramid, starting with small, local improvements and moving to larger, structural ones.

***

## 🧐 Level 1: Micro-Refactorings (The Foundation: Cleanliness & Clarity)

This level focuses on the "small stuff" that makes code readable, understandable, and easy to work with. These are often quick wins that have a big impact on maintainability.

* **Naming Conventions:**
    * Are the names of variables, functions, classes, and methods **clear, descriptive, and unambiguous**? Do they reveal their intent?
    * Is a consistent naming scheme used throughout the code?
* **Function & Method Design:**
    * Are functions and methods **short and focused** on doing only one thing? (Addresses the **Long Method** smell).
    * Is the parameter list short and intuitive? (Addresses the **Long Parameter List** smell). Consider using `Introduce Parameter Object` if you see a group of parameters that are always passed together (**Data Clumps**).
* **Clarity and Simplicity:**
    * Is the code free of **Duplicate Code**? (This is one of the most important smells to look for).
    * Are there unnecessary **Comments**? Good code should be self-documenting. Comments should explain *why* something is done, not *what* it does.
    * Is there any **Dead Code** (unreachable or unused variables, functions, or classes) that can be removed?
* **Variable Management:**
    * Are variables declared as close as possible to where they are used?
    * Are temporary variables used excessively where a query method could be used instead? (See `Replace Temp with Query`).

***

## 📐 Level 2: Design & Structure (The Mid-Level: Good OO Principles)

This level examines how classes and components interact. It's about ensuring a solid, flexible, and maintainable object-oriented design.

* **Class Responsibility & Cohesion:**
    * Does each class have a **single, well-defined responsibility**? (Single Responsibility Principle).
    * Is the class trying to do too much? (Addresses the **Large Class** smell). Consider using `Extract Class` to split responsibilities.
    * Does a method seem more interested in the data of another class than its own? (This is **Feature Envy**). Consider `Move Method` to place the behavior closer to the data it uses.
* **Coupling & Dependencies:**
    * Are classes **loosely coupled**? Does changing one class necessitate changes in many others (**Shotgun Surgery**)?
    * Does one change to a class require many small changes within that same class for different reasons (**Divergent Change**)?
    * Is there excessive communication between objects through a long chain of calls? (This is a **Message Chain**).
* **Abstraction & Flexibility:**
    * Are complex `if/else` or `switch` statements used where **polymorphism** would be a cleaner solution? (Addresses the **Switch Statements** smell). Consider using `Replace Conditional with Polymorphism`.
    * Are primitive types used where a dedicated object would make the code more robust and expressive? (This is **Primitive Obsession**). For example, using a `Money` or `EmailAddress` class instead of raw strings and numbers.
* **Inheritance and Composition:**
    * Is inheritance being used appropriately? Is the "is-a" relationship valid?
    * Does a subclass use only a small portion of its parent's methods and properties? (This could be **Refused Bequest**). Consider favoring composition over inheritance.

***

## 🏛️ Level 3: Architecture (The Big Picture)

This level is for looking beyond individual classes to see how the change fits within the entire system. These points are especially important for larger features or significant modifications.

* **Component Boundaries:**
    * Does this change respect the application's established architectural layers and boundaries (e.g., controller, service, repository)?
    * Does it introduce a new, undesirable dependency between high-level modules or services?
* **System-Wide Consistency:**
    * Is the approach consistent with how similar problems are solved elsewhere in the codebase?
    * Is it handling cross-cutting concerns like **logging, error handling, and security** in a way that aligns with the established architectural patterns?
* **Impact and Scalability:**
    * Could this change have an unintended impact on system performance or scalability?
    * Does the change align with the long-term technical vision for the project (e.g., moving towards microservices, adopting a new framework)?

## Execute the Architectural Code Review

Perform a code review of the code loaded into the context.

This is a checklist that must go beyond simple syntax or style checks. Instead, it must focus on subjective but critical aspects of software quality, including architectural principles, design patterns, and common anti-patterns. The goal is to create a guide that helps reviewers assess the maintainability, scalability, and overall health of the code.

### ## 🏛️ SOLID Principles

For each of the five SOLID principles, check its use in the code above.

* **Single Responsibility Principle (SRP)**
* **Open/Closed Principle (OCP)**
* **Liskov Substitution Principle (LSP)**
* **Interface Segregation Principle (ISP)**
* **Dependency Inversion Principle (DIP)**

---

### ## ✍️ General Principles & Readability

For each one of the principles below, check if the code above is following them

* **DRY (Don't Repeat Yourself):** Focus on identifying duplicated logic.
* **KISS (Keep It Simple, Stupid):** Focus on avoiding unnecessary complexity.
* **YAGNI (You Ain't Gonna Need It):** Focus on preventing speculative, unused code.
* **Clarity and Naming:** Focus on how intuitive the code is.
* **Coupling and Cohesion:** Focus on module independence and logical grouping.

---

### ## 🚫 Common Anti-Patterns Checklist

Please verify if the code is using anyone of the issues below:

* **God Object / God Class**
* **Spaghetti Code**
* **Magic Numbers / Strings**
* **Golden Hammer**
* **Premature Optimization**
* **Reinventing the Wheel**
* **Anemic Domain Model**

---

### ## 🏗️ Architectural Concerns

Please evaluate the following aspects of the code:

* **Separation of Concerns:** Check if distinct responsibilities (e.g., UI, business logic, data access) are properly separated.
* **Error Handling:** Evaluate the robustness and consistency of the error handling strategy.
* **State Management:** Assess how application state is managed. Is it predictable and easy to reason about?
* **Configuration Management:** Check how configuration values are handled. Are they hard-coded or managed externally?

---

**Final Output Requirements:**
* The entire response must be in Markdown.
* Use level 2 headings (`##`) for the main sections.
* Use bold text (`**`) to highlight key terms and principles.
* Use bullet points (`*`) for all checklist items.
* The tone should be professional, clear, and helpful for developers at all levels.

## Output the Results

For each comment on the code review, output the comment to the referred file above the block of code that it refers to. In the following format:

### In Case of Python

```
"""
TODO: << Title of the comment >>
<< Full description of the comment and issue found >>
```

## Finish the Review

Just finish the review, there is no need to commit anything.



