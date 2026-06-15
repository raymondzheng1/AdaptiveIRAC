import { z } from "zod";
import type {
  Allowlist,
  Citation,
  Difficulty,
  Feedback,
  FeedbackRequest,
  GenerateAnswerRequest,
  GenerateQuestionRequest,
  InsufficientGrounding,
  ModelAnswer,
  Question,
} from "@/lib/schemas";
import { FeedbackSchema, QuestionSchema } from "@/lib/schemas";
import { checkBudget, recordUsage, type GuardDecision } from "@/lib/cost/guard";
import { DEFAULT_MODEL, SMALL_MODEL } from "@/lib/cost/pricing";
import { hasContentFailure, verifyAnswer } from "@/lib/verification";
import { normalizeToken } from "@/lib/authorities/citation-parser";
import { now } from "@/lib/util/clock";
import { uid } from "@/lib/util/id";
import { getModelClient, type CompleteResult } from "./client";
import {
  buildAnswerPrompt,
  buildFeedbackPrompt,
  buildQuestionPrompt,
  buildRepairPrompt,
} from "./prompts";

const MAX_TOKENS = { question: 1400, answer: 4000, feedback: 2000, repair: 4000 } as const;
const MAX_ANSWER_ATTEMPTS = 3;

/** Shared cost/identity context threaded through every model call. */
export interface CostContext {
  sessionId: string;
  ip: string;
  byoKey: boolean;
  apiKey?: string;
}

export class GuardBlockedError extends Error {
  constructor(public decision: GuardDecision) {
    super(`Cost guard blocked the request: ${decision.code}`);
    this.name = "GuardBlockedError";
  }
}

export interface RunSpend {
  spentUsd: number;
  capUsd: number;
}

/** Wrap a model call with the cost guard (before) and metering (after). */
async function guardedComplete(
  model: string,
  system: string,
  user: string,
  maxOutputTokens: number,
  cost: CostContext,
  spend: RunSpend,
): Promise<CompleteResult> {
  const decision = await checkBudget({
    sessionId: cost.sessionId,
    ip: cost.ip,
    model,
    estInputChars: system.length + user.length,
    maxOutputTokens,
    byoKey: cost.byoKey,
  });
  spend.spentUsd = decision.spentUsd;
  spend.capUsd = decision.capUsd;
  if (!decision.allowed) throw new GuardBlockedError(decision);

  const result = await getModelClient().complete({
    model,
    system,
    user,
    maxTokens: maxOutputTokens,
    apiKey: cost.apiKey,
  });

  const metered = await recordUsage(cost.sessionId, model, result.usage, cost.byoKey);
  spend.spentUsd = metered.spentUsd;
  spend.capUsd = metered.capUsd;
  return result;
}

/** Extract the first JSON object from a model response (tolerates code fences/prose). */
function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text) ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ---- Questions ----

const QuestionOutputSchema = z.object({
  prompt: z.string().min(1),
  topic: z.string().default(""),
  targetIssueIds: z.array(z.string()).default([]),
});

export async function generateQuestion(
  req: GenerateQuestionRequest,
  cost: CostContext,
): Promise<{ question: Question; spend: RunSpend }> {
  const spend: RunSpend = { spentUsd: 0, capUsd: 0 };
  const { system, user } = buildQuestionPrompt({
    subject: req.subject,
    allowlist: req.allowlist,
    issueTaxonomy: req.issueTaxonomy,
    context: req.context,
    type: req.type,
    topic: req.topic,
    difficulty: req.difficulty as Difficulty,
  });
  const result = await guardedComplete(DEFAULT_MODEL, system, user, MAX_TOKENS.question, cost, spend);
  const parsed = QuestionOutputSchema.safeParse(extractJson(result.text));
  if (!parsed.success) {
    throw new Error("Question generation returned malformed output.");
  }
  const question = QuestionSchema.parse({
    id: uid("q"),
    type: req.type,
    topic: parsed.data.topic || req.topic,
    difficulty: req.difficulty,
    prompt: parsed.data.prompt,
    targetIssueIds: parsed.data.targetIssueIds,
    createdAt: now(),
  });
  return { question, spend };
}

// ---- Answers (generate → verify → repair/regenerate) ----

const AnswerOutputSchema = z.object({
  body: z.string().min(1),
  citations: z
    .array(
      z.object({
        authorityId: z.string(),
        display: z.string(),
        pinpoint: z.string(),
      }),
    )
    .default([]),
  issueIds: z.array(z.string()).default([]),
});

function resolveCitations(
  declared: Array<{ authorityId: string; display: string; pinpoint: string }>,
  allowlist: Allowlist,
): Citation[] {
  return declared.map((c) => {
    const authority = allowlist.find((a) => a.id === c.authorityId);
    const loc = authority?.locations.find(
      (l) => normalizeToken(l.label) === normalizeToken(c.pinpoint),
    );
    return {
      authorityId: c.authorityId,
      display: c.display || authority?.canonical || c.authorityId,
      pinpoint: c.pinpoint || loc?.label || "",
      // Unbound (label not found) ⇒ a location that won't match ⇒ pinpoint-binding fails.
      location: loc ?? {
        sourceId: authority ? `${authority.id}:unbound` : "unbound",
        sourceFilename: authority?.locations[0]?.sourceFilename ?? "",
        label: c.pinpoint || "?",
      },
    };
  });
}

