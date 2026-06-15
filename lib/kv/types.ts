/**
 * Minimal KV contract used by the cost guard + rate limiter. `now` is passed in
 * so TTL logic is testable with a pinned clock (no Date.now inside the store).
 */
export interface Kv {
  get(key: string, now: number): Promise<string | null>;
  incrByFloat(key: string, amount: number, now: number): Promise<number>;
  incr(key: string, now: number): Promise<number>;
  expire(key: string, seconds: number, now: number): Promise<void>;
}
