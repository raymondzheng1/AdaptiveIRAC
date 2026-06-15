import { z } from "zod";
import {
  AllowlistSchema,
  AuthoritySchema,
  IssueTaxonomySchema,
  PinpointSchema,
  SourceSchema,
  SubjectSchema,
} from "./core";
import {
  DifficultySchema,
  FeedbackSchema,
  InsufficientGroundingSchema,
  ModelAnswerSchema,
  QuestionSchema,
  QuestionTypeSchema,
} from "./practice";

/** A passage selected (whole-corpus or via keyword retrieval) to ground a call. */
export const ContextPassageSchema = z.object({
  sourceId: z.string().min(1),
  sourceFilename: z.string().min(1),
  label: z.string().min(1),
  text: z.string().min(1),
});
export type ContextPassage = z.infer<typeof ContextPassageSchema>;

/** Optional bring-your-own-key payload. Read once, never logged or stored. */
export const ByoKeySchema = z
  .object({
    provider: z.literal("anthropic").default("anthropic"),
    apiKey: z.string().min(10).max(300),
  })
  .optional();
export type ByoKey = z.infer<typeof ByoKeySchema>;

// --- /api/parse ---
export const ParseResponseSchema = z.object({
  sources: z.array(SourceSchema),
  authorities: AllowlistSchema,
  issueTaxonomy: IssueTaxonomySchema,
});
export type ParseResponse = z.infer<typeof ParseResponseSchema>;

// --- /api/generate/question ---
export const GenerateQuestionRequestSchema = z.object({
  subject: SubjectSchema,
  allowlist: AllowlistSchema,
  issueTaxonomy: IssueTaxonomySchema,
  context: z.array(ContextPassageSchema).min(1),
  type: QuestionTypeSchema,
  topic: z.string().max(200).default(""),
  difficulty: DifficultySchema.default("standard"),
  byoKey: ByoKeySchema,
});
export type GenerateQuestionRequest = z.infer<typeof GenerateQuestionRequestSchema>;

export const GenerateQuestionResponseSchema = z.object({
  question: QuestionSchema,
});
export type GenerateQuestionResponse = z.infer<typeof GenerateQuestionResponseSchema>;

// --- /api/generate/answer ---
export const GenerateAnswerRequestSchema = z.object({
  subject: SubjectSchema,
  question: QuestionSchema,
  allowlist: AllowlistSchema,
  context: z.array(ContextPassageSchema).min(1),
  byoKey: ByoKeySchema,
});
export type GenerateAnswerRequest = z.infer<typeof GenerateAnswerRequestSchema>;

export const GenerateAnswerResponseSchema = z.union([
  z.object({ answer: ModelAnswerSchema }),
  z.object({ insufficientGrounding: InsufficientGroundingSchema }),
]);
export type GenerateAnswerResponse = z.infer<typeof GenerateAnswerResponseSchema>;

// --- /api/feedback ---
export const FeedbackRequestSchema = z.object({
  subject: SubjectSchema,
  question: QuestionSchema,
  /** The model answer's issue set, for spotted/missed comparison. */
  modelAnswerIssueIds: z.array(z.string()).default([]),
  modelAnswerSummary: z.string().max(8000).default(""),
  attemptText: z.string().max(60000),
  allowlist: AllowlistSchema,
  byoKey: ByoKeySchema,
});
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

export const FeedbackResponseSchema = z.object({
  feedback: FeedbackSchema,
});
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>;

// --- shared error envelope ---
export const ApiErrorSchema = z.object({
  error: z.string(),
  /** Machine-readable code so the UI can branch (e.g. show the BYO-key affordance). */
  code: z.enum([
    "bad_request",
    "rate_limited",
    "session_cap_reached",
    "global_budget_exhausted",
    "cost_guard_unavailable",
    "empty_allowlist",
    "insufficient_grounding",
    "upstream_error",
    "internal_error",
  ]),
  /** Current spend snapshot for the usage meter, when known. */
  spend: z
    .object({ usedUsd: z.number(), capUsd: z.number() })
    .optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export { AuthoritySchema, PinpointSchema };
