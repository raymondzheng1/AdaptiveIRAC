import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

/**
 * Two invariants that must NEVER regress (BUILD_INDEX):
 *  1. No generated output reaches a user without passing lib/verification.
 *  2. No model call happens without passing the lib/cost guard.
 * Add a new generate route to the list below and this test fails until it complies.
 */
const GENERATE_ROUTES = [
  "app/api/generate/question/route.ts",
  "app/api/generate/answer/route.ts",
  "app/api/feedback/route.ts",
];

describe("invariant: cost guard before every model call", () => {
  for (const route of GENERATE_ROUTES) {
    it(`${route} calls checkBudget before generating`, () => {
      expect(read(route)).toContain("checkBudget");
    });
  }

  it("the runner guards every internal model call", () => {
    const runner = read("lib/generation/runner.ts");
    expect(runner).toContain("checkBudget");
    expect(runner).toContain("recordUsage");
    // The model client is only reached via the guarded wrapper.
    expect(runner).toContain("guardedComplete");
  });
});

describe("invariant: every model answer passes verification", () => {
  it("the answer runner routes output through verifyAnswer", () => {
    expect(read("lib/generation/runner.ts")).toContain("verifyAnswer");
  });

  it("the verifier implements all four gates", () => {
    const v = read("lib/verification/index.ts");
    for (const gate of ["structure", "citation-allowlist", "jurisdiction", "pinpoint-binding"]) {
      expect(v).toContain(`"${gate}"`);
    }
  });
});

describe("invariant: no AI/vendor mentions in customer copy", () => {
  const SURFACES = ["app/page.tsx", "app/practice/page.tsx", "components/practice/CitationList.tsx"];
  const FORBIDDEN = /\b(claude|anthropic|openai|chatgpt|llm)\b/i;
  for (const file of SURFACES) {
    it(`${file} contains no AI/vendor mention`, () => {
      const lines = read(file)
        .split(/\r?\n/)
        .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"));
      expect(FORBIDDEN.test(lines.join("\n"))).toBe(false);
    });
  }
});
