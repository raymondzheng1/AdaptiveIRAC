import Anthropic from "@anthropic-ai/sdk";
import type { TokenUsage } from "@/lib/cost/pricing";

export interface CompleteOptions {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  /** When supplied, the request uses the user's own key (never logged/stored). */
  apiKey?: string;
}

export interface CompleteResult {
  text: string;
  usage: TokenUsage;
}

/** Minimal model surface so routes are testable with Anthropic mocked at this seam. */
export interface ModelClient {
  complete(opts: CompleteOptions): Promise<CompleteResult>;
}

class AnthropicModelClient implements ModelClient {
  async complete(opts: CompleteOptions): Promise<CompleteResult> {
    // BYO-key requests construct a per-request client; the shared client reads
    // ANTHROPIC_API_KEY from the environment. Keys are never logged.
    const client = opts.apiKey ? new Anthropic({ apiKey: opts.apiKey }) : new Anthropic();
    const response = await client.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: opts.user }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      text,
      usage: {
        inputTokens: response.usage.input_tokens ?? 0,
        outputTokens: response.usage.output_tokens ?? 0,
        cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
      },
    };
  }
}

let injected: ModelClient | null = null;
let cached: ModelClient | null = null;

export function __setModelClientForTests(impl: ModelClient | null): void {
  injected = impl;
  cached = null;
}

export function getModelClient(): ModelClient {
  if (injected) return injected;
  if (!cached) cached = new AnthropicModelClient();
  return cached;
}
