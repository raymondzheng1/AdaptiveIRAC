import { describe, it, expect } from "vitest";
import { buildAllowlistFromSources, extractIssueTaxonomy } from "@/lib/authorities/extract";
import type { Source } from "@/lib/schemas";

const sources: Source[] = [
  {
    id: "s1",
    filename: "Slides.pptx",
    kind: "slides",
    text:
      "Judicial review grounds\n\nThe leading case is Minister for Immigration v Li (2013) 249 CLR 332. " +
      "Unreasonableness is a recognised ground. See also s 65 of the Act.",
    pageMap: [
      { label: "Slide 1", page: 1, start: 0, end: 25 },
      { label: "Slide 2", page: 2, start: 25, end: 200 },
    ],
  },
];

describe("authority extraction", () => {
  it("builds an allow-list with canonical names, short-forms and corpus locations", () => {
    const allowlist = buildAllowlistFromSources(sources);
    expect(allowlist.length).toBeGreaterThan(0);
    const li = allowlist.find((a) => /li/i.test(a.canonical));
    expect(li).toBeTruthy();
    expect(li?.locations.length).toBeGreaterThan(0);
    expect(li?.locations[0]?.sourceFilename).toBe("Slides.pptx");
  });

  it("extracts a draft issue taxonomy from heading-like lines", () => {
    const taxonomy = extractIssueTaxonomy(sources);
    expect(taxonomy.issues.some((i) => /judicial review grounds/i.test(i.label))).toBe(true);
  });

  it("does not invent authorities for empty corpora", () => {
    expect(buildAllowlistFromSources([])).toEqual([]);
  });
});
