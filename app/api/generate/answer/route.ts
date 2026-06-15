import type { NextRequest } from "next/server";
import { GenerateAnswerRequestSchema } from "@/lib/schemas";
import { checkBudget } from "@/lib/cost/guard";
import { DEFAULT_MODEL } from "@/lib/cost/pricing";
import { generateAnswer, GuardBlockedError } from "@/lib/generation/runner";
import { getClientIp, getOrCreateSessionId } from "@/lib/session";
import { fail, failFromGuard, ok } from "@/lib/api/respond";

export const runtime = "nodejs";
export const maxDuration = 300;
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
  const parsed = GenerateAnswerRequestSchema.safeParse(body);
  if (!parsed.success) return fail("bad_request", "Invalid request shape.", 400);
  const request = parsed.data;

  if (request.allowlist.length === 0) {
    return fail("empty_allowlist", "Confirm at least one authority before generating an answer.", 400);
  }

  const byoKey = Boolean(request.byoKey);
  const estInputChars =
    JSON.stringify(request.context).length + JSON.stringify(request.allowlist).length + 2000;

  // COST GUARD before the model call (fail-closed). Drift-tested invariant.
  const decision = await checkBudget({
    sessionId,
    ip,
    model: DEFAULT_MODEL,
    estInputChars,
    maxOutputTokens: 4000,
    byoKey,
  });
  if (!decision.allowed) return failFromGuard(decision);

  try {
    const { answer, insufficient, spend } = await generateAnswer(request, {
      sessionId,
      ip,
      byoKey,
      apiKey: request.byoKey?.apiKey,
    });
    const meter = { usedUsd: spend.spentUsd, capUsd: spend.capUsd };
    if (answer) return ok({ answer, spend: meter });
    // Honest "couldn't ground this" state — never fabricate (200, client renders it).
    return ok({ insufficientGrounding: insufficient, spend: meter });
  } catch (e) {
    if (e instanceof GuardBlockedError) return failFromGuard(e.decision);
    return fail("upstream_error", "Could not generate an answer. Please try again.", 502);
  }
}
