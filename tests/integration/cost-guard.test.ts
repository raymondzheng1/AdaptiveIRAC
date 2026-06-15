import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { __setKvForTests, MemoryKv } from "@/lib/kv";
import { __setNowForTests } from "@/lib/util/clock";
import { checkBudget, recordUsage } from "@/lib/cost/guard";
import { DEFAULT_MODEL } from "@/lib/cost/pricing";

const FIXED_NOW = 1_700_000_000_000;

describe("cost guard — blocks at the session cap and fails closed (launch gate)", () => {
  beforeEach(() => {
    __setNowForTests(() => FIXED_NOW);
    process.env.SESSION_CAP_USD = "5";
    process.env.GLOBAL_DAILY_BUDGET_USD = "1000";
  });
  afterEach(() => {
    __setNowForTests(null);
    __setKvForTests(null);
  });

  it("allows a call when the session is well under the cap", async () => {
    __setKvForTests(new MemoryKv());
    const decision = await checkBudget({
      sessionId: "s1",
      ip: "ip1",
      model: DEFAULT_MODEL,
      estInputChars: 4000,
      maxOutputTokens: 1000,
      byoKey: false,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.code).toBe("ok");
  });

  it("BLOCKS once recorded spend would exceed US$5", async () => {
    const kv = new MemoryKv();
    __setKvForTests(kv);
    // Push spend to just under the cap.
    await kv.incrByFloat("spend:s1", 4.99, FIXED_NOW);
    const decision = await checkBudget({
      sessionId: "s1",
      ip: "ip1",
      model: DEFAULT_MODEL,
      estInputChars: 8000,
      maxOutputTokens: 4000,
      byoKey: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("session_cap_reached");
    expect(decision.spentUsd).toBeCloseTo(4.99, 2);
  });

  it("FAILS CLOSED when the KV is unavailable in production", async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevDev = process.env.ALLOW_INSECURE_DEV_KV;
    const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
    const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    try {
      (process.env as Record<string, string>).NODE_ENV = "production";
      delete process.env.ALLOW_INSECURE_DEV_KV;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      __setKvForTests(null);
      const decision = await checkBudget({
        sessionId: "s1",
        ip: "ip1",
        model: DEFAULT_MODEL,
        estInputChars: 4000,
        maxOutputTokens: 1000,
        byoKey: false,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("cost_guard_unavailable");
    } finally {
      (process.env as Record<string, string>).NODE_ENV = prevEnv ?? "test";
      if (prevDev !== undefined) process.env.ALLOW_INSECURE_DEV_KV = prevDev;
      if (prevUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = prevUrl;
      if (prevToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
    }
  });

  it("BYO-key requests bypass the shared meter entirely (even with KV down)", async () => {
    __setKvForTests(null);
    const prevEnv = process.env.NODE_ENV;
    try {
      (process.env as Record<string, string>).NODE_ENV = "production";
      const decision = await checkBudget({
        sessionId: "s1",
        ip: "ip1",
        model: DEFAULT_MODEL,
        estInputChars: 999999,
        maxOutputTokens: 100000,
        byoKey: true,
      });
      expect(decision.allowed).toBe(true);
      expect(decision.byoKey).toBe(true);
    } finally {
      (process.env as Record<string, string>).NODE_ENV = prevEnv ?? "test";
    }
  });

  it("recordUsage accumulates spend and is a no-op for BYO-key", async () => {
    const kv = new MemoryKv();
    __setKvForTests(kv);
    const r1 = await recordUsage("s2", DEFAULT_MODEL, { inputTokens: 100000, outputTokens: 20000 }, false);
    expect(r1.spentUsd).toBeGreaterThan(0);
    const r2 = await recordUsage("s2", DEFAULT_MODEL, { inputTokens: 100000, outputTokens: 20000 }, true);
    expect(r2.spentUsd).toBe(0); // BYO-key never meters
  });
});
