/**
 * /tools command for pi.
 *
 * Registers a slash command that renders all available tools
 * with their names and descriptions in a styled message block.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";

const CUSTOM_TYPE = "tools-list";

interface ToolEntry {
  name: string;
  description: string;
}

export default function (pi: ExtensionAPI) {
  // ── Renderer ──────────────────────────────────────────────────────────────
  pi.registerMessageRenderer<ToolEntry[]>(CUSTOM_TYPE, (message, _options, theme) => {
    const tools = message.details ?? [];

    const lines: string[] = [
      theme.bold(theme.fg("accent", ` Available tools (${tools.length}) `)),
      theme.fg("border", "─".repeat(40)),
      "",
    ];

    for (const tool of tools) {
      lines.push(
        `  ${theme.bold(theme.fg("toolTitle", tool.name))}`
      );

      // First sentence of description only — keeps it compact
      const summary = tool.description.split(/\.\s+/)[0].replace(/\.$/, "").trim();
      lines.push(`  ${theme.fg("muted", summary)}`);
      lines.push("");
    }

    return new Text(lines.join("\n"), 0, 0);
  });

  // ── Command ───────────────────────────────────────────────────────────────
  pi.registerCommand("tools", {
    description: "List all available tools with a short description of each",
    handler: async (_args, ctx) => {
      const tools = pi.getAllTools();

      const details: ToolEntry[] = tools.map((t) => ({
        name: t.name,
        description: t.description,
      }));

      // Plain-text content (not sent to LLM — triggerTurn is false)
      const content = tools
        .map((t) => `${t.name}: ${t.description}`)
        .join("\n");

      if (ctx.hasUI) {
        // Interactive mode: render via the registered message renderer
        pi.sendMessage(
          { customType: CUSTOM_TYPE, content, display: true, details },
          { triggerTurn: false }
        );
      } else {
        // Print / RPC mode: write directly to stdout
        const lines = [`Available tools (${tools.length}):`, ""];
        for (const t of tools) {
          const summary = t.description.split(/\.\s+/)[0].replace(/\.$/, "").trim();
          lines.push(`  ${t.name}`);
          lines.push(`    ${summary}`);
          lines.push("");
        }
        process.stdout.write(lines.join("\n") + "\n");
      }
    },
  });
}
