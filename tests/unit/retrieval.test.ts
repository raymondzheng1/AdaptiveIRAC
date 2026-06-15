import { describe, it, expect } from "vitest";
import { chunkSource, selectContext, totalCorpusChars } from "@/lib/retrieval";
import type { Source } from "@/lib/schemas";

const makeSource = (id: string, text: string): Source => ({
  id,
  filename: `${id}.txt`,
  kind: "notes",
  text,
  pageMap: [],
});

describe("retrieval", () => {
  it("chunks a source by paragraphs when there is no page map", () => {
    const chunks = chunkSource(makeSource("s1", "Para one.\n\nPara two about standing."));
    expect(chunks.length).toBe(2);
  });

  it("uses whole-corpus mode when the corpus fits the budget", () => {
    const sources = [makeSource("s1", "short text about jurisdiction")];
    const result = selectContext(sources, "jurisdiction");
    expect(result.mode).toBe("whole-corpus");
  });

  it("switches to keyword mode and selects relevant passages when over budget", () => {
    const filler = "irrelevant ".repeat(50);
    const sources = [
      makeSource("s1", Array.from({ length: 200 }, (_, i) => `${filler} topic-${i}`).join("\n\n")),
      makeSource("s2", "the special keyword procedural fairness appears here distinctly"),
    ];
    const result = selectContext(sources, "procedural fairness", 2000);
    expect(result.mode).toBe("keyword");
    expect(result.passages.some((p) => /procedural fairness/.test(p.text))).toBe(true);
  });

  it("totalCorpusChars sums source text length", () => {
    expect(totalCorpusChars([makeSource("s1", "abc"), makeSource("s2", "de")])).toBe(5);
  });
});
