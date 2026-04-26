---
name: storm
description: Execute a deep research and writing pipeline using the STORM methodology, leveraging web tools and extensive human-in-the-loop feedback to produce grounded, comprehensive articles.
---

# STORM Deep Research Skill

This skill executes the STORM (Synthesis of Topic Outlines through Retrieval and Multi-perspective Question Answering) methodology. It transforms a topic into a comprehensive, deeply researched, and accurately cited long-form article.

## Tools to Utilize
You should use the agent's native capabilities to coordinate this pipeline:
- `tavily_search`: To fetch as many web resources as possible. Maximize `max_results` (e.g., 20) and use `search_depth: 'advanced'` to ensure broad and deep coverage.
- `obscura_web_scrape`: To extract full text from websites when deep reading is necessary for specific claims or when Tavily snippets are insufficient.
- `context7_search` / `context7_docs`: When the topic involves software libraries, use this for accurate code documentation.
- Local File Tools (`write`, `edit`, `read`, `bash`): To maintain the local `.storm` directory and its intermediate artifacts.

## Architecture & Workflow
Always maintain state and artifacts in a `.storm/<topic-slug>/` directory created in the root of the current repository. The workflow is split into **Pre-writing** and **Writing**, with human-in-the-loop checkpoints at every stage.

### Phase 1: Pre-writing
1. **Setup & Initialization**
   - Create a URL-safe slug from the user's topic (e.g., `golang-vs-rust-backend`).
   - Create the `.storm/<topic-slug>/` directory if it does not exist.
   - Initialize `.storm/<topic-slug>/reference_store.json` and `.storm/<topic-slug>/conversation_log.json`.

2. **Perspective Discovery**
   - Identify 5-7 distinct editorial perspectives based on the topic. Always include one "general perspective".
   - **Human-in-the-Loop Checkpoint 1:** Stop and ask the user to review, add, or modify the generated perspectives before proceeding.

3. **Simulated Conversation & Deep Research**
   - For each perspective, simulate a multi-turn conversation between a "Writer" (who asks deep questions based on the perspective) and an "Expert" (who provides answers).
   - In each turn, the Expert *must* use `tavily_search` (and `obscura_web_scrape` if needed) to gather evidence. Gather as many websites as possible.
   - Append raw snippets to `.storm/reference_store.json` (keyed by URL/source).
   - Append Q&A to `.storm/<topic-slug>/conversation_log.json`.
   - **Human-in-the-Loop Checkpoint 2:** After finishing the conversation simulation, ask the user if the collected sources and Q&A depth are sufficient, or if a specific perspective needs more turns/research.

4. **Outline Synthesis**
   - Generate a parametric draft outline based *only* on the topic.
   - Refine the outline using the gathered `.storm/<topic-slug>/conversation_log.json`. Merge overlapping sections.
   - Save to `.storm/<topic-slug>/outline.md`.
   - **Human-in-the-Loop Checkpoint 3:** Present the refined outline to the user. Wait for approval or edits before writing begins.

### Phase 2: Writing
1. **Section-by-Section Generation**
   - For each section in `.storm/<topic-slug>/outline.md`, generate prose by querying the closed `.storm/<topic-slug>/reference_store.json` only.
   - *Do not make external searches during writing.* All facts must be grounded in the reference store.
   - Insert inline citation markers (e.g., `[1]`, `[2]`) linking back to the reference store.
   - Save intermediate sections in `.storm/<topic-slug>/sections/`.
   - **Human-in-the-Loop Checkpoint 4:** Present drafted sections to the user iteratively or ask if they prefer to review the full draft once assembled.

2. **Polishing & Final Assembly**
   - Assemble the article. 
   - Add a lead summary section.
   - Deduplicate repeated content across sections.
   - Generate a final citation index from the used references.
   - Save the final output to `.storm/<topic-slug>/final_article.md` (or another appropriate name).
   - **Human-in-the-Loop Checkpoint 5:** Request final review from the user.

## Execution Rules
- **Be exhaustive:** Maximize the parameters of search tools to ingest as much information as context limits allow.
- **Strictly Grounded:** During Phase 2, you are forbidden from hallucinating facts or searching the web. You must only use information explicitly stored in `.storm/<topic-slug>/reference_store.json`.
- **Halt and Catch Fire:** Do not skip human-in-the-loop checkpoints. Always wait for explicit user confirmation before moving to the next numbered step.
- **Minimum length:** The final article (`final_article.md`) must contain at least **50,000 words**. Before saving, run `wc -w .storm/<topic-slug>/final_article.md` and keep expanding sections until the count is met. Every section must be substantive — no padding, no repetition. Reach the target through depth: more analysis, more examples, more evidence, more context.
