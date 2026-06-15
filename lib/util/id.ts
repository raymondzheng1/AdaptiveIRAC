import { hash, slugify } from "./text";

/** Deterministic id from a kind + seed text (stable across runs → testable). */
export function stableId(kind: string, seed: string): string {
  const slug = slugify(seed) || "x";
  return `${kind}_${slug.slice(0, 40)}_${hash(`${kind}:${seed}`)}`;
}

/**
 * Non-deterministic id for client-created records (questions, attempts).
 * Uses crypto.randomUUID where available, with a deterministic fallback that
 * still avoids Date.now (kept side-effect-light for SSR/test environments).
 */
let counter = 0;
export function uid(prefix = "id"): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") {
    return `${prefix}_${c.randomUUID()}`;
  }
  counter += 1;
  return `${prefix}_${hash(`${prefix}:${counter}`)}_${counter}`;
}