export async function generateAnswer(
  req: GenerateAnswerRequest,
  cost: CostContext,
): Promise<{ answer: ModelAnswer | null; insufficient: InsufficientGrounding | null; spend: RunSpend }> {
  const spend: RunSpend = { spentUsd: 0, capUsd: 0 };
  const { system, user } = buildAnswerPrompt({
    subject: req.subject,
    question: req.question,
    allowlist: req.allowlist,
    context: req.context,
  });

  for (let attempt = 1; attempt <= MAX_ANSWER_ATTEMPTS; attempt++) {
    const result = await guardedComplete(DEFAULT_MODEL, system, user, MAX_TOKENS.answer, cost, spend);
    let parsed = AnswerOutputSchema.safeParse(extractJson(result.text));

    // Malformed JSON ⇒ a structural problem; try one small-model repair.
    if (!parsed.success) {
      const repaired = await repair(result.text, ["Output was not valid JSON."], cost, spend);
      parsed = AnswerOutputSchema.safeParse(extractJson(repaired));
      if (!parsed.success) continue; // burn the attempt, regenerate
    }

    let citations = resolveCitations(parsed.data.citations, req.allowlist);
    let verification = verifyAnswer(
      { body: parsed.data.body, citations, issueIds: parsed.data.issueIds },
      req.allowlist,
      { type: req.question.type, questionPrompt: req.question.prompt, jurisdiction: req.subject.jurisdiction },
    );

    if (verification.ok) {
      return { answer: buildAnswer(req.question, parsed.data.body, citations, parsed.data.issueIds, verification), insufficient: null, spend };
    }

    // Only structural failures ⇒ envelope repair, then re-verify.
    if (!hasContentFailure(verification)) {
      const failureMsgs = verification.failures.map((f) => f.message);
      const repaired = await repair(result.text, failureMsgs, cost, spend);
      const reparsed = AnswerOutputSchema.safeParse(extractJson(repaired));
      if (reparsed.success) {
        citations = resolveCitations(reparsed.data.citations, req.allowlist);
        verification = verifyAnswer(
          { body: reparsed.data.body, citations, issueIds: reparsed.data.issueIds },
          req.allowlist,
          { type: req.question.type, questionPrompt: req.question.prompt, jurisdiction: req.subject.jurisdiction },
        );
        if (verification.ok) {
          return { answer: buildAnswer(req.question, reparsed.data.body, citations, reparsed.data.issueIds, verification), insufficient: null, spend };
        }
      }
    }
    // Content failure (or unrepaired structural) ⇒ regenerate from clean context.
  }

  return {
    answer: null,
    insufficient: {
      insufficientGrounding: true,
      reason: "Could not produce an answer grounded solely in your materials after multiple attempts.",
      attempts: MAX_ANSWER_ATTEMPTS,
    },
    spend,
  };
}

function buildAnswer(
  question: Question,
  body: string,
  citations: Citation[],
  issueIds: string[],
  verification: ReturnType<typeof verifyAnswer>,
): ModelAnswer {
  return {
    id: uid("ans"),
    questionId: question.id,
    body,
    citations,
    issueIds,
    verification,
    createdAt: now(),
  };
}

async function repair(
  previous: string,
  failures: string[],
  cost: CostContext,
  spend: RunSpend,
): Promise<string> {
  const { system, user } = buildRepairPrompt({ previous, failures });
  const result = await guardedComplete(SMALL_MODEL, system, user, MAX_TOKENS.repair, cost, spend);
  return result.text;
}

// ---- Feedback ----

const FeedbackOutputSchema = z.object({
  issuesSpotted: z.array(z.string()).default([]),
  issuesMissed: z.array(z.string()).default([]),
  outOfCorpusCitations: z.array(z.string()).default([]),
  structureNotes: z.string().default(""),
  applicationDepthNotes: z.string().default(""),
  rubric: z.object({
    issueSpotting: z.number(),
    ruleStatement: z.number(),
    application: z.number(),
    structure: z.number(),
    authorityUse: z.number(),
  }),
  actions: z.array(z.string()).min(1),
});

export async function generateFeedback(
  req: FeedbackRequest,
  cost: CostContext,
): Promise<{ feedback: Feedback; spend: RunSpend }> {
  const spend: RunSpend = { spentUsd: 0, capUsd: 0 };
  const { system, user } = buildFeedbackPrompt({
    subject: req.subject,
    question: req.question,
    modelAnswerSummary: req.modelAnswerSummary,
    modelAnswerIssueIds: req.modelAnswerIssueIds,
    attemptText: req.attemptText,
    allowlist: req.allowlist,
  });
  const result = await guardedComplete(DEFAULT_MODEL, system, user, MAX_TOKENS.feedback, cost, spend);
  const parsed = FeedbackOutputSchema.safeParse(extractJson(result.text));
  if (!parsed.success) throw new Error("Feedback generation returned malformed output.");

  const clamp = (n: number) => Math.max(0, Math.min(10, n));
  const feedback = FeedbackSchema.parse({
    id: uid("fb"),
    attemptId: uid("att"),
    questionId: req.question.id,
    issuesSpotted: parsed.data.issuesSpotted,
    issuesMissed: parsed.data.issuesMissed,
    outOfCorpusCitations: parsed.data.outOfCorpusCitations,
    structureNotes: parsed.data.structureNotes,
    applicationDepthNotes: parsed.data.applicationDepthNotes,
    rubric: {
      issueSpotting: clamp(parsed.data.rubric.issueSpotting),
      ruleStatement: clamp(parsed.data.rubric.ruleStatement),
      application: clamp(parsed.data.rubric.application),
      structure: clamp(parsed.data.rubric.structure),
      authorityUse: clamp(parsed.data.rubric.authorityUse),
    },
    actions: parsed.data.actions.slice(0, 5),
    createdAt: now(),
  });
  return { feedback, spend };
}
