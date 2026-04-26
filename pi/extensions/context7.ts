/**
 * Context7 extension for pi.
 *
 * Provides two tools:
 *   - context7_search  : search the Context7 library index by keyword
 *   - context7_docs    : fetch documentation snippets for a specific library
 *
 * Requires the CONTEXT7_API_KEY environment variable.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

const BASE_URL = "https://context7.com/api/v1";

function authHeaders(): Record<string, string> {
  const key = process.env.CONTEXT7_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers["Authorization"] = `Bearer ${key}`;
  return headers;
}

/** Strip leading slash from Context7 library IDs (e.g. "/reactjs/react.dev" → "reactjs/react.dev"). */
function normalizeId(id: string): string {
  return id.startsWith("/") ? id.slice(1) : id;
}

function text(t: string) {
  return [{ type: "text" as const, text: t }];
}

export default function (pi: ExtensionAPI) {
  // ── Tool 1: search ──────────────────────────────────────────────────────────
  pi.registerTool({
    name: "context7_search",
    label: "Context7 Search",
    description:
      "Search the Context7 library index for documentation sources. " +
      "Returns a ranked list of libraries with their IDs, descriptions, and quality scores. " +
      "Use the returned library ID with context7_docs to fetch actual documentation.",
    promptSnippet: "context7_search(query) – find a Context7 library by name/topic",
    parameters: Type.Object({
      query: Type.String({
        description: "Search terms, e.g. 'react hooks' or 'fastapi authentication'.",
      }),
      limit: Type.Optional(
        Type.Number({
          description: "Maximum number of results to return (default 5, max 20).",
          minimum: 1,
          maximum: 20,
        })
      ),
    }),
    async execute(_id, params, _signal) {
      const url = new URL(`${BASE_URL}/search`);
      url.searchParams.set("query", params.query);

      let res: Response;
      try {
        res = await fetch(url.toString(), { headers: authHeaders() });
      } catch (err) {
        return { content: text(`Context7 search request failed: ${err}`), details: undefined, isError: true };
      }

      if (!res.ok) {
        const body = await res.text();
        return {
          content: text(`Context7 search failed (${res.status}): ${body}`),
          details: undefined,
          isError: true,
        };
      }

      const data = (await res.json()) as {
        results: Array<{
          id: string;
          title: string;
          description: string;
          totalTokens: number;
          totalSnippets: number;
          stars: number;
          trustScore: number;
          versions: string[];
        }>;
      };

      const limit = Math.min(params.limit ?? 5, 20);
      const results = data.results.slice(0, limit);

      if (results.length === 0) {
        return {
          content: text(`No libraries found for query: "${params.query}"`),
          details: undefined,
          isError: false,
        };
      }

      const lines = results.map((r, i) => {
        const id = normalizeId(r.id);
        const versions = r.versions.length > 0 ? ` | versions: ${r.versions.join(", ")}` : "";
        const stars = r.stars > 0 ? ` | ★ ${r.stars.toLocaleString()}` : "";
        return [
          `${i + 1}. **${r.title}** — id: \`${id}\``,
          `   ${r.description}`,
          `   snippets: ${r.totalSnippets} | tokens: ${r.totalTokens}${stars} | trust: ${r.trustScore}${versions}`,
        ].join("\n");
      });

      return {
        content: text(`Context7 search results for "${params.query}":\n\n${lines.join("\n\n")}`),
        details: data.results.slice(0, limit),
        isError: false,
      };
    },
  });

  // ── Tool 2: fetch docs ───────────────────────────────────────────────────────
  pi.registerTool({
    name: "context7_docs",
    label: "Context7 Docs",
    description:
      "Fetch documentation snippets from Context7 for a specific library. " +
      "Use context7_search first to find the correct library ID. " +
      "Returns focused, version-accurate documentation text ready to use in context.",
    promptSnippet: "context7_docs(libraryId, topic?) – fetch docs from Context7",
    parameters: Type.Object({
      libraryId: Type.String({
        description:
          "Library ID from context7_search, e.g. 'reactjs/react.dev' or 'tiangolo/fastapi'. " +
          "Leading slash is optional.",
      }),
      topic: Type.Optional(
        Type.String({
          description:
            "Optional topic to focus the returned snippets, e.g. 'authentication', 'hooks', 'routing'.",
        })
      ),
      tokens: Type.Optional(
        Type.Number({
          description: "Maximum tokens to return (default 5000, max 15000).",
          minimum: 500,
          maximum: 15000,
        })
      ),
    }),
    async execute(_id, params, _signal) {
      const libraryId = normalizeId(params.libraryId);
      const maxTokens = Math.min(params.tokens ?? 5000, 15000);

      const url = new URL(`${BASE_URL}/${libraryId}`);
      url.searchParams.set("tokens", String(maxTokens));
      if (params.topic) url.searchParams.set("topic", params.topic);

      let res: Response;
      try {
        res = await fetch(url.toString(), { headers: authHeaders() });
      } catch (err) {
        return {
          content: text(`Context7 docs request failed: ${err}`),
          details: undefined,
          isError: true,
        };
      }

      if (!res.ok) {
        const body = await res.text();
        return {
          content: text(`Context7 docs fetch failed (${res.status}) for '${libraryId}': ${body}`),
          details: undefined,
          isError: true,
        };
      }

      const docText = await res.text();
      if (!docText.trim()) {
        return {
          content: text(
            `Context7 returned no content for '${libraryId}'` +
              (params.topic ? ` (topic: ${params.topic})` : "") +
              "."
          ),
          details: undefined,
          isError: false,
        };
      }

      const header = [
        `# Context7 docs: ${libraryId}`,
        params.topic ? `**Topic:** ${params.topic}` : null,
        `**Tokens requested:** ${maxTokens}`,
        "---",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        content: text(`${header}\n\n${docText}`),
        details: { libraryId, topic: params.topic, tokens: maxTokens },
        isError: false,
      };
    },
  });

  // ── Commands ────────────────────────────────────────────────────────────────
  pi.registerCommand("c7-search", {
    description: "Search Context7 for documentation libraries",
    handler: async (args, ctx) => {
      const query = args.join(" ");
      if (!query) {
        const msg = "Usage: /c7-search <query>";
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.log(msg);
        return;
      }
      
      const url = new URL(`${BASE_URL}/search`);
      url.searchParams.set("query", query);
      
      try {
        const res = await fetch(url.toString(), { headers: authHeaders() });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        
        const results = data.results.slice(0, 5);
        if (results.length === 0) {
          const msg = `No libraries found for query: "${query}"`;
          if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
          else console.log(msg);
          return;
        }
        
        const lines = results.map((r: any, i: number) => {
          const id = normalizeId(r.id);
          return `${i + 1}. **${r.title}** — id: \`${id}\`\n   ${r.description}`;
        });
        
        const msg = `Context7 search results for "${query}":\n\n${lines.join("\n\n")}`;
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.log(msg);
      } catch (err: any) {
        const msg = `Context7 search failed: ${err.message || String(err)}`;
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.error(msg);
      }
    }
  });

  pi.registerCommand("c7-docs", {
    description: "Fetch documentation snippets from Context7",
    handler: async (args, ctx) => {
      if (args.length === 0) {
        const msg = "Usage: /c7-docs <libraryId> [topic]";
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.log(msg);
        return;
      }
      
      const libraryId = normalizeId(args[0]);
      const topic = args.slice(1).join(" ");
      
      const url = new URL(`${BASE_URL}/${libraryId}`);
      url.searchParams.set("tokens", "5000");
      if (topic) url.searchParams.set("topic", topic);
      
      try {
        const res = await fetch(url.toString(), { headers: authHeaders() });
        if (!res.ok) throw new Error(await res.text());
        const docText = await res.text();
        
        const msg = docText.trim() ? `# Context7 docs: ${libraryId}\n\n${docText}` : `No content for '${libraryId}'`;
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.log(msg);
      } catch (err: any) {
        const msg = `Context7 docs fetch failed: ${err.message || String(err)}`;
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.error(msg);
      }
    }
  });
}
