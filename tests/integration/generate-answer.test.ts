import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { __setKvForTests, MemoryKv } from "@/lib/kv";
import { __setNowForTests } from "@/lib/util/clock";
import { __setModelClientForTests, type ModelClient } from "@/lib/generation/client";
import { generateAnswer } from "@/lib/generation/runner";
import type { GenerateAnswerRequest } from "@/lib/schemas";

const allowlist = [
  {
    id: "auth_smith",
    kind: "case" as const,
    canonical: "Smith v Jones",
    shortForms: ["smith v jones", "jones"],
    locations: [{ sourceId: "s1", sourceFilename: "Notes.pdf", label: "Notes p1" }],
  },
];

const baseRequest: GenerateAnswerRequest = {
  subject: { name: "Admin Law", jurisdiction: "Australia", examFormat: "mixed" },
  question: {
    id: "q1",
    type: "hypothetical",
    topic: "review",
    difficulty: "standard",
    prompt: "A permit was refused. Advise on review.",
    targetIssueIds: [],
    createdAt: 0,
  },
  allowlist,
  context: [{ sourceId: "s1", sourceFilename: "Notes.pdf", label: "Notes p1", text: "Smith v Jones establishes the test." }],
};

/** A model client that always returns the same canned JSON. */
function fixedClient(json: unknown): ModelClient {
  return {
    async complete() {
      return {
        text: JSON.stringify(json),
        usage: { inputTokens: 2000, outputTokens: 500 },
      };
    },
  };
}

describe("generateAnswer — end-to-end grounding (launch gate)", () => {
  beforeEach(() => {
    __setNowForTests(() => 1_700_000_000_000);
    __setKvForTests(new MemoryKv());
    process.env.SESSION_CAP_USD = "5";
    process.env.GLOBAL_DAILY_BUDGET_USD = "1000";
  });
  afterEach(() => {
    __setNowForTests(null);
    __setKvForTests(null);
    __setModelClientForTests(null);
  });

  it("returns a verified answer when the model cites only the allow-list", async () => {
    __setModelClientForTests(
      fixedClient({
        body:
          "Issue: was the refusal lawful? Rule: the test comes from Smith v Jones (Notes p1). " +
          "Application: applying it here, the refusal fails. Conclusion: reviewable.",
        citations: [{ authorityId: "auth_smith", display: "Smith v Jones (Notes p1)", pinpoint: "Notes p1" }],
        issueIds: [],
      }),
    );
    const { answer, insufficient } = await generateAnswer(baseRequest, {
      sessionId: "s1",
      ip: "ip1",
      byoKey: false,
    });
    expect(insufficient).toBeNull();
    expect(answer).not.toBeNull();
    expect(answer?.verification.ok).toBe(true);
    expect(answer?.citations[0]?.location.label).toBe("Notes p1");
  });

  it("REJECTS and declines when the model cites outside the allow-list (never fabricates)", async () => {
    __setModelClientForTests(
      fixedClient({
        body:
          "Issue: standing. Rule: per Associated Provincial Picture Houses v Wednesbury Corporation. " +
          "Application: applied here. Conclusion: reviewable.",
        citations: [{ authorityId: "auth_wednesbury", display: "Wednesbury", pinpoint: "Notes p9" }],
        issueIds: [],
      }),
    );
    const { answer, insufficient } = await generateAnswer(baseRequest, {
      sessionId: "s1",
      ip: "ip1",
      byoKey: false,
    });
    expect(answer).toBeNull();
    expect(insufficient).not.toBeNull();
    expect(insufficient?.insufficientGrounding).toBe(true);
  });

  it("meters spend against the session after a successful generation", async () => {
    const kv = new MemoryKv();
    __setKvForTests(kv);
    __setModelClientForTests(
      fixedClient({
        body:
          "Issue: lawful? Rule: Smith v Jones (Notes p1). Application: here. Conclusion: yes.",
        citations: [{ authorityId: "auth_smith", display: "Smith v Jones (Notes p1)", pinpoint: "Notes p1" }],
        issueIds: [],
      }),
    );
    const { spend } = await generateAnswer(baseRequest, { sessionId: "s9", ip: "ip1", byoKey: false });
    expect(spend.spentUsd).toBeGreaterThan(0);
  });
});
