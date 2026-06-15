import { currentSpend } from "@/lib/cost/guard";
import { getOrCreateSessionId } from "@/lib/session";
import { ok } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current session spend for the usage meter UI (PII-free). */
export async function GET() {
  const sessionId = await getOrCreateSessionId();
  const { spentUsd, capUsd } = await currentSpend(sessionId);
  return ok({ usedUsd: spentUsd, capUsd });
}
