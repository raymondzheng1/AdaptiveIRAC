import { getKv, KvUnavailableError } from "@/lib/kv";
import { dateKey, now } from "@/lib/util/clock";
import { costOf, estimateMaxCost, type TokenUsage } from "./pricing";

const SECONDS_24H = 24 * 60 * 60;
const SECONDS_48H = 48 * 60 * 60;

export function sessionCapUsd(): number {
  return Number(process.env.SESSION_CAP_USD ?? "5");
}
export function globalDailyBudgetUsd(): number {
  return Number(process.env.GLOBAL_DAILY_BUDGET_USD ?? "50");
}
/** Max distinct sessions a single IP may open per day (abuse backstop). */
export function ipDailySessionCap(): number {
  return Number(process.env.IP_DAILY_SESSION_CAP ?? "40");
}

export type GuardCode =
  | "ok"
  | "session_cap_reached"
  | "global_budget_exhausted"
  | "rate_limited"
  | "cost_guard_unavailable";

export interface GuardDecision {
  allowed: boolean;
  code: GuardCode;
  /** Current session spend (USD). 0 for BYO-key (meter bypassed). */
  spentUsd: number;
  capUsd: number;
  /** True for BYO-key requests — shared meter and global budget bypassed. */
  byoKey: boolean;
}

interface GuardInput {
  sessionId: string;
  ip: string;
  model: string;
  estInputChars: number;
  maxOutputTokens: number;
  /** When true, the request uses the user's own API key — skip all shared meters. */
  byoKey: boolean;
}

function spendKey(sessionId: string): string {
  return `spend:${sessionId}`;
}
function globalKey(ms: number): string {
  return `budget:global:${dateKey(ms)}`;
}
function ipKey(ip: string, ms: number): string {
  return `ip:sessions:${ip}:${dateKey(ms)}`;
}

/**
 * Pre-call gate. Runs BEFORE every model call (Tier-B core requirement).
 * Fails CLOSED: if the KV is unreachable in production, deny (never risk
 * uncapped spend). BYO-key requests bypass all shared meters.
 */
export async function checkBudget(input: GuardInput): Promise<GuardDecision> {
  const capUsd = sessionCapUsd();
  if (input.byoKey) {
    return { allowed: true, code: "ok", spentUsd: 0, capUsd, byoKey: true };
  }

  let kv;
  try {
    kv = getKv();
  } catch (e) {
    if (e instanceof KvUnavailableError) {
      return { allowed: false, code: "cost_guard_unavailable", spentUsd: 0, capUsd, byoKey: false };
    }
    throw e;
  }

  const t = now();
  try {
    const estimate = estimateMaxCost(input.model, input.estInputChars, input.maxOutputTokens);

    const spentRaw = await kv.get(spendKey(input.sessionId), t);
    const spentUsd = spentRaw ? Number(spentRaw) : 0;
    if (spentUsd + estimate > capUsd) {
      return { allowed: false, code: "session_cap_reached", spentUsd, capUsd, byoKey: false };
    }

    const globalRaw = await kv.get(globalKey(t), t);
    const globalUsd = globalRaw ? Number(globalRaw) : 0;
    if (globalUsd + estimate > globalDailyBudgetUsd()) {
      return { allowed: false, code: "global_budget_exhausted", spentUsd, capUsd, byoKey: false };
    }

    return { allowed: true, code: "ok", spentUsd, capUsd, byoKey: false };
  } catch {
    // Any KV error mid-check ⇒ fail closed.
    return { allowed: false, code: "cost_guard_unavailable", spentUsd: 0, capUsd, byoKey: false };
  }
}

export interface RecordResult {
  spentUsd: number;
  capUsd: number;
  costUsd: number;
}

/**
 * Post-call metering. Adds the realised cost to the session + global buckets.
 * No-op for BYO-key. Best-effort: a metering failure is logged by the caller,
 * not surfaced to the user (the answer already passed verification).
 */
export async function recordUsage(
  sessionId: string,
  model: string,
  usage: TokenUsage,
  byoKey: boolean,
): Promise<RecordResult> {
  const capUsd = sessionCapUsd();
  const costUsd = costOf(model, usage);
  if (byoKey) return { spentUsd: 0, capUsd, costUsd: 0 };

  const kv = getKv();
  const t = now();
  const spentUsd = await kv.incrByFloat(spendKey(sessionId), costUsd, t);
  await kv.expire(spendKey(sessionId), SECONDS_24H, t);
  await kv.incrByFloat(globalKey(t), costUsd, t);
  await kv.expire(globalKey(t), SECONDS_48H, t);
  return { spentUsd, capUsd, costUsd };
}

/** Per-IP daily session backstop. Returns false when the IP is over its cap. */
export async function allowNewSessionForIp(ip: string): Promise<boolean> {
  try {
    const kv = getKv();
    const t = now();
    const count = await kv.incr(ipKey(ip, t), t);
    await kv.expire(ipKey(ip, t), SECONDS_48H, t);
    return count <= ipDailySessionCap();
  } catch {
    return false; // fail closed
  }
}

/** Read current session spend for the usage meter UI (0 on any error / BYO). */
export async function currentSpend(sessionId: string): Promise<{ spentUsd: number; capUsd: number }> {
  const capUsd = sessionCapUsd();
  try {
    const kv = getKv();
    const raw = await kv.get(spendKey(sessionId), now());
    return { spentUsd: raw ? Number(raw) : 0, capUsd };
  } catch {
    return { spentUsd: 0, capUsd };
  }
}
