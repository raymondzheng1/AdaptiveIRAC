import type { AnswerLimb, SourceAuthority } from "@/components/answer/answer-types";

/**
 * Static demo content for the landing worked example (a small cleared sample
 * corpus we own). The real workspace is driven by the grounded engine.
 */
export const DEMO_AUTHORITIES: Record<string, SourceAuthority> = {
  donoghue: {
    id: "donoghue",
    short: "Donoghue",
    name: "Donoghue v Stevenson",
    type: "Case",
    where: "Notes · p 4",
    snippet:
      "You must take reasonable care to avoid acts or omissions which you can reasonably foresee would be likely to injure your neighbour — the foundational neighbour principle.",
  },
  shirt: {
    id: "shirt",
    short: "Shirt",
    name: "Wyong Shire Council v Shirt",
    type: "Case",
    where: "Slides · Sem 2, s9",
    snippet:
      "A risk is foreseeable when it is not far-fetched or fanciful. The court then weighs the probability and gravity of the harm against the burden of taking precautions — the calculus of negligence.",
  },
  s5b: {
    id: "s5b",
    short: "CLA s 5B",
    name: "Civil Liability Act 2002 (NSW) s 5B",
    type: "Statute",
    where: "Statute · s 5B",
    snippet:
      "A person is not negligent in failing to take precautions against a risk of harm unless the risk was foreseeable, not insignificant, and a reasonable person in the position would have taken those precautions.",
  },
};

export const DEMO_CHIP_ORDER = ["shirt", "donoghue", "s5b"] as const;

export const DEMO_QUESTION =
  "Marko dives from a council jetty into a lake and strikes a submerged sandbar; the depth was unmarked. Advise whether the Council owed him a duty of care, and whether it breached that duty.";

export const DEMO_ATTEMPT =
  "The Council owed Marko a duty because injury to swimmers was foreseeable. On breach, the cost of signage was low compared with the risk of serious harm…";

export const DEMO_LIMBS: AnswerLimb[] = [
  {
    label: "Issue",
    segments: [
      {
        kind: "text",
        text: "Whether the Council owed Marko a duty of care in respect of the unmarked depth, and if so, whether that duty was breached.",
      },
    ],
  },
  {
    label: "Rule",
    segments: [
      { kind: "text", text: "A duty arises where harm to a class of persons is reasonably foreseeable " },
      { kind: "cite", authorityId: "donoghue", label: "Donoghue" },
      {
        kind: "text",
        text: ". Breach is assessed on the calculus of negligence — the probability and gravity of harm against the burden of precautions ",
      },
      { kind: "cite", authorityId: "shirt", label: "Shirt" },
      {
        kind: "text",
        text: ". In NSW this is codified: the risk must be foreseeable, not insignificant, and one a reasonable person would have guarded against ",
      },
      { kind: "cite", authorityId: "s5b", label: "CLA s 5B" },
      { kind: "text", text: "." },
    ],
  },
  {
    label: "Application",
    segments: [
      {
        kind: "text",
        text: "Injury to a swimmer from a submerged sandbar is neither far-fetched nor fanciful, so the risk was foreseeable. Signage was inexpensive relative to the gravity of a head injury, which weighs toward a finding of breach.",
      },
    ],
  },
  {
    label: "Conclusion",
    segments: [
      {
        kind: "text",
        text: "The Council likely owed and breached a duty of care; final liability turns on causation and any contributory negligence.",
      },
    ],
  },
];
