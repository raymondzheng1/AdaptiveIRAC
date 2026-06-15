# KNOWLEDGE — domain facts (seed)

Seeded from the originating administrative-law project. These are *examples of the structures the engine must produce and verify*; the engine is subject-agnostic — the real authorities always come from the user's uploaded corpus, never from this file.

## IRAC structure (hypotheticals)
Each ground/issue: **Issue** (one line) → **Rule (ratio)** (the legal test + authority) → **Application** (apply to facts; argue both ways; counter-argument; better view) → **Conclusion**. A complete hypo answer also has: jurisdiction/avenue, remedies, standing, the grounds, breach/consequences (two-stage), strongest-ground comparative assessment, conclusion. (Merits-review answers use a different shape — "can they apply?" + "prospects?" with nature/function + apply the substantive statutory criteria — see the combined MR/JR framework.)

## Essay structure
Contention up front → case for → case against (genuine, not strawman) → reasoned preferred position. Optional variant notes for differently-worded years.

## Citation & pinpoint formats the parser must handle
- Case: `Party v Party (YEAR) VOL REPORT PAGE` (e.g. `(2013) 249 CLR 332`) or `[YEAR] COURT NUMBER` (e.g. `[2024] HCA 12`); short-forms (`Li`, `Kirk`, `S157`, `M70`).
- Statute/section: `s 19A(b)`, `s 38(1)`, `ss 18–19`.
- Course pinpoint labels: `Sem 21 s9` (seminar/slide), `Notes p4`. These bind a cited authority to where it lives in the corpus.

## Verification examples (what pass/fail looks like)
- PASS: answer cites `Li` and `Li` is in the subject allow-list with location `Sem 21 s9` → render "Li (Sem 21 s9)" click-to-source.
- FAIL (content): answer cites `Wednesbury` but it is NOT in this subject's allow-list → reject + regenerate from clean context.
- FAIL (pinpoint): answer cites an allow-listed case but the verifier can't bind it to a corpus location → reject.
- FAIL (jurisdiction): answer cites a UK/US case not in the corpus → reject.

## Why this matters (the product thesis)
Students are penalised for citing outside their course; generic AI hallucinates and cites out-of-jurisdiction authorities. The engine's value is that it *cannot* do either — it cites only the user's confirmed corpus, every citation pinpointed, or it declines.
