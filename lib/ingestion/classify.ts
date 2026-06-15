import type { SourceKind } from "@/lib/schemas";

/** Heuristic source classification (the student can correct it in the UI). */
export function classifySource(filename: string, text: string, ext: string): SourceKind {
  const name = filename.toLowerCase();
  if (ext === "pptx" || /\b(slides?|lecture|seminar|sem\s?\d)\b/.test(name)) return "slides";

  const sample = text.slice(0, 4000);
  const caseHits = (sample.match(/\sv\.?\s/g) ?? []).length;
  const sectionHits = (sample.match(/\bs(s|ection)?\.?\s?\d+/gi) ?? []).length;

  if (/\bact\b|\bregulation\b|\bstatute\b/i.test(name) || sectionHits > 8) return "statute";
  if (/\bv\b|judgment|judgement|\bhca\b|\bfca\b|\[\d{4}\]/i.test(name) || caseHits > 6) return "case";
  if (/\bnotes?\b|summary|outline|study/.test(name)) return "notes";
  return "notes";
}
