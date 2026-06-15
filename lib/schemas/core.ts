import { z } from "zod";

/**
 * Core session-scoped domain shapes. NOTHING here is persisted server-side.
 * The corpus, allow-list and issue taxonomy live in the browser (localStorage)
 * and in request bodies; uploaded originals are parsed in memory and discarded.
 */

export const JurisdictionSchema = z
  .string()
  .min(1)
  .max(40)
  .describe("e.g. 'Cth', 'NSW', 'Australia' — used by the jurisdiction gate");

export const SourceKindSchema = z.enum(["case", "statute", "slides", "notes", "other"]);
export type SourceKind = z.infer<typeof SourceKindSchema>;

/** A locatable position inside the corpus (the pinpoint a citation must bind to). */
export const PinpointSchema = z.object({
  sourceId: z.string().min(1),
  sourceFilename: z.string().min(1),
  /** Human label rendered with the citation, e.g. "Sem 21 s9", "Notes p4", "s 19A(b)". */
  label: z.string().min(1).max(120),
  /** 1-based page/slide number, if known. */
  page: z.number().int().positive().optional(),
  /** Short surrounding text to power click-to-source. */
  snippet: z.string().max(600).optional(),
});
export type Pinpoint = z.infer<typeof PinpointSchema>;

/** A page/slide boundary inside a parsed source (start/end are character offsets in `text`). */
export const PageSpanSchema = z.object({
  /** Display label, e.g. "p1", "Slide 3", "Sem 21 s9". */
  label: z.string().min(1).max(80),
  page: z.number().int().positive(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});
export type PageSpan = z.infer<typeof PageSpanSchema>;

export const SourceSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1).max(300),
  kind: SourceKindSchema,
  /** Full extracted text (held in browser only). */
  text: z.string(),
  /** Page/slide boundaries within `text`. */
  pageMap: z.array(PageSpanSchema).default([]),
});
export type Source = z.infer<typeof SourceSchema>;

export const AuthorityKindSchema = z.enum(["case", "statute", "concept"]);
export type AuthorityKind = z.infer<typeof AuthorityKindSchema>;

/**
 * An item on the citation allow-list. The verifier enforces that every
 * authority in any generated output matches one of these (by short-form or
 * canonical name) AND binds to one of its corpus `locations`.
 */
export const AuthoritySchema = z.object({
  id: z.string().min(1),
  kind: AuthorityKindSchema,
  /** Canonical display name, e.g. "Minister for Immigration v Li" or "Migration Act 1958 (Cth) s 65". */
  canonical: z.string().min(1).max(300),
  /**
   * Match tokens the verifier accepts as referring to this authority
   * (lower-cased on comparison). Includes the short-form ("Li"), the full
   * name, the medium-neutral citation, statute section labels, etc.
   */
  shortForms: z.array(z.string().min(1).max(200)).min(1),
  /** Jurisdiction tag for the jurisdiction gate; absent ⇒ treated as in-corpus/neutral. */
  jurisdiction: JurisdictionSchema.optional(),
  /** Where this authority appears in the corpus. At least one ⇒ pinpoint-bindable. */
  locations: z.array(PinpointSchema).min(1),
});
export type Authority = z.infer<typeof AuthoritySchema>;

/** The session allow-list: the closed set of citable authorities. */
export const AllowlistSchema = z.array(AuthoritySchema);
export type Allowlist = z.infer<typeof AllowlistSchema>;

export const IssueSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(200),
  /** Optional grouping, e.g. "Judicial review grounds", "Standing". */
  category: z.string().max(120).optional(),
  /** Corpus locations where the issue is taught, if found. */
  locations: z.array(PinpointSchema).default([]),
});
export type Issue = z.infer<typeof IssueSchema>;

export const IssueTaxonomySchema = z.object({
  issues: z.array(IssueSchema).default([]),
});
export type IssueTaxonomy = z.infer<typeof IssueTaxonomySchema>;

export const ExamFormatSchema = z.enum(["hypothetical", "essay", "mixed"]);
export type ExamFormat = z.infer<typeof ExamFormatSchema>;

export const SubjectSchema = z.object({
  name: z.string().min(1).max(160),
  jurisdiction: JurisdictionSchema.default("Australia"),
  examFormat: ExamFormatSchema.default("mixed"),
});
export type Subject = z.infer<typeof SubjectSchema>;
