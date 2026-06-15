/**
 * Deterministic citation parsing for Australian legal authorities.
 *
 * Two jobs:
 *  1. Extraction: find authority candidates in corpus text (to build the allow-list).
 *  2. Verification: find every authority *mention* in generated prose so the
 *     verifier can prove each one is on the session allow-list. This is the
 *     hallucination net — it must be independent of whatever the model "declared".
 *
 * No substantive law is encoded here, only citation *shapes*.
 */

export type DetectedKind = "case" | "reported-citation" | "neutral-citation" | "statute";

export interface Detection {
  kind: DetectedKind;
  /** The raw matched text. */
  raw: string;
  /** Normalised form for matching. */
  normalized: string;
  /** Character offset in the scanned text. */
  index: number;
}

/** Lower-case, strip emphasis/punctuation noise, collapse whitespace. */
export function normalizeToken(input: string): string {
  return input
    .toLowerCase()
    .replace(/[*_`]/g, "") // markdown emphasis
    .replace(/[“”"']/g, "")
    .replace(/–|—/g, "-") // en/em dash → hyphen
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/g, "")
    .trim();
}

// "Party v Party" — the most reliable signal of a case in legal prose.
// Allows multi-word, capitalised party names with common punctuation.
const CASE_NAME_RE =
  /\b([A-Z][A-Za-z'’.&()-]+(?:\s+(?:of|for|the|and|&|[A-Z][A-Za-z'’.&()-]+))*)\s+v\.?\s+([A-Z][A-Za-z'’.&()-]+(?:\s+(?:of|for|the|and|&|[A-Z][A-Za-z'’.&()-]+))*)/g;

// Medium-neutral citation, e.g. "[2024] HCA 12".
const NEUTRAL_CITATION_RE = /\[(\d{4})\]\s+([A-Z]{2,6})\s+(\d+)/g;

// Reported citation, e.g. "(2013) 249 CLR 332".
const REPORTED_CITATION_RE = /\((\d{4})\)\s+(\d+)\s+([A-Z]{2,6})\s+(\d+)/g;

// Statute sections, e.g. "s 19A(b)", "ss 18-19", "section 65".
const SECTION_RE = /\b(?:ss?|sections?)\s?\.?\s*(\d+[A-Za-z]*(?:\([0-9a-zA-Z]+\))*(?:\s?[-–]\s?\d+[A-Za-z]*)?)/g;

function collect(re: RegExp, text: string, kind: DetectedKind): Detection[] {
  const out: Detection[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({
      kind,
      raw: m[0],
      normalized: normalizeToken(m[0]),
      index: m.index,
    });
  }
  return out;
}

/** All authority-shaped detections in a block of text. */
export function detectAuthorities(text: string): Detection[] {
  return [
    ...collect(CASE_NAME_RE, text, "case"),
    ...collect(NEUTRAL_CITATION_RE, text, "neutral-citation"),
    ...collect(REPORTED_CITATION_RE, text, "reported-citation"),
    ...collect(SECTION_RE, text, "statute"),
  ].sort((a, b) => a.index - b.index);
}

/** Section labels normalised to a canonical "s NN..." form for matching. */
export function normalizeSection(raw: string): string {
  const m = /(\d+[A-Za-z]*(?:\([0-9a-zA-Z]+\))*(?:\s?[-–]\s?\d+[A-Za-z]*)?)/.exec(raw);
  const captured = m?.[1];
  if (!captured) return normalizeToken(raw);
  return `s ${captured.replace(/\s?[-–]\s?/g, "-").toLowerCase()}`;
}

/**
 * Does a detected token refer to a known short-form? Containment in either
 * direction so "associated provincial picture houses v wednesbury corporation"
 * matches the short-form "wednesbury", and "Li" matches "minister v li".
 */
export function tokenMatchesShortForm(detectedNorm: string, shortFormNorm: string): boolean {
  if (!detectedNorm || !shortFormNorm) return false;
  if (detectedNorm === shortFormNorm) return true;
  // Guard against trivially-short short-forms matching everything.
  if (shortFormNorm.length >= 3 && detectedNorm.includes(shortFormNorm)) return true;
  if (detectedNorm.length >= 3 && shortFormNorm.includes(detectedNorm)) return true;
  return false;
}
