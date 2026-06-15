import { describe, it, expect } from "vitest";
import {
  detectAuthorities,
  normalizeSection,
  normalizeToken,
  tokenMatchesShortForm,
} from "@/lib/authorities/citation-parser";

describe("citation parser — detection of AU authority shapes", () => {
  it("detects party-v-party case names", () => {
    const d = detectAuthorities("As held in Minister for Immigration v Li, the test applies.");
    expect(d.some((x) => x.kind === "case" && /li/i.test(x.raw))).toBe(true);
  });

  it("detects medium-neutral citations", () => {
    const d = detectAuthorities("See Kirk [2010] HCA 1 for the principle.");
    expect(d.some((x) => x.kind === "neutral-citation")).toBe(true);
  });

  it("detects reported citations", () => {
    const d = detectAuthorities("Li (2013) 249 CLR 332 confirms this.");
    expect(d.some((x) => x.kind === "reported-citation")).toBe(true);
  });

  it("detects statute sections", () => {
    const d = detectAuthorities("Under s 19A(b) and ss 18-19 the duty arises.");
    expect(d.filter((x) => x.kind === "statute").length).toBeGreaterThanOrEqual(1);
  });

  it("normalizes sections to a canonical form", () => {
    expect(normalizeSection("s 19A(b)")).toBe("s 19a(b)");
    expect(normalizeSection("section 65")).toBe("s 65");
  });

  it("short-form matching is containment-based but guards tiny tokens", () => {
    // A detected full case name matches a distinctive surname short-form.
    expect(tokenMatchesShortForm("associated provincial picture houses v wednesbury corporation", "wednesbury")).toBe(true);
    expect(tokenMatchesShortForm("smith v jones", "jones")).toBe(true);
    // A 1-2 char short-form must NOT loosely match unrelated words ("policy" ⊇ "li").
    expect(tokenMatchesShortForm("policy", "li")).toBe(false);
    expect(tokenMatchesShortForm("anything", "a")).toBe(false);
  });

  it("normalizeToken strips emphasis and trailing punctuation", () => {
    expect(normalizeToken("*Li*,")).toBe("li");
  });
});
