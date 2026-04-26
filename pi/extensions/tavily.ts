/**
 * Tavily extension for pi.
 *
 * Provides one tool:
 *   - tavily_search : web search powered by Tavily AI
 *
 * Requires the TAVILY_API_KEY environment variable.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

const BASE_URL = "https://api.tavily.com/search";

function apiKey(): string {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY environment variable is not set.");
  return key;
}

function text(t: string) {
  return [{ type: "text" as const, text: t }];
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "tavily_search",
    label: "Tavily Web Search",
    description:
      "Search the web using Tavily AI. Returns ranked results with titles, URLs, and content snippets. " +
      "Optionally returns an AI-generated answer summarising the results. " +
      "Use 'advanced' depth for more thorough results, 'news' topic for recent news.",
    promptSnippet: "tavily_search(query) – AI-powered web search",
    parameters: Type.Object({
      query: Type.String({
        description: "Search query, e.g. 'pydantic v2 best practices' or 'latest Node.js LTS release'.",
      }),
      search_depth: Type.Optional(
        Type.Union([Type.Literal("basic"), Type.Literal("advanced")], {
          description: "'basic' is fast and cheap. 'advanced' crawls deeper for richer content. Default: 'basic'.",
        })
      ),
      topic: Type.Optional(
        Type.Union([Type.Literal("general"), Type.Literal("news")], {
          description: "'general' for broad web search. 'news' for recent news articles. Default: 'general'.",
        })
      ),
      max_results: Type.Optional(
        Type.Number({
          description: "Number of results to return (default 5, max 20).",
          minimum: 1,
          maximum: 20,
        })
      ),
      include_answer: Type.Optional(
        Type.Boolean({
          description: "If true, includes an AI-generated answer summarising the results. Default: false.",
        })
      ),
      include_raw_content: Type.Optional(
        Type.Boolean({
          description: "If true, returns the full page content for each result. Default: false.",
        })
      ),
      include_domains: Type.Optional(
        Type.Array(Type.String(), {
          description: "Restrict results to these domains only, e.g. ['docs.python.org', 'github.com'].",
        })
      ),
      exclude_domains: Type.Optional(
        Type.Array(Type.String(), {
          description: "Exclude results from these domains, e.g. ['pinterest.com', 'quora.com'].",
        })
      ),
      time_range: Type.Optional(
        Type.Union(
          [
            Type.Literal("day"),
            Type.Literal("week"),
            Type.Literal("month"),
            Type.Literal("year"),
          ],
          {
            description: "Limit results to this time window. Useful with topic='news'. Default: no filter.",
          }
        )
      ),
    }),

    async execute(_id, params, _signal) {
      let key: string;
      try {
        key = apiKey();
      } catch (err) {
        return { content: text(String(err)), details: undefined, isError: true };
      }

      const body: Record<string, unknown> = {
        api_key: key,
        query: params.query,
        search_depth: params.search_depth ?? "basic",
        topic: params.topic ?? "general",
        max_results: Math.min(params.max_results ?? 5, 20),
        include_answer: params.include_answer ?? false,
        include_raw_content: params.include_raw_content ?? false,
      };

      if (params.include_domains?.length) body.include_domains = params.include_domains;
      if (params.exclude_domains?.length) body.exclude_domains = params.exclude_domains;
      if (params.time_range) body.time_range = params.time_range;

      let res: Response;
      try {
        res = await fetch(BASE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (err) {
        return { content: text(`Tavily request failed: ${err}`), details: undefined, isError: true };
      }

      if (!res.ok) {
        const errBody = await res.text();
        return {
          content: text(`Tavily search failed (${res.status}): ${errBody}`),
          details: undefined,
          isError: true,
        };
      }

      const data = (await res.json()) as {
        query: string;
        answer?: string;
        results: Array<{
          url: string;
          title: string;
          content: string;
          score: number;
          raw_content?: string;
        }>;
        response_time: number;
      };

      if (!data.results?.length) {
        return {
          content: text(`Tavily returned no results for: "${params.query}"`),
          details: undefined,
          isError: false,
        };
      }

      const sections: string[] = [
        `# Tavily search: "${data.query}"`,
        `*${data.results.length} result(s) · ${data.response_time.toFixed(2)}s*`,
      ];

      if (data.answer) {
        sections.push(`\n## Answer\n${data.answer}`);
      }

      sections.push("\n## Results");
      for (let i = 0; i < data.results.length; i++) {
        const r = data.results[i];
        const lines = [
          `### ${i + 1}. ${r.title}`,
          `**URL:** ${r.url}  |  **Score:** ${r.score.toFixed(4)}`,
          ``,
          r.content,
        ];
        if (r.raw_content) {
          lines.push(`\n<details><summary>Full content</summary>\n\n${r.raw_content}\n</details>`);
        }
        sections.push(lines.join("\n"));
      }

      return {
        content: text(sections.join("\n\n")),
        details: { query: data.query, count: data.results.length, response_time: data.response_time },
        isError: false,
      };
    },
  });

  // ── Commands ────────────────────────────────────────────────────────────────
  pi.registerCommand("tavily", {
    description: "Search the web using Tavily AI",
    handler: async (args, ctx) => {
      const query = args.join(" ");
      if (!query) {
        const msg = "Usage: /tavily <query>";
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.log(msg);
        return;
      }
      
      try {
        const key = apiKey();
        const res = await fetch(BASE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: key, query, search_depth: "basic", max_results: 5 })
        });
        
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        
        let msg = `# Tavily search: "${query}"\n\n`;
        if (data.results && data.results.length > 0) {
           msg += data.results.map((r: any, i: number) => `### ${i + 1}. ${r.title}\n**URL:** ${r.url}\n\n${r.content}`).join("\n\n");
        } else {
           msg += "No results found.";
        }
        
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.log(msg);
      } catch (err: any) {
        const msg = `Tavily search failed: ${err.message || String(err)}`;
        if (ctx.hasUI) pi.sendMessage({ content: msg, display: true }, { triggerTurn: false });
        else console.error(msg);
      }
    }
  });
}
