import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface FusionConfig {
  analysis_models: string[];
  judge: string;
}

function loadFusionConfig(): FusionConfig | null {
  try {
    const raw = JSON.parse(
      readFileSync(join(homedir(), ".pi", "agent", "models.json"), "utf8")
    );
    for (const provider of Object.values(raw.providers ?? {})) {
      for (const model of (provider as any).models ?? []) {
        if (model.id === "openrouter/fusion" && model.fusionConfig) {
          return model.fusionConfig as FusionConfig;
        }
      }
    }
  } catch {
    // models.json unreadable or missing fusionConfig — fall through
  }
  return null;
}

export default function (pi: ExtensionAPI) {
  pi.on("before_provider_request", async (event) => {
    const payload = event.payload as Record<string, unknown>;
    if (!payload || payload.model !== "openrouter/fusion") return undefined;

    const config = loadFusionConfig();
    if (!config) return undefined;

    return {
      ...payload,
      plugins: [
        {
          id: "fusion",
          analysis_models: config.analysis_models,
          model: config.judge,
        },
      ],
    };
  });
}
