import { z } from "zod";

/** Single-device progress (localStorage only; never synced server-side). */
export const ProgressSchema = z.object({
  /** Topics practised on this device. */
  topicsPractised: z.array(z.string()).default([]),
  /** Count of attempts per issue id, to surface most-missed issues. */
  issueMissCounts: z.record(z.string(), z.number().int().nonnegative()).default({}),
  /** Running average rubric limb scores, to surface the weakest IRAC limb. */
  limbAverages: z
    .object({
      issueSpotting: z.number().default(0),
      ruleStatement: z.number().default(0),
      application: z.number().default(0),
      structure: z.number().default(0),
      authorityUse: z.number().default(0),
    })
    .default({}),
  attemptsCount: z.number().int().nonnegative().default(0),
});
export type Progress = z.infer<typeof ProgressSchema>;

export const ExamItemSchema = z.object({
  questionId: z.string().min(1),
  /** Words budgeted for this item, derived from total budget + typing model. */
  wordBudget: z.number().int().nonnegative(),
});
export type ExamItem = z.infer<typeof ExamItemSchema>;

export const ExamSessionSchema = z.object({
  id: z.string().min(1),
  /** Total exam duration in minutes. */
  durationMinutes: z.number().int().positive(),
  /** Words-per-minute the student can sustain (typing/handwriting model). */
  wordsPerMinute: z.number().int().positive().default(20),
  items: z.array(ExamItemSchema).default([]),
  startedAt: z.number().int().nonnegative().optional(),
  submittedAt: z.number().int().nonnegative().optional(),
});
export type ExamSession = z.infer<typeof ExamSessionSchema>;
