import { Redis } from "@upstash/redis";
import type { Kv } from "./types";
import { MemoryKv } from "./memory";

export type { Kv } from "./types";
export { MemoryKv } from "./memory";

/** Thrown when no KV is available in production — the cost guard fails closed on this. */
export class KvUnavailableError extends Error {
  constructor() {
    super("KV (Upstash) is not configured; failing closed.");
    this.name = "KvUnavailableError";
  }
}

/** Upstash-backed KV. Redis manages TTL natively, so `now` is ignored here. */
class UpstashKv implements Kv {
  constructor(private redis: Redis) {}
  async get(key: string): Promise<string | null> {
    const v = await this.redis.get<string | number>(key);
    return v === null || v === undefined ? null : String(v);
  }
  async incrByFloat(key: string, amount: number): Promise<number> {
    return this.redis.incrbyfloat(key, amount);
  }
  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }
  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }
}

let injected: Kv | null = null;
let cached: Kv | null = null;

/** Test/dev seam — inject an in-memory KV so routes exercise real handlers. */
export function __setKvForTests(impl: Kv | null): void {
  injected = impl;
  cached = null;
}

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Resolve the KV. Order: injected (tests) → Upstash (if configured) → in-memory
 * dev fallback (only when ALLOW_INSECURE_DEV_KV and NOT prod). In production with
 * Upstash unconfigured, throw KvUnavailableError so callers fail closed (§6.4).
 */
export function getKv(): Kv {
  if (injected) return injected;
  if (cached) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    cached = new UpstashKv(new Redis({ url, token }));
    return cached;
  }

  if (!isProd() && process.env.ALLOW_INSECURE_DEV_KV === "true") {
    cached = new MemoryKv();
    return cached;
  }

  throw new KvUnavailableError();
}
