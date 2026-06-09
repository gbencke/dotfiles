# Pi Skills

Agent skills for the `pi` CLI. Each subdirectory is one skill: a `SKILL.md`
file with YAML frontmatter (`name`, `description`, optional `argument-hint`)
plus any scripts, templates, or reference docs the skill needs.

The agent loads a skill when a user request matches its `description`. Some
skills also expose a slash command (e.g. `/diagnose`, `/zinsser`).

## How skills work

- **`SKILL.md`** — the skill's instructions. Frontmatter declares the name and
  the trigger description; the body holds the procedure the agent follows.
- **`description`** — drives discovery. The agent reads it to decide when the
  skill applies, so it lists trigger phrases and slash commands.
- **`disable-model-invocation: true`** — the skill runs only on explicit
  invocation (slash command or by name), never auto-selected by the model.
- **Supporting files** — scripts, templates, and `references/` docs live beside
  `SKILL.md` and are resolved relative to the skill directory.

## Skill catalog

### Writing & communication

| Skill | What it does |
|-------|--------------|
| `zinsser` | Rewrites text with William Zinsser's "On Writing Well" method — strips clutter, enforces clarity and brevity. |
| `caveman` | Ultra-compressed reply mode. Cuts ~75% of tokens by dropping filler while keeping technical accuracy. |
| `storm` | Deep research-and-write pipeline (STORM method) producing grounded, comprehensive articles with human-in-the-loop feedback. |

### Code quality & analysis

| Skill | What it does |
|-------|--------------|
| `diagnose` | Disciplined debugging loop: reproduce → minimise → hypothesise → instrument → fix → regression-test. Includes a HITL loop template. |
| `thermo-nuclear-code-quality-review` | Extremely strict maintainability review for abstraction quality, giant files, and spaghetti conditions. Explicit invocation only. |
| `change-amplification` | Analyses recent merged PRs for Ousterhout's "change amplification" and produces a ranked architectural-debt backlog. |
| `lsp` | Structural code analysis, navigation, and diagnostics using ast-grep. |
| `zoom-out` | Steps back to give higher-level context on how a piece of code fits the bigger picture. Explicit invocation only. |

### Planning & thinking

| Skill | What it does |
|-------|--------------|
| `possibility-analysis` | Rigorously maps a solution space before collapsing it to a decision. Ships reference docs on cognitive models, domain patterns, and uncertainty handling. |
| `grill-with-docs` | Stress-tests a plan against the project's domain model and documented decisions, updating CONTEXT.md and ADRs inline. |
| `find-skills` | Helps discover and install other agent skills. |

### Web & research tools

| Skill | What it does |
|-------|--------------|
| `tavily` | AI-powered web search for docs, error troubleshooting, and summaries. |
| `obscura` | Web scraping and automation via the Obscura headless browser. |
| `context7` | Searches the Context7 index for version-accurate library documentation. |
| `raindrop` | Manages Raindrop.io bookmarks, collections, tags, and highlights via REST. |
| `yt-dlp` | Downloads audio/video from YouTube and 1000+ sites. Bundles a `yt-dlp` binary and tests. |
| `daily-digest` | Generates "The Architect's Digest" — a curated daily briefing from HN, Lobsters, GitHub Trending, InfoQ, and engineering blogs. |
| `session-viewer` | Renders Codex/Claude Code/OpenClaw/Pi JSONL transcripts as a searchable single-file HTML viewer. TypeScript importers + tests. |

### Obsidian vault & meeting workflows

| Skill | What it does |
|-------|--------------|
| `action-items` | Manages a personal action-item log — add, show recent, search by keyword. |
| `daily-workstream-update` | Runs the full daily workstream workflow: summaries, syncs, decisions, action items, then publishes to git. |
| `deep-dive` | Builds a 16-section deep-dive technical document from meeting transcripts and summaries. |
| `meeting-action-items` | Produces a per-person action-items report grouped by owner across meeting summaries. |
| `process-root-transcripts` | Converts root `*.txt` transcripts into Obsidian transcript+summary pairs, then commits and pushes. |
| `project-decisions` | Maintains `PROJECT_DECISIONS.md` — extracts and categorises decisions from meeting summaries. |
| `decision-svg` | Extracts architectural decisions from a note and embeds them as an inline SVG decision map. |

### PlatformSync & infrastructure ops

| Skill | What it does |
|-------|--------------|
| `platformsync-inbound-queue` | Reports inbound-events DynamoDB row counts by status and message type; promotes eligible WAIT rows. |
| `platformsync-inbound-capacity` | Reports consumed vs provisioned RCU/WCU and throttle events for the inbound-events table and its GSIs. |
| `platformsync-inbound-provisioning` | Switches the inbound-events table between on-demand and provisioned billing, with dry-run and confirmation. |
| `sqa-aurora-health` | Reports ACU, CPU, and connection health for all Aurora Serverless v2 clusters in SQA, with trend analysis. |

## Adding a skill

1. Create a directory named after the skill.
2. Add `SKILL.md` with frontmatter:
   ```yaml
   ---
   name: my-skill
   description: >
     What it does. Use when asked to "...", or invokes /my-skill.
   argument-hint: "[optional]"        # optional
   disable-model-invocation: true     # optional — explicit invocation only
   ---
   ```
3. Write the procedure in the body. Keep it concrete and command-oriented.
4. Place scripts, templates, and `references/` files in the same directory;
   reference them by path relative to the skill directory.
5. Add a row to the catalog above.
