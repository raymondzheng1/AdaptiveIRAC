import { describe, it, expect } from "vitest";
import { applyFeedbackToProgress, mostMissedIssues, weakestLimb } from "@/lib/feedback/progress";
import { buildExamSession, isExpired, perItemWordBudget, remainingMs, startExam } from "@/lib/exam";
import { ProgressSchema } from "@/lib/schemas";
import type { Feedback, Question } from "@/lib/schemas";

const question: Question = {
  id: "q1",
  type: "hypothetical",
  topic: "standing",
  difficulty: "standard",
  prompt: "…",
  targetIssueIds: [],
  createdAt: 0,
};

const feedback = (overrides: Partial<Feedback> = {}): Feedback => ({
  id: "f1",
  attemptId: "a1",
  questionId: "q1",
  issuesSpotted: ["jurisdiction"],
  issuesMissed: ["standing"],
  outOfCorpusCitations: [],
  structureNotes: "",
  applicationDepthNotes: "",
  rubric: { issueSpotting: 6, ruleStatement: 7, application: 4, structure: 8, authorityUse: 9 },
  actions: ["a", "b", "c"],
  createdAt: 0,
  ...overrides,
});

describe("progress reducer", () => {
  it("updates running averages and topic coverage", () => {
    const start = ProgressSchema.parse({});
    const next = applyFeedbackToProgress(start, feedback(), question);
    expect(next.attemptsCount).toBe(1);
    expect(next.topicsPractised).toContain("standing");
    expect(next.limbAverages.application).toBe(4);
  });

  it("identifies the weakest limb and most-missed issues", () => {
    let p = ProgressSchema.parse({});
    p = applyFeedbackToProgress(p, feedback(), question);
    p = applyFeedbackToProgress(p, feedback({ issuesMissed: ["standing", "remedies"] }), question);
    const weak = weakestLimb(p);
    expect(weak?.key).toBe("application");
    const missed = mostMissedIssues(p);
    expect(missed[0]?.issue).toBe("standing");
  });

  it("returns null weakest limb before any attempt", () => {
    expect(weakestLimb(ProgressSchema.parse({}))).toBeNull();
  });
});

describe("exam logic (pinned clock)", () => {
  it("budgets words per item using the WPM model", () => {
    expect(perItemWordBudget(60, 20, 2)).toBeGreaterThan(0);
  });

  it("counts down and expires deterministically", () => {
    const exam = startExam(buildExamSession([question], 30, 20), 1_000_000);
    expect(remainingMs(exam, 1_000_000)).toBe(30 * 60_000);
    expect(isExpired(exam, 1_000_000)).toBe(false);
    expect(isExpired(exam, 1_000_000 + 30 * 60_000)).toBe(true);
    expect(remainingMs(exam, 1_000_000 + 30 * 60_000)).toBe(0);
  });
});
