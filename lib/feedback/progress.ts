import type { Feedback, Progress, Question } from "@/lib/schemas";

/**
 * Single-device progress (pure reducer). Updates running rubric-limb averages,
 * topic coverage, and most-missed issue counts. Never synced server-side.
 */
export function applyFeedbackToProgress(
  progress: Progress,
  feedback: Feedback,
  question: Question,
): Progress {
  const n = progress.attemptsCount;
  const next = n + 1;
  const avg = (prev: number, value: number) => (prev * n + value) / next;

  const issueMissCounts = { ...progress.issueMissCounts };
  for (const issue of feedback.issuesMissed) {
    issueMissCounts[issue] = (issueMissCounts[issue] ?? 0) + 1;
  }

  const topicsPractised = question.topic && !progress.topicsPractised.includes(question.topic)
    ? [...progress.topicsPractised, question.topic]
    : progress.topicsPractised;

  return {
    topicsPractised,
    issueMissCounts,
    attemptsCount: next,
    limbAverages: {
      issueSpotting: avg(progress.limbAverages.issueSpotting, feedback.rubric.issueSpotting),
      ruleStatement: avg(progress.limbAverages.ruleStatement, feedback.rubric.ruleStatement),
      application: avg(progress.limbAverages.application, feedback.rubric.application),
      structure: avg(progress.limbAverages.structure, feedback.rubric.structure),
      authorityUse: avg(progress.limbAverages.authorityUse, feedback.rubric.authorityUse),
    },
  };
}

const LIMB_LABELS: Record<keyof Progress["limbAverages"], string> = {
  issueSpotting: "Issue spotting",
  ruleStatement: "Rule statement",
  application: "Application",
  structure: "Structure",
  authorityUse: "Authority use",
};

/** The weakest IRAC limb to nudge the student toward (null until any attempt). */
export function weakestLimb(progress: Progress): { key: string; label: string; score: number } | null {
  if (progress.attemptsCount === 0) return null;
  const entries = Object.entries(progress.limbAverages) as Array<
    [keyof Progress["limbAverages"], number]
  >;
  let weakest = entries[0];
  if (!weakest) return null;
  for (const e of entries) if (e[1] < weakest[1]) weakest = e;
  return { key: weakest[0], label: LIMB_LABELS[weakest[0]], score: weakest[1] };
}

/** Issues missed most often on this device, most-missed first. */
export function mostMissedIssues(progress: Progress, limit = 5): Array<{ issue: string; count: number }> {
  return Object.entries(progress.issueMissCounts)
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
