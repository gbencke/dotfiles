/**
 * Obscura extension for pi.
 *
 * Provides one tool:
 *   - obscura_web_scrape : fetch and scrape web pages using the Obscura headless browser
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

function text(t: string) {
  return [{ type: "text" as const, text: t }];
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "obscura_web_scrape",
    label: "Obscura Web Scraper",
    description: "Fetch and scrape web pages using the Obscura headless browser.",
    promptSnippet: "obscura_web_scrape(url) – fetch a webpage via headless browser",
    parameters: Type.Object({
      url: Type.String({ description: "URL to fetch" }),
      dump: Type.Optional(
        Type.Union([Type.Literal("html"), Type.Literal("text"), Type.Literal("links")], {
          description: "What to output. Default is text.",
        })
      ),
      evaluate: Type.Optional(
        Type.String({ description: "JavaScript expression to evaluate on the page" })
      ),
      wait_until: Type.Optional(
        Type.Union([Type.Literal("load"), Type.Literal("domcontentloaded"), Type.Literal("networkidle0")], {
          description: "When to consider the page loaded",
        })
      ),
      selector: Type.Optional(
        Type.String({ description: "Wait for CSS selector before dumping" })
      ),
      stealth: Type.Optional(
        Type.Boolean({ description: "Use stealth mode to bypass anti-bot protections" })
      ),
    }),

    execute: async (_id, params, _signal) => executeObscura(params),
  });

  async function executeObscura(params: any) {
    try {
      const args = ["fetch", params.url, "--quiet"];
      
      if (params.dump) {
        args.push("--dump", params.dump);
      } else if (!params.evaluate) {
        // Default to text if not evaluating JS and no dump method provided
        args.push("--dump", "text");
      }
      
      if (params.evaluate) {
        args.push("--eval", params.evaluate);
      }
      
      if (params.wait_until) {
        args.push("--wait-until", params.wait_until);
      }
      
      if (params.selector) {
        args.push("--selector", params.selector);
      }
      
      if (params.stealth) {
        args.push("--stealth");
      }
      
      // Properly escape arguments for bash
      const argsStr = args.map((a: string) => {
        if (a.includes(" ") || a.includes('"') || a.includes("'") || a.includes("$") || a.includes("&") || a.includes("|") || a.includes(";")) {
          return `'${a.replace(/'/g, "'\\''")}'`;
        }
        return a;
      }).join(" ");
      
      const cmd = `obscura ${argsStr}`;
      const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
      
      if (stderr && stderr.trim().length > 0 && stdout.trim().length === 0) {
          return {
              content: text(`Obscura returned no output but had stderr:\n${stderr}`),
              details: undefined,
              isError: false
          };
      }
      
      return {
        content: text(stdout.trim() || "Success, but no output returned."),
        details: { url: params.url },
        isError: false,
      };
    } catch (err: any) {
      return {
        content: text(`Obscura request failed: ${err.message || String(err)}`),
        details: undefined,
        isError: true,
      };
    }
  }

  pi.registerCommand("obscura", {
    description: "Fetch a web page using the Obscura headless browser",
    handler: async (args, ctx) => {
      if (args.length === 0) {
        const msg = "Usage: /obscura <url>";
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.log(msg);
        return;
      }
      
      const res = await executeObscura({ url: args[0], dump: "text" });
      const msg = res.content[0].text;
      
      if (ctx.hasUI) {
        pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
      } else {
        console.log(msg);
      }
    }
  });
}
