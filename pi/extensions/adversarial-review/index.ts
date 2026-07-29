/**
 * adversarial-review — adversarial multi-agent code review for pi.
 *
 * Registers two commands:
 *   /review-repo [path]            — adversarial review of a whole repository
 *   /review-change <target>        — adversarial review of a PR, branch, or patch file
 *
 * Both commands load the matching skill from this package and hand it to the
 * agent. The skills orchestrate subagents via pi's built-in `Agent` tool.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

function baseDir(): string {
  // Prefer the real location of this file; fall back to the canonical path.
  try {
    const here = fileURLToPath(new URL(".", import.meta.url));
    if (existsSync(join(here, "skills"))) return here;
  } catch {
    /* bundled — use canonical path */
  }
  return join(homedir(), ".pi", "agent", "extensions", "adversarial-review");
}

function loadSkill(pi: ExtensionAPI, name: string, args: string, hasUI: boolean) {
  const base = baseDir();
  const skillPath = join(base, "skills", name, "SKILL.md");
  if (!existsSync(skillPath)) {
    const msg = `adversarial-review: skill not found at ${skillPath}`;
    if (hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
    else console.error(msg);
    return;
  }
  const skill = readFileSync(skillPath, "utf8");
  const content = [
    `You are running the "${name}" skill of the adversarial-review extension.`,
    `Extension base directory (resolve ALL relative references in the skill against this): ${base}`,
    `Review target argument (may be empty — the skill says how to default): ${args || "(none)"}`,
    ``,
    `Follow this skill exactly:`,
    ``,
    skill,
  ].join("\n");
  pi.sendMessage({ content, display: false }, { triggerTurn: true });
}

function argString(args: unknown): string {
  // pi passes the raw argument string; older code assumed string[].
  return (Array.isArray(args) ? args.join(" ") : String(args ?? "")).trim();
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("review-repo", {
    description: "Adversarial multi-agent review of a repository. Usage: /review-repo [path]",
    handler: async (args, ctx) => {
      loadSkill(pi, "review-repo", argString(args), ctx.hasUI);
    },
  });

  pi.registerCommand("review-change", {
    description:
      "Adversarial multi-agent review of a change. Usage: /review-change <pr-url|pr-number|branch|patch-file> [base]",
    handler: async (args, ctx) => {
      loadSkill(pi, "review-change", argString(args), ctx.hasUI);
    },
  });
}
