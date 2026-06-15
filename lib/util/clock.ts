/**
 * Single clock seam so time-dependent logic (cost-meter TTLs, exam timers) is
 * unit-testable with a pinned clock. Never call Date.now() directly elsewhere.
 */
let nowFn: () => number = () => Date.now();

export function now(): number {
  // DEV_FAKE_NOW lets us demo any moment in non-prod; fail-open to real time in prod.
  if (process.env.NODE_ENV !== "production" && process.env.DEV_FAKE_NOW) {
    const parsed = Number(process.env.DEV_FAKE_NOW);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return nowFn();
}

export function __setNowForTests(fn: (() => number) | null): void {
  nowFn = fn ?? (() => Date.now());
}

/** UTC date key (YYYY-MM-DD) for the global daily budget bucket. */
export function dateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
