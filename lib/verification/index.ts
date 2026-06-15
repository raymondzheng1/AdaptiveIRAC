import type {
  Allowlist,
  Authority,
  Citation,
  QuestionType,
  VerificationFailure,
  VerificationResult,
} from "@/lib/schemas";
import {
  detectAuthorities,
  normalizeSection,
  normalizeToken,
  tokenMatchesShortForm,
  type Detection,
} from "@/lib/authorities/citation-parser";

export interface VerifiableAnswer {
  body: string;
  citations: Citation[];
  issueIds?: string[];
}

export interface VerifyOptions {
  type: QuestionType;
  /** The question text — party names here are fact references, not citations. */
  questionPrompt: string;
  /** Subject jurisdiction, e.g. "Australia"/"Cth"/"NSW". */
  jurisdiction: string;
}

interface IndexedAuthority {
  authority: Authority;
  normShortForms: string[];
  normCanonical: string;
}

function indexAllowlist(allowlist: Allowlist): IndexedAuthority[] {
  return allowlist.map((authority) => ({
    authority,
    normCanonical: normalizeToken(authority.canonical),
    normShortForms: authority.shortForms.map(normalizeToken).filter(Boolean),
  }));
}

/** Find the allow-list authority a detection refers to, or null. */
function matchDetection(d: Detection, index: IndexedAuthority[]): Authority | null {
  const needle = d.kind === "statute" ? normalizeSection(d.raw) : d.normalized;
  for (const entry of index) {
    if (tokenMatchesShortForm(needle, entry.normCanonical)) return entry.authority;
    for (const sf of entry.normShortForms) {
      if (tokenMatchesShortForm(needle, sf)) return entry.authority;
    }
  }
  return null;
}

const JR_FOREIGN_HINT =
  /\b(UKSC|UKHL|EWCA|EWHC|UKPC|USSC|SCOTUS|F\.?\s?2d|F\.?\s?3d|U\.?S\.?\s?\d)\b/;

function isJurisdictionCompatible(authority: Authority, subjectJurisdiction: string): boolean {
  if (!authority.jurisdiction) return true; // untagged ⇒ from corpus ⇒ in-scope
  const aj = authority.jurisdiction.toLowerCase();
  const sj = subjectJurisdiction.toLowerCase();
  if (sj.includes("australia")) {
    return /(cth|commonwealth|nsw|vic|qld|wa|sa|tas|act|nt|australia|hca|fca|fcafc)/.test(aj);
  }
  return aj === sj || aj.includes(sj) || sj.includes(aj);
}

/** Structure gate — IRAC limbs for hypos, contention shape for essays. (Structural ⇒ repairable.) */
function checkStructure(body: string, type: QuestionType): VerificationFailure[] {
  const text = body.toLowerCase();
  const has = (re: RegExp) => re.test(text);
  const failures: VerificationFailure[] = [];
  if (type === "hypothetical") {
    const limbs: Array<[string, RegExp]> = [
      ["issue", /\bissue\b/],
      ["rule", /\b(rule|ratio|the law|legal test)\b/],
      ["application", /\b(application|apply|applying|on the facts|here[,]?)\b/],
      ["conclusion", /\b(conclusion|conclude|on balance|in conclusion)\b/],
    ];
    for (const [name, re] of limbs) {
      if (!has(re)) {
        failures.push({
          gate: "structure",
          severity: "structural",
          message: `Missing IRAC limb: ${name}.`,
          offending: name,
        });
      }
    }
  } else {
    if (!has(/\b(contention|proposition|thesis|the question asks|this essay)\b/)) {
      failures.push({
        gate: "structure",
        severity: "structural",
        message: "Essay is missing an explicit contention.",
        offending: "contention",
      });
    }
    if (!has(/\b(against|on the other hand|counter|critics|conversely)\b/)) {
      failures.push({
        gate: "structure",
        severity: "structural",
        message: "Essay is missing the opposing case.",
        offending: "against",
      });
    }
    if (!has(/\b(preferred|preferable|on balance|conclusion|the better view)\b/)) {
      failures.push({
        gate: "structure",
        severity: "structural",
        message: "Essay is missing a reasoned preferred position.",
        offending: "preferred",
      });
    }
  }
  return failures;
}

