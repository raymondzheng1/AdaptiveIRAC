import { describe, it, expect } from "vitest";
import { verifyAnswer, hasContentFailure } from "@/lib/verification";
import type { Allowlist, Citation } from "@/lib/schemas";

const allowlist: Allowlist = [
  {
    id: "auth_li",
    kind: "case",
    canonical: "Minister for Immigration v Li",
    shortForms: ["minister for immigration v li", "li"],
    locations: [{ sourceId: "s1", sourceFilename: "Slides.pptx", label: "Sem 21 s9" }],
  },
  {
    id: "auth_s65",
    kind: "statute",
    canonical: "s 65",
    shortForms: ["s 65"],
    locations: [{ sourceId: "s2", sourceFilename: "Notes.pdf", label: "Notes p4" }],
  },
];

const opts = { type: "hypothetical" as const, questionPrompt: "Advise the client.", jurisdiction: "Australia" };

const validBody =
  "Issue: was the decision unreasonable? Rule: the legal test is set out in Li (Sem 21 s9). " +
  "Application: applying that to the facts here, the decision was unreasonable. Conclusion: it is reviewable.";

const validCitations: Citation[] = [
  {
    authorityId: "auth_li",
    display: "Li (Sem 21 s9)",
    pinpoint: "Sem 21 s9",
    location: { sourceId: "s1", sourceFilename: "Slides.pptx", label: "Sem 21 s9" },
  },
];

describe("verifyAnswer — citation allow-list gate (the core moat)", () => {
  it("passes an answer that cites only allow-listed, pinpointed authorities", () => {
    const result = verifyAnswer({ body: validBody, citations: validCitations }, allowlist, opts);
    expect(result.ok).toBe(true);
    expect(result.matchedAuthorityIds).toContain("auth_li");
  });

  it("REJECTS an answer citing an authority not on the allow-list (prose scan)", () => {
    const body =
      "Issue: standing. Rule: see Associated Provincial Picture Houses v Wednesbury Corporation. " +
      "Application: here the facts apply. Conclusion: reviewable.";
    const result = verifyAnswer({ body, citations: [] }, allowlist, opts);
    expect(result.ok).toBe(false);
    expect(hasContentFailure(result)).toBe(true);
    expect(result.failures.some((f) => f.gate === "citation-allowlist")).toBe(true);
  });

  it("REJECTS a declared citation referencing an unknown authority id", () => {
    const result = verifyAnswer(
      {
        body: validBody,
        citations: [
          {
            authorityId: "auth_made_up",
            display: "Made Up v Nobody",
            pinpoint: "Notes p9",
            location: { sourceId: "x", sourceFilename: "x", label: "Notes p9" },
          },
        ],
      },
      allowlist,
      opts,
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.gate === "citation-allowlist")).toBe(true);
  });

  it("REJECTS a citation that cannot bind to a corpus location (pinpoint gate)", () => {
    const result = verifyAnswer(
      {
        body: validBody,
        citations: [
          {
            authorityId: "auth_li",
            display: "Li (Sem 99 s9)",
            pinpoint: "Sem 99 s9",
            location: { sourceId: "s1", sourceFilename: "Slides.pptx", label: "Sem 99 s9" },
          },
        ],
      },
      allowlist,
      opts,
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.gate === "pinpoint-binding")).toBe(true);
  });

  it("treats a party name that appears in the question facts as a fact reference, not a citation", () => {
    const result = verifyAnswer(
      { body: validBody, citations: validCitations },
      allowlist,
      { ...opts, questionPrompt: "Acme Pty Ltd v State Authority: advise Acme." },
    );
    expect(result.ok).toBe(true);
  });
});

describe("verifyAnswer — structure gate", () => {
  it("flags a missing IRAC limb as a structural (repairable) failure", () => {
    const body = "Rule: the test is in Li (Sem 21 s9). Application: applied here. Conclusion: done.";
    const result = verifyAnswer({ body, citations: validCitations }, allowlist, opts);
    expect(result.ok).toBe(false);
    const structural = result.failures.filter((f) => f.gate === "structure");
    expect(structural.length).toBeGreaterThan(0);
    expect(structural.every((f) => f.severity === "structural")).toBe(true);
  });

  it("checks essay shape (contention / against / preferred)", () => {
    const essayOk =
      "The contention is that the doctrine is too broad. The case for it rests on certainty. " +
      "Against this, critics say it is rigid. On balance, the preferred view is a middle path, per s 65 (Notes p4).";
    const result = verifyAnswer({ body: essayOk, citations: [] }, allowlist, {
      ...opts,
      type: "essay",
    });
    expect(result.ok).toBe(true);
  });
});

describe("verifyAnswer — jurisdiction gate", () => {
  it("flags an out-of-jurisdiction foreign authority not in the corpus", () => {
    const body =
      "Issue: x. Rule: see R v Secretary [2024] UKSC 12. Application: here. Conclusion: y.";
    const result = verifyAnswer({ body, citations: [] }, allowlist, opts);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.gate === "jurisdiction" || f.gate === "citation-allowlist")).toBe(true);
  });
});
