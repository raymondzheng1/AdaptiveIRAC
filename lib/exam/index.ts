import type { ExamSession, Question } from "@/lib/schemas";
import { uid } from "@/lib/util/id";

/**
 * Timed-exam logic. Pure functions over (config + now) so the timer is unit-
 * testable with a pinned clock — callers pass `now` in, never read it here.
 */

/** Reserve ~15% of time for reading/planning, then split writing time by the WPM model. */
export function totalWordBudget(durationMinutes: number, wordsPerMinute: number): number {
  const writingMinutes = Math.max(0, durationMinutes * 0.85);
  return Math.floor(writingMinutes * wordsPerMinute);
}

/** Even split of the total word budget across items (min 50 words each). */
export function perItemWordBudget(
  durationMinutes: number,
  wordsPerMinute: number,
  itemCount: number,
): number {
  if (itemCount <= 0) return 0;
  return Math.max(50, Math.floor(totalWordBudget(durationMinutes, wordsPerMinute) / itemCount));
}

export function buildExamSession(
  questions: Question[],
  durationMinutes: number,
  wordsPerMinute = 20,
): ExamSession {
  const budget = perItemWordBudget(durationMinutes, wordsPerMinute, questions.length);
  return {
    id: uid("exam"),
    durationMinutes,
    wordsPerMinute,
    items: questions.map((q) => ({ questionId: q.id, wordBudget: budget })),
  };
}

export function startExam(exam: ExamSession, nowMs: number): ExamSession {
  return { ...exam, startedAt: nowMs };
}

export function elapsedMs(exam: ExamSession, nowMs: number): number {
  if (exam.startedAt === undefined) return 0;
  return Math.max(0, nowMs - exam.startedAt);
}

export function remainingMs(exam: ExamSession, nowMs: number): number {
  const total = exam.durationMinutes * 60_000;
  return Math.max(0, total - elapsedMs(exam, nowMs));
}

export function isExpired(exam: ExamSession, nowMs: number): boolean {
  if (exam.startedAt === undefined) return false;
  return elapsedMs(exam, nowMs) >= exam.durationMinutes * 60_000;
}
