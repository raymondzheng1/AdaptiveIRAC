import type { NextRequest } from "next/server";
import { FeedbackRequestSchema } from "@/lib/schemas";
import { checkBudget } from "@/lib/cost/guard";
import { DEFAULT_MODEL } from "@/lib/cost/pricing";
import { generateFeedback, GuardBlockedError } from "@/lib/generation/runner";
import { getClientIp, getOrCreateSessionId } from "@/lib/session";
import { fail, failFromGuard, ok } from "@/lib/api/respond";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sessionId = await getOrCreateSessionId();
  const ip = await getClientIp();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("bad_request", "Invalid JSON body.", 400);
  }
  const parsed = FeedbackRequestSchema.safeParse(body);
  if (!parsed.success) return fail("bad_request", "Invalid request shape.", 400);
  const request = parsed.data;

  const byoKey = Boolean(request.byoKey);
  const estInputChars =
    request.attemptText.length +
    request.modelAnswerSummary.length +
    JSON.stringify(request.allowlist).length +
    2000;

  // COST GUARD before the model call (fail-closed). Drift-tested invariant.
  const decision = await checkBudget({
    sessionId,
    ip,
    model: DEFAULT_MODEL,
    estInputChars,
    maxOutputTokens: 2000,
    byoKey,
  });
  if (!decision.allowed) return failFromGuard(decision);

  try {
    const { feedback, spend } = await generateFeedback(request, {
      sessionId,
      ip,
      byoKey,
      apiKey: request.byoKey?.apiKey,
    });
    return ok({ feedback, spend: { usedUsd: spend.spentUsd, capUsd: spend.capUsd } });
  } catch (e) {
    if (e instanceof GuardBlockedError) return failFromGuard(e.decision);
    return fail("upstream_error", "Could not generate feedback. Please try again.", 502);
  }
}
