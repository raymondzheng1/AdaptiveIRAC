import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { __setKvForTests, MemoryKv } from "@/lib/kv";
import { __setNowForTests } from "@/lib/util/clock";
import { consumeRateLimit } from "@/lib/ratelimit";
import { __setEmailSenderForTests, sendEmail, type EmailArgs } from "@/lib/email";

const FIXED = 1_700_000_000_000;

describe("consumeRateLimit (contact form backstop)", () => {
  beforeEach(() => __setNowForTests(() => FIXED));
  afterEach(() => {
    __setNowForTests(null);
    __setKvForTests(null);
  });

  it("allows up to the limit within a window, then blocks", async () => {
    __setKvForTests(new MemoryKv());
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) results.push(await consumeRateLimit("contact:ipA", 3, 3600));
    expect(results).toEqual([true, true, true, false]);
  });

  it("separates buckets by key", async () => {
    __setKvForTests(new MemoryKv());
    await consumeRateLimit("contact:ipA", 1, 3600);
    expect(await consumeRateLimit("contact:ipB", 1, 3600)).toBe(true);
  });

  it("fails CLOSED when the KV is unavailable in production", async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevDev = process.env.ALLOW_INSECURE_DEV_KV;
    try {
      __setKvForTests(null);
      (process.env as Record<string, string>).NODE_ENV = "production";
      delete process.env.ALLOW_INSECURE_DEV_KV;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.KV_REST_API_URL;
      expect(await consumeRateLimit("contact:ipA", 3, 3600)).toBe(false);
    } finally {
      (process.env as Record<string, string>).NODE_ENV = prevEnv ?? "test";
      if (prevDev !== undefined) process.env.ALLOW_INSECURE_DEV_KV = prevDev;
    }
  });
});

describe("sendEmail", () => {
  afterEach(() => __setEmailSenderForTests(null));

  it("reports unconfigured (no network) when RESEND_API_KEY is unset", async () => {
    const prev = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    try {
      const r = await sendEmail({ to: "x@y.com", subject: "s", html: "<p>h</p>", text: "h" });
      expect(r.ok).toBe(false);
      expect(r.error).toBe("resend_unconfigured");
    } finally {
      if (prev !== undefined) process.env.RESEND_API_KEY = prev;
    }
  });

  it("routes through an injected sender and preserves reply-to", async () => {
    let captured: EmailArgs | null = null;
    __setEmailSenderForTests(async (args) => {
      captured = args;
      return { ok: true, id: "test" };
    });
    const r = await sendEmail({ to: "ops@pincite.app", subject: "s", html: "h", text: "h", replyTo: "user@x.com" });
    expect(r.ok).toBe(true);
    expect(captured!.replyTo).toBe("user@x.com");
  });
});
