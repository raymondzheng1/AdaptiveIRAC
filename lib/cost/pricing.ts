/**
 * Model pricing (USD per million tokens) and token→USD conversion.
 * Single source of truth for the cost guard. Update when Anthropic pricing moves.
 */

export interface ModelPrice {
  /** USD per 1M input tokens. */
  input: number;
  /** USD per 1M output tokens. */
  output: number;
}

/** Cached from the Anthropic pricing table (2026-05). */
export const MODEL_PRICES: Record<string, ModelPrice> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-fable-5": { input: 10, output: 50 },
};

/** Default generation model — cost-efficient, strong enough for grounded IRAC. */
export const DEFAULT_MODEL = "claude-sonnet-4-6" as const;
/** Small model — classification, structural envelope repair. */
export const SMALL_MODEL = "claude-haiku-4-5" as const;

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  /** Cached-read tokens are billed at ~0.1× input; counted separately if provided. */
  cacheReadInputTokens?: number;
}

/** Exact USD cost from realised token usage. */
export function costOf(model: string, usage: TokenUsage): number {
  const price = MODEL_PRICES[model];
  if (!price) {
    // Unknown model: price at the most expensive known rate (fail-expensive, never free).
    const max = Object.values(MODEL_PRICES).reduce(
      (m, p) => ({ input: Math.max(m.input, p.input), output: Math.max(m.output, p.output) }),
      { input: 0, output: 0 },
    );
    return tokenCost(max, usage);
  }
  return tokenCost(price, usage);
}

function tokenCost(price: ModelPrice, usage: TokenUsage): number {
  const fullInput = Math.max(0, usage.inputTokens - (usage.cacheReadInputTokens ?? 0));
  const cachedInput = usage.cacheReadInputTokens ?? 0;
  return (
    (fullInput / 1_000_000) * price.input +
    (cachedInput / 1_000_000) * price.input * 0.1 +
    (usage.outputTokens / 1_000_000) * price.output
  );
}

/** Rough chars→tokens estimate for pre-call worst-case costing (no network call). */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 3.5);
}

/** Worst-case USD for a call before we make it (estimated input + max output). */
export function estimateMaxCost(model: string, estInputChars: number, maxOutputTokens: number): number {
  return costOf(model, {
    inputTokens: estimateTokens(estInputChars),
    outputTokens: maxOutputTokens,
  });
}
