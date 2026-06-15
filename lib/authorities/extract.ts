import type { Authority, IssueTaxonomy, Pinpoint, Source } from "@/lib/schemas";
import { stableId } from "@/lib/util/id";
import { truncate } from "@/lib/util/text";
import {
  detectAuthorities,
  normalizeSection,
  normalizeToken,
  type Detection,
} from "./citation-parser";

/** Find the page/slide span containing a character offset and build a pinpoint. */
function locate(source: Source, index: number, raw: string): Pinpoint {
  const span = source.pageMap.find((s) => index >= s.start && index < s.end);
  const snippetStart = Math.max(0, index - 40);
  const snippetEnd = Math.min(source.text.length, index + raw.length + 80);
  return {
    sourceId: source.id,
    sourceFilename: source.filename,
    label: span ? span.label : source.filename,
    page: span?.page,
    snippet: truncate(source.text.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim(), 240),
  };
}

interface AuthBuilder {
  kind: Authority["kind"];
  canonical: string;
  shortForms: Set<string>;
  locations: Pinpoint[];
}

/** Surname tokens that distinguish a case (last word of each party). */
function caseShortForms(raw: string): string[] {
  const parts = raw.split(/\s+v\.?\s+/i);
  const forms = new Set<string>([normalizeToken(raw)]);
  for (const p of parts) {
    const words = p.trim().split(/\s+/);
    const last = words[words.length - 1];
    if (last && last.length >= 3 && !/^(of|for|the|and|corporation|minister|commissioner)$/i.test(last)) {
      forms.add(normalizeToken(last));
    }
  }
  return [...forms].filter(Boolean);
}

/**
 * Build the citation allow-list from parsed sources, deterministically.
 * The student reviews and edits this before any generation runs.
 */
export function buildAllowlistFromSources(sources: Source[]): Authority[] {
  const builders = new Map<string, AuthBuilder>();

  const upsert = (key: string, init: () => AuthBuilder, loc: Pinpoint, extraForms: string[] = []) => {
    let b = builders.get(key);
    if (!b) {
      b = init();
      builders.set(key, b);
    }
    extraForms.forEach((f) => f && b!.shortForms.add(f));
    // De-duplicate locations by (sourceId,label).
    if (!b.locations.some((l) => l.sourceId === loc.sourceId && l.label === loc.label)) {
      b.locations.push(loc);
    }
  };

  for (const source of sources) {
    const detections: Detection[] = detectAuthorities(source.text);
    // Index case detections so trailing citations can attach to them.
    const cases = detections.filter((d) => d.kind === "case");

    for (const d of detections) {
      const loc = locate(source, d.index, d.raw);
      if (d.kind === "case") {
        const key = `case:${d.normalized}`;
        upsert(
          key,
          () => ({ kind: "case", canonical: d.raw.trim(), shortForms: new Set(), locations: [] }),
          loc,
          caseShortForms(d.raw),
        );
      } else if (d.kind === "neutral-citation" || d.kind === "reported-citation") {
        // Attach to the nearest preceding case within 80 chars, else stand alone.
        const owner = cases
          .filter((c) => c.index < d.index && d.index - (c.index + c.raw.length) < 80)
          .pop();
        if (owner) {
          upsert(
            `case:${owner.normalized}`,
            () => ({ kind: "case", canonical: owner.raw.trim(), shortForms: new Set(), locations: [] }),
            loc,
            [d.normalized],
          );
        } else {
          upsert(
            `cite:${d.normalized}`,
            () => ({ kind: "case", canonical: d.raw.trim(), shortForms: new Set(), locations: [] }),
            loc,
            [d.normalized],
          );
        }
      } else if (d.kind === "statute") {
        const norm = normalizeSection(d.raw);
        upsert(
          `statute:${norm}`,
          () => ({ kind: "statute", canonical: norm, shortForms: new Set(), locations: [] }),
          loc,
          [norm, d.normalized],
        );
      }
    }
  }

  return [...builders.values()]
    .filter((b) => b.locations.length > 0)
    .map((b) => ({
      id: stableId("auth", b.canonical),
      kind: b.kind,
      canonical: b.canonical,
      shortForms: [...b.shortForms].filter(Boolean),
      locations: b.locations,
    }))
    .sort((a, b) => a.canonical.localeCompare(b.canonical));
}

const HEADING_STOPWORDS = /^(introduction|conclusion|overview|contents|references|summary|agenda)$/i;

/** Extract a light issue/ground taxonomy from heading-like lines (user-editable). */
export function extractIssueTaxonomy(sources: Source[]): IssueTaxonomy {
  const seen = new Map<string, { label: string; locations: Pinpoint[] }>();

  for (const source of sources) {
    if (source.kind === "case" || source.kind === "statute") continue; // grounds live in notes/slides
    let offset = 0;
    for (const rawLine of source.text.split(/\r?\n/)) {
      const line = rawLine.trim();
      const lineStart = offset;
      offset += rawLine.length + 1;
      const headingText = line.replace(/^#{1,6}\s*/, "").replace(/[:.]+$/, "").trim();
      if (!headingText || headingText.length < 4 || headingText.length > 80) continue;
      const words = headingText.split(/\s+/);
      const isMarkdownHeading = /^#{1,6}\s+/.test(line);
      const isShortTitle = words.length <= 8 && !/[.!?]$/.test(line);
      const looksLikeHeading = isMarkdownHeading || (isShortTitle && /^[A-Z0-9]/.test(headingText));
      if (!looksLikeHeading) continue;
      if (HEADING_STOPWORDS.test(headingText)) continue;
      const key = normalizeToken(headingText);
      if (seen.has(key)) continue;
      const loc = locate(source, lineStart, rawLine);
      seen.set(key, { label: headingText, locations: [loc] });
    }
  }

  const issues = [...seen.values()].slice(0, 40).map((i) => ({
    id: stableId("issue", i.label),
    label: i.label,
    locations: i.locations,
  }));
  return { issues };
}
