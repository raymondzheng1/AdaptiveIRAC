import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/schemas";
import type { GuardDecision } from "@/lib/cost/guard";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function fail(
  code: ApiError["code"],
  error: string,
  status: number,
  spend?: { usedUsd: number; capUsd: number },
): NextResponse {
  const body: ApiError = { code, error, ...(spend ? { spend } : {}) };
  return NextResponse.json(body, { status });
}

/** Map a cost-guard decision to the appropriate HTTP error envelope. */
export function failFromGuard(decision: GuardDecision): NextResponse {
  const spend = { usedUsd: decision.spentUsd, capUsd: decision.capUsd };
  switch (decision.code) {
    case "session_cap_reached":
      return fail(
        "session_cap_reached",
        "This free session has reached its US$5 limit. Add your own API key to keep going at no cost to us.",
        402,
        spend,
      );
    case "global_budget_exhausted":
      return fail(
        "global_budget_exhausted",
        "The shared free tier is paused for today. Add your own API key to keep going.",
        402,
        spend,
      );
    case "rate_limited":
      return fail("rate_limited", "Too many requests. Please slow down and try again shortly.", 429, spend);
    case "cost_guard_unavailable":
      return fail(
        "cost_guard_unavailable",
        "The usage meter is temporarily unavailable, so generation is paused. Try again shortly, or use your own API key.",
        503,
        spend,
      );
    default:
      return fail("internal_error", "Unexpected cost-guard state.", 500, spend);
  }
}
