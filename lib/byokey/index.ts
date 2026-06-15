import { ByoKeySchema, type ByoKey } from "@/lib/schemas";

/**
 * Bring-your-own-key handling. The key is held in the user's browser and sent
 * per request; it is used once and NEVER logged or stored server-side.
 */

/** Validate an optional BYO-key payload from a request body. */
export function parseByoKey(input: unknown): ByoKey {
  const parsed = ByoKeySchema.safeParse(input);
  return parsed.success ? parsed.data : undefined;
}

/** Mask a key for any diagnostic surface (defence-in-depth — we don't log keys at all). */
export function redactKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}…${key.slice(-2)}`;
}

/** localStorage key the browser uses to hold the user's own API key. */
export const BYO_KEY_STORAGE = "airac.byoKey";
