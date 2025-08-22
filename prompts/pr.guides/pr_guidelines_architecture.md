You are an expert software architect and senior developer. Your task is to create a comprehensive code review checklist designed for software development teams.

This checklist must go beyond simple syntax or style checks. Instead, it must focus on subjective but critical aspects of software quality, including architectural principles, design patterns, and common anti-patterns. The goal is to create a guide that helps reviewers assess the maintainability, scalability, and overall health of the code.

Please generate the checklist in **Markdown format**.

**Instructions:**

Structure the checklist into the following distinct sections, using the specified headings. For each item in the checklist, frame it as a direct, actionable question that a reviewer can ask themselves.

---

### ## 🏛️ SOLID Principles

For each of the five SOLID principles, provide a brief one-sentence explanation and one or two key questions to evaluate compliance.

* **Single Responsibility Principle (SRP)**
* **Open/Closed Principle (OCP)**
* **Liskov Substitution Principle (LSP)**
* **Interface Segregation Principle (ISP)**
* **Dependency Inversion Principle (DIP)**

---

### ## ✍️ General Principles & Readability

This section should cover core software development philosophies that promote clean, simple, and maintainable code.

* **DRY (Don't Repeat Yourself):** Focus on identifying duplicated logic.
* **KISS (Keep It Simple, Stupid):** Focus on avoiding unnecessary complexity.
* **YAGNI (You Ain't Gonna Need It):** Focus on preventing speculative, unused code.
* **Clarity and Naming:** Focus on how intuitive the code is.
* **Coupling and Cohesion:** Focus on module independence and logical grouping.

---

### ## 🚫 Common Anti-Patterns Checklist

Create a list of common anti-patterns to watch out for. For each anti-pattern, provide a brief description and a question to help a reviewer spot it. Include at least the following:

* **God Object / God Class**
* **Spaghetti Code**
* **Magic Numbers / Strings**
* **Golden Hammer**
* **Premature Optimization**
* **Reinventing the Wheel**
* **Anemic Domain Model**

---

### ## 🏗️ Architectural Concerns

This section should cover higher-level structural considerations.

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
