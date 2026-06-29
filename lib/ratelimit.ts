import { getKv } from "@/lib/kv";
import { now } from "@/lib/util/clock";

/**
 * Fixed-window per-key rate limit on the shared KV (harness §6.4 fail-closed:
 * if the store is unavailable, deny). Returns true when the call is allowed.
 */
export async function consumeRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const kv = getKv();
    const t = now();
    const windowId = Math.floor(t / (windowSeconds * 1000));
    const key = `rl:${bucket}:${windowId}`;
    const count = await kv.incr(key, t);
    await kv.expire(key, windowSeconds, t);
    return count <= limit;
  } catch {
    return false; // fail closed
  }
}
