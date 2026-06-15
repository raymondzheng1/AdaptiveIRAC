import { z } from "zod";
import { PinpointSchema } from "./core";

export const QuestionTypeSchema = z.enum(["hypothetical", "essay"]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const DifficultySchema = z.enum(["foundational", "standard", "challenging"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const QuestionSchema = z.object({
  id: z.string().min(1),
  type: QuestionTypeSchema,
  /** Topic / area-of-law the question targets (drawn from the issue taxonomy). */
  topic: z.string().max(200).default(""),
  difficulty: DifficultySchema.default("standard"),
  /** The question text (facts for a hypo; a contention/proposition for an essay). */
  prompt: z.string().min(1),
  /** Issue ids (from the taxonomy) the question is designed to raise. */
  targetIssueIds: z.array(z.string()).default([]),
  createdAt: z.number().int().nonnegative(),
});
export type Question = z.infer<typeof QuestionSchema>;

/**
 * A citation as declared by the generator. Every one must resolve to an
 * allow-listed authority AND carry a non-empty pinpoint that binds to a
 * corpus location — both enforced by the verifier and the citation linter.
 */
export const CitationSchema = z.object({
  authorityId: z.string().min(1),
  /** Rendered text, e.g. "Li (Sem 21 s9)". */
  display: z.string().min(1).max(300),
  /** The pinpoint label — MUST be present (citation-format linter). */
  pinpoint: z.string().min(1).max(160),
  /** The bound corpus location. */
  location: PinpointSchema,
});
export type Citation = z.infer<typeof CitationSchema>;

export const VerificationGateSchema = z.enum([
  "structure",
  "citation-allowlist",
  "jurisdiction",
  "pinpoint-binding",
]);
export type VerificationGate = z.infer<typeof VerificationGateSchema>;

export const VerificationFailureSchema = z.object({
  gate: VerificationGateSchema,
  /** "structural" failures are repairable; "content" failures force regeneration. */
  severity: z.enum(["structural", "content"]),
  message: z.string(),
  /** The offending token/authority where relevant (never user content). */
  offending: z.string().optional(),
});
export type VerificationFailure = z.infer<typeof VerificationFailureSchema>;

export const VerificationResultSchema = z.object({
  ok: z.boolean(),
  failures: z.array(VerificationFailureSchema).default([]),
  /** Authority tokens detected in the prose and matched to the allow-list. */
  matchedAuthorityIds: z.array(z.string()).default([]),
});
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export const ModelAnswerSchema = z.object({
  id: z.string().min(1),
  questionId: z.string().min(1),
  /** Markdown body. Citations appear inline as their `display` strings. */
  body: z.string().min(1),
  citations: z.array(CitationSchema).default([]),
  /** The issue ids the model answer addresses (for feedback comparison). */
  issueIds: z.array(z.string()).default([]),
  verification: VerificationResultSchema,
  createdAt: z.number().int().nonnegative(),
});
export type ModelAnswer = z.infer<typeof ModelAnswerSchema>;

/** Returned when the engine cannot ground an answer after the attempt cap. */
export const InsufficientGroundingSchema = z.object({
  insufficientGrounding: z.literal(true),
  /** Operator-safe reason (no user content). */
  reason: z.string(),
  attempts: z.number().int().positive(),
});
export type InsufficientGrounding = z.infer<typeof InsufficientGroundingSchema>;

export const AttemptSchema = z.object({
  id: z.string().min(1),
  questionId: z.string().min(1),
  text: z.string().default(""),
  wordCount: z.number().int().nonnegative().default(0),
  timeSpentMs: z.number().int().nonnegative().default(0),
  createdAt: z.number().int().nonnegative(),
});
export type Attempt = z.infer<typeof AttemptSchema>;

export const RubricScoreSchema = z.object({
  issueSpotting: z.number().min(0).max(10),
  ruleStatement: z.number().min(0).max(10),
  application: z.number().min(0).max(10),
  structure: z.number().min(0).max(10),
  authorityUse: z.number().min(0).max(10),
});
export type RubricScore = z.infer<typeof RubricScoreSchema>;

export const FeedbackSchema = z.object({
  id: z.string().min(1),
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  issuesSpotted: z.array(z.string()).default([]),
  issuesMissed: z.array(z.string()).default([]),
  /** Authorities the attempt cited that are NOT on the allow-list (integrity flag). */
  outOfCorpusCitations: z.array(z.string()).default([]),
  structureNotes: z.string().default(""),
  applicationDepthNotes: z.string().default(""),
  rubric: RubricScoreSchema,
  /** Exactly three concrete next actions. */
  actions: z.array(z.string()).min(1).max(5),
  createdAt: z.number().int().nonnegative(),
});
export type Feedback = z.infer<typeof FeedbackSchema>;
