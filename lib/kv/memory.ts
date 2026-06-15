import type { Kv } from "./types";

/**
 * In-memory KV used in tests (via __setKvForTests) and as a dev-only fallback
 * when Upstash is unconfigured. NEVER used in production — the cost guard fails
 * closed instead (see lib/kv/index.ts).
 */
export class MemoryKv implements Kv {
  private store = new Map<string, { value: number | string; expiresAt?: number }>();

  private alive(key: string, now: number): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt !== undefined && entry.expiresAt <= now) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async get(key: string, now: number): Promise<string | null> {
    if (!this.alive(key, now)) return null;
    return String(this.store.get(key)!.value);
  }

  async incrByFloat(key: string, amount: number, now: number): Promise<number> {
    const alive = this.alive(key, now);
    const current = alive ? Number(this.store.get(key)!.value) : 0;
    const next = current + amount;
    const expiresAt = alive ? this.store.get(key)!.expiresAt : undefined;
    this.store.set(key, { value: next, expiresAt });
    return next;
  }

  async incr(key: string, now: number): Promise<number> {
    return this.incrByFloat(key, 1, now);
  }

  async expire(key: string, seconds: number, now: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) entry.expiresAt = now + seconds * 1000;
  }

  /** Test helper. */
  reset(): void {
    this.store.clear();
  }
}
