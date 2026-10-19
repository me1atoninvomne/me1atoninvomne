import { createAnthropicProvider } from "./anthropic-provider";
import { demoRulesProvider } from "./demo-provider";
import type { DocumentAiProvider } from "./provider";

export interface ProviderStatus {
  active: DocumentAiProvider;
  requested: string;
  /** Set when the requested provider could not be used and the demo adapter took over. */
  fallbackReason: string | null;
}

/** Resolves the configured provider. Demo workspaces always use the local demo adapter. */
export function resolveProvider(opts: { demo: boolean }): ProviderStatus {
  const requested = process.env.AI_PROVIDER ?? "demo";
  if (opts.demo || requested === "demo") return { active: demoRulesProvider, requested, fallbackReason: null };
  if (requested === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { active: demoRulesProvider, requested, fallbackReason: "ANTHROPIC_API_KEY fehlt" };
    }
    return { active: createAnthropicProvider(), requested, fallbackReason: null };
  }
  return { active: demoRulesProvider, requested, fallbackReason: `Unbekannter Provider "${requested}"` };
}

export { demoRulesProvider };
export type { DocumentAiProvider };
