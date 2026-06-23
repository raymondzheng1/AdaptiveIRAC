/** Shared shapes for the verified-answer system (landing demo + workspace hero). */

export type AuthorityType = "Case" | "Statute" | "Notes" | "Slides";

export interface SourceAuthority {
  id: string;
  /** Chip label, e.g. "Donoghue" or "CLA s 5B". */
  short: string;
  /** Full name, e.g. "Donoghue v Stevenson". */
  name: string;
  type: AuthorityType;
  /** Pinpoint, e.g. "Slides · Sem 2, s9". */
  where: string;
  /** The exact passage quoted in the source panel. */
  snippet: string;
}

/** A run of answer prose: either plain text or an inline citation. */
export type AnswerSegment =
  | { kind: "text"; text: string }
  | { kind: "cite"; authorityId: string; label: string };

export interface AnswerLimb {
  /** IRAC: Issue/Rule/Application/Conclusion; essay: Contention/For/Against/Preferred view. */
  label: string;
  segments: AnswerSegment[];
}

export function badgeTypeOf(t: AuthorityType): "case" | "statute" | "notes" | "slides" {
  return t.toLowerCase() as "case" | "statute" | "notes" | "slides";
}
