import { describe, it, expect, afterEach } from "vitest";
import { __setKvForTests, getKv, KvUnavailableError, MemoryKv } from "@/lib/kv";

/**
 * Regression: the Vercel Upstash integration injects KV_REST_API_URL /
 * KV_REST_API_TOKEN, NOT UPSTASH_REDIS_REST_*. getKv must accept either, or
 * production fails closed and uploads/generation 429/503. (Bit us on first deploy.)
 */
const UPSTASH_VARS = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
];

function clearKvEnv() {
  for (const v of UPSTASH_VARS) delete process.env[v];
}

describe("getKv env-name resolution", () => {
  afterEach(() => {
    __setKvForTests(null);
    clearKvEnv();
    process.env.ALLOW_INSECURE_DEV_KV = "true";
    (process.env as Record<string, string>).NODE_ENV = "test";
  });

  it("resolves a real KV from the Vercel KV_REST_API_* names", () => {
    __setKvForTests(null);
    clearKvEnv();
    process.env.KV_REST_API_URL = "https://example.upstash.io";
    process.env.KV_REST_API_TOKEN = "rw-token";
    const kv = getKv();
    // A real Upstash client, not the in-memory dev fallback.
    expect(kv instanceof MemoryKv).toBe(false);
  });

  it("resolves from the classic UPSTASH_REDIS_REST_* names too", () => {
    __setKvForTests(null);
    clearKvEnv();
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "rw-token";
    expect(getKv() instanceof MemoryKv).toBe(false);
  });

  it("fails closed in production when no KV name is set", () => {
    __setKvForTests(null);
    clearKvEnv();
    const prev = process.env.NODE_ENV;
    const prevDev = process.env.ALLOW_INSECURE_DEV_KV;
    try {
      (process.env as Record<string, string>).NODE_ENV = "production";
      delete process.env.ALLOW_INSECURE_DEV_KV;
      expect(() => getKv()).toThrow(KvUnavailableError);
    } finally {
      (process.env as Record<string, string>).NODE_ENV = prev ?? "test";
      if (prevDev !== undefined) process.env.ALLOW_INSECURE_DEV_KV = prevDev;
    }
  });
});
