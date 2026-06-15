import { z } from "zod";
import {
  AllowlistSchema,
  IssueTaxonomySchema,
  SourceSchema,
  SubjectSchema,
} from "./core";
import {
  AttemptSchema,
  FeedbackSchema,
  ModelAnswerSchema,
  QuestionSchema,
} from "./practice";
import { ExamSessionSchema, ProgressSchema } from "./exam";

/** Bumped whenever the persisted shape changes; the storage layer migrates by key. */
export const STORAGE_VERSION = 1 as const;

/**
 * The complete browser-held workspace for one subject/session. This is also
 * the export/import bundle a student downloads to move between devices —
 * the only "backup" in a Tier-B app that stores nothing server-side.
 */
export const WorkspaceSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  subject: SubjectSchema,
  sources: z.array(SourceSchema).default([]),
  allowlist: AllowlistSchema.default([]),
  /** Whether the student has confirmed the allow-list (gates generation). */
  allowlistConfirmed: z.boolean().default(false),
  issueTaxonomy: IssueTaxonomySchema.default({ issues: [] }),
  questions: z.array(QuestionSchema).default([]),
  modelAnswers: z.array(ModelAnswerSchema).default([]),
  attempts: z.array(AttemptSchema).default([]),
  feedback: z.array(FeedbackSchema).default([]),
  exams: z.array(ExamSessionSchema).default([]),
  progress: ProgressSchema.default({}),
  updatedAt: z.number().int().nonnegative().default(0),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const AiracExportSchema = z.object({
  kind: z.literal("adaptive-irac-export"),
  exportedAt: z.number().int().nonnegative(),
  workspace: WorkspaceSchema,
});
export type AiracExport = z.infer<typeof AiracExportSchema>;

export function emptyWorkspace(subjectName = "My subject"): Workspace {
  return WorkspaceSchema.parse({
    version: STORAGE_VERSION,
    subject: { name: subjectName, jurisdiction: "Australia", examFormat: "mixed" },
    updatedAt: 0,
  });
}
