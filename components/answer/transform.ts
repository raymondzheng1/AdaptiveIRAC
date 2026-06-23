import type { Allowlist, ModelAnswer } from "@/lib/schemas";
import type { AnswerLimb, AnswerSegment, AuthorityType, SourceAuthority } from "./answer-types";

/**
 * Presentation transform: turn a real grounded ModelAnswer (markdown body +
 * structured citations) into the limb + inline-chip + source-authority shape the
 * Pincite renderer expects. Pure/presentational — no logic change.
 */

const LIMB_RE =
  /^\s*(?:#{1,6}\s*)?\*{0,2}(Issue|Rule|Application|Conclusion|Contention|For|Against|Preferred(?:\s+view)?)\b\*{0,2}\s*[:.—-]?\s*/i;

const TITLE: Record<string, string> = {
  issue: "Issue",
  rule: "Rule",
  application: "Application",
  conclusion: "Conclusion",
  contention: "Contention",
  for: "For",
  against: "Against",
  "preferred view": "Preferred view",
  preferred: "Preferred view",
};

function typeOf(kind: string | undefined, sourceFilename: string | undefined): AuthorityType {
  if (kind === "statute") return "Statute";
  if (kind === "case") return "Case";
  if (/slide|sem|lecture|\.pptx/i.test(sourceFilename ?? "")) return "Slides";
  return "Notes";
}

function shortOf(display: string, canonical?: string): string {
  const stripped = display.replace(/\s*\(.*?\)\s*$/, "").trim();
  return stripped || canonical || display;
}

export interface PresentedAnswer {
  limbs: AnswerLimb[];
  authorities: Record<string, SourceAuthority>;
  order: string[];
}

export function presentAnswer(answer: ModelAnswer, allowlist: Allowlist): PresentedAnswer {
  const authorities: Record<string, SourceAuthority> = {};
  const order: string[] = [];

  for (const c of answer.citations) {
    if (authorities[c.authorityId]) continue;
    const authority = allowlist.find((a) => a.id === c.authorityId);
    const where = c.location.sourceFilename
      ? `${c.location.sourceFilename} · ${c.pinpoint || c.location.label}`
      : c.pinpoint || c.location.label;
    authorities[c.authorityId] = {
      id: c.authorityId,
      short: shortOf(c.display, authority?.canonical),
      name: authority?.canonical ?? c.display,
      type: typeOf(authority?.kind, c.location.sourceFilename),
      where,
      snippet: c.location.snippet ?? "This authority appears in your uploaded materials at the pinpoint shown.",
    };
    order.push(c.authorityId);
  }

  // Build inline-match needles: prefer the rendered display, fall back to short.
  const needles = answer.citations
    .map((c) => ({
      id: c.authorityId,
      text: c.display,
      label: authorities[c.authorityId]?.short ?? c.display,
    }))
    .filter((n) => n.text)
    .sort((a, b) => b.text.length - a.text.length);

  const limbs = parseLimbs(answer.body).map((limb) => ({
    label: limb.label,
    segments: splitProse(limb.text, needles),
  }));

  return { limbs, authorities, order };
}

function parseLimbs(body: string): Array<{ label: string; text: string }> {
  const lines = body.split(/\r?\n/);
  const limbs: Array<{ label: string; text: string }> = [];
  let current: { label: string; text: string } | null = null;
  let preamble = "";

  for (const raw of lines) {
    const m = LIMB_RE.exec(raw);
    if (m) {
      const label = TITLE[m[1]!.toLowerCase()] ?? m[1]!;
      const rest = raw.slice(m[0].length).trim();
      current = { label, text: rest };
      limbs.push(current);
    } else if (current) {
      const t = raw.trim();
      if (t) current.text += (current.text ? " " : "") + t;
    } else {
      const t = raw.trim();
      if (t) preamble += (preamble ? " " : "") + t;
    }
  }

  // No recognisable limbs ⇒ render the whole answer as one block.
  if (limbs.length === 0) {
    const text = stripMarkdown(body.replace(/\s+/g, " ").trim());
    return text ? [{ label: "Answer", text }] : [];
  }
  if (preamble.trim()) limbs.unshift({ label: "Answer", text: stripMarkdown(preamble) });
  return limbs.map((l) => ({ label: l.label, text: stripMarkdown(l.text) }));
}

function stripMarkdown(s: string): string {
  return s.replace(/\*\*/g, "").replace(/(^|\s)\*(\S)/g, "$1$2").replace(/#{1,6}\s*/g, "").trim();
}

/** Split a limb's prose into text + inline-citation segments. */
function splitProse(
  prose: string,
  needles: Array<{ id: string; text: string; label: string }>,
): AnswerSegment[] {
  if (!prose) return [];
  if (needles.length === 0) return [{ kind: "text", text: prose }];

  const segments: AnswerSegment[] = [];
  let rest = prose;

  while (rest.length > 0) {
    let best: { index: number; needle: (typeof needles)[number] } | null = null;
    for (const n of needles) {
      const i = rest.indexOf(n.text);
      if (i !== -1 && (best === null || i < best.index)) best = { index: i, needle: n };
    }
    if (!best) {
      segments.push({ kind: "text", text: rest });
      break;
    }
    if (best.index > 0) segments.push({ kind: "text", text: rest.slice(0, best.index) });
    segments.push({ kind: "cite", authorityId: best.needle.id, label: best.needle.label });
    rest = rest.slice(best.index + best.needle.text.length);
  }
  return segments;
}
