# Answer structures — the METHOD the generator follows

**Scope:** this file is *method*, not law. It tells the generator **how to shape an answer**. It contains **no citable authority** — every case/statute in a real answer must come from the student's uploaded corpus and pass `lib/verification`. Admin law is used only to *illustrate* the shapes. The engine is subject-agnostic; for non-law or other-subject use, the IRAC/essay shapes still apply, and any subject-specific issue taxonomy is taken from the uploaded corpus, not from here.

## 1. IRAC — hypothetical (problem) answers
Per issue/ground: **Issue** (one line) → **Rule (ratio)** (the legal test + the authority, *from the corpus*) → **Application** (apply to the facts; argue both ways; counter-argument; better view) → **Conclusion**. A full problem answer is ordered:
1. Jurisdiction / avenue (and any threshold/time points)
2. Remedies available
3. Standing
4. The grounds/issues (each in IRAC; argue for and against)
5. Breach / consequences (where the subject uses a two-stage analysis)
6. **Strongest-ground comparative assessment** (rank the grounds; which one is decisive and why) — placed before, or as part of, the conclusion
7. Conclusion

## 2. Essay answers
**Contention** stated up front → **case for** → **case against** (genuine, not strawman) → **reasoned preferred position**. Optional variant notes for differently-worded prompts. Every authority from the corpus; every proposition that needs support gets a pinpoint.

## 3. Two different review types the engine must distinguish (admin-law illustration)
The student's corpus determines which applies; the generator must keep them distinct because they ask different questions:
- **Judicial review (legality):** "Was the decision lawful?" Court; grounds of review; cannot substitute the decision (quash/remit). Structure = the IRAC problem order above, with a grounds checklist *taken from the corpus* (e.g. without authority, improper purpose, relevant/irrelevant considerations, procedural fairness, jurisdictional fact, unreasonableness, etc.).
- **Merits review (correctness):** "What is the correct or preferable decision?" Tribunal stands in the decision-maker's shoes; applies the *substantive statutory criteria*; can affirm/vary/substitute. Structure = two issues: **(a) can the applicant apply?** (jurisdiction + standing + time limit) and **(b) prospects?** (nature/function of the tribunal + apply the substantive criteria, arguing each limb both ways + remedies).
- A combined problem may invite **both** — triage by what the client wants (a different outcome → merits review; an unlawful decision set aside / no merits-review right → judicial review), note the interplay, and keep the two analyses visibly separate.

## 4. Citation & pinpoint rendering (verifier contract)
- Render each authority with its corpus location: e.g. `Li (Sem 21 s9)`, `s 19A(b)`, `Notes p4`, a case paragraph. Click-to-source back to the corpus chunk.
- The verifier rejects any authority not in the session allow-list, any out-of-jurisdiction case, and any citation it cannot bind to a corpus location.

## 5. Generation prompt guidance (for `lib/generation/prompts`)
- System prompt states the relevant shape above + the **hard-no rule**: "cite ONLY the authorities provided in the supplied corpus context; if you cannot support a point from the provided materials, say so — never introduce an outside case or statute."
- Provide the selected corpus passages + the confirmed allow-list as the only permitted sources.
- Keep tone exam-appropriate; no AI/meta mentions in output.
