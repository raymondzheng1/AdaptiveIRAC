import { cookies, headers } from "next/headers";
import { hash } from "@/lib/util/text";

/**
 * Opaque session id for SPEND METERING ONLY (not identity, not tracking).
 * httpOnly cookie, issued server-side. No PII; never used to fingerprint a user.
 */
export const SESSION_COOKIE = "airac_sid";

function randomId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID().replace(/-/g, "");
  // Deterministic-ish fallback (no Date.now in hot path) — sufficient for a non-identity token.
  return hash(`${Math.random()}`) + hash(`${Math.random()}`);
}

/** Read the session id, issuing one if absent. Must run in a Route Handler. */
export async function getOrCreateSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;
  if (existing) return existing;

  const id = randomId();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h, matches the spend-key TTL
  });
  return id;
}

/** Best-effort client IP for per-IP backstops (privacy-safe: hashed before use as a key). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const raw = fwd ? fwd.split(",")[0]!.trim() : h.get("x-real-ip") ?? "unknown";
  // Hash so the raw IP is never used as a KV key or logged.
  return hash(raw);
}