/**
 * The full verification gate. Returns ok=false with structured failures.
 * Severity drives the pipeline: structural ⇒ envelope repair; content ⇒ regenerate.
 */
export function verifyAnswer(
  answer: VerifiableAnswer,
  allowlist: Allowlist,
  opts: VerifyOptions,
): VerificationResult {
  const failures: VerificationFailure[] = [];
  const matchedAuthorityIds = new Set<string>();
  const index = indexAllowlist(allowlist);
  const promptNorm = normalizeToken(opts.questionPrompt);
  // Pinpoint labels (e.g. "Sem 21 s9", "Notes p4") can contain section-like
  // tokens. A detection that is a fragment of a known corpus location label is
  // a pinpoint, not a citation to verify.
  const locationLabels = allowlist.flatMap((a) => a.locations.map((l) => l.label.toLowerCase()));
  const isPinpointFragment = (raw: string): boolean => {
    const r = raw.toLowerCase().trim();
    return locationLabels.some((label) => label.includes(r));
  };

  // Gate 1 — structure.
  failures.push(...checkStructure(answer.body, opts.type));

  // Gate 2 — citation allow-list (the core). Scan the prose independently of
  // whatever the model "declared", so a hallucinated citation can't slip through.
  const detections = detectAuthorities(answer.body);
  for (const d of detections) {
    const match = matchDetection(d, index);
    if (match) {
      matchedAuthorityIds.add(match.id);
      // Gate 3 — jurisdiction (only meaningful for tagged authorities).
      if (!isJurisdictionCompatible(match, opts.jurisdiction)) {
        failures.push({
          gate: "jurisdiction",
          severity: "content",
          message: `Authority "${match.canonical}" is outside the subject jurisdiction (${opts.jurisdiction}).`,
          offending: match.canonical,
        });
      }
      continue;
    }
    // A fragment of a known corpus pinpoint label ⇒ not a citation.
    if (isPinpointFragment(d.raw)) continue;
    // Unmatched case-name that also appears in the question facts ⇒ a fact
    // reference (e.g. the hypothetical's own parties), not a citation.
    if (d.kind === "case" && promptNorm.includes(d.normalized)) continue;
    // Statute sections are ubiquitous; only flag if it clearly looks like a
    // citation the corpus doesn't contain. Unmatched section ⇒ content fail.
    failures.push({
      gate: "citation-allowlist",
      severity: "content",
      message: `Citation "${d.raw.trim()}" is not on the session allow-list.`,
      offending: d.raw.trim(),
    });
    // Out-of-jurisdiction foreign authorities are a content failure too.
    if (JR_FOREIGN_HINT.test(d.raw)) {
      failures.push({
        gate: "jurisdiction",
        severity: "content",
        message: `Citation "${d.raw.trim()}" appears to be a foreign authority not in your materials.`,
        offending: d.raw.trim(),
      });
    }
  }

  // Declared-citation checks: every declared citation must resolve to the
  // allow-list (gate 2) AND carry a pinpoint binding to a corpus location (gate 4).
  for (const c of answer.citations) {
    const authority = allowlist.find((a) => a.id === c.authorityId);
    if (!authority) {
      failures.push({
        gate: "citation-allowlist",
        severity: "content",
        message: `Declared citation references an unknown authority id.`,
        offending: c.display,
      });
      continue;
    }
    matchedAuthorityIds.add(authority.id);
    // Gate 4 — pinpoint binding.
    if (!c.pinpoint || !c.pinpoint.trim()) {
      failures.push({
        gate: "pinpoint-binding",
        severity: "content",
        message: `Citation "${c.display}" has no pinpoint.`,
        offending: c.display,
      });
    }
    const bound = authority.locations.some(
      (loc) => loc.sourceId === c.location.sourceId && loc.label === c.location.label,
    );
    if (!bound) {
      failures.push({
        gate: "pinpoint-binding",
        severity: "content",
        message: `Citation "${c.display}" does not bind to a known corpus location.`,
        offending: c.display,
      });
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    matchedAuthorityIds: [...matchedAuthorityIds],
  };
}

/** Convenience: does a result contain any content (non-repairable) failure? */
export function hasContentFailure(result: VerificationResult): boolean {
  return result.failures.some((f) => f.severity === "content");
}
