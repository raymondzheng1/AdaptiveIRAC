# Adaptive IRAC — Product Requirements (PRD)

**Working title:** Adaptive IRAC (brand TBD). **Status:** v2 spec (Tier B / no-login). **Owner:** Raymond. **Date:** 8 June 2026.
**Harness:** Inherits `C:\Users\Ivy\RayTasks\Projects\Harness.md`. **Stack tier: B (KV-only, no Supabase, no Auth, no Stripe).** Honour the Tier-B trims (§2.0): skip migrations, recovery crons, admin dashboard, per-user DB. Where this PRD and the harness conflict, harness operating principles (§1) win.

> **v2 change:** simplified from the original Tier A design. No accounts, no database, free to the user, results display on screen. The student's materials are processed **in memory and discarded** — nothing about them is stored on our servers. The generation + **verification** engine is unchanged; everything else is trimmed.

---

## 1. One-line product
A free, login-free web app that turns a law student's **own course materials** into instant exam practice: it generates realistic hypotheticals and essays, produces model **IRAC** answers and feedback, and **cites only from the materials the student uploaded**, every citation verified and pinpointed — so nothing is hallucinated and nothing falls outside the syllabus. Results display on screen; the student can download/print them.

## 2. Problem & why now
- Law exams are issue-spotting + IRAC application under time pressure; realistic practice is scarce because making questions and model answers needs an expert.
- Generic AI is distrusted and dangerous for law — it hallucinates citations and cites out-of-jurisdiction/out-of-syllabus cases (an Australian solicitor has been sanctioned; courts have AI practice notes). Students are penalised for citing outside their course.
- **The wedge:** an engine whose answers are **grounded in, and provably restricted to, the student's uploaded corpus**, every citation pinpointed — or it declines. Login-free and free-to-use removes every barrier to trying it.

## 3. Goals & non-goals
**Goals (MVP)**
- No sign-up. Student uploads materials for one subject → gets generated questions, grounded model IRAC answers, and feedback on their own attempts — all in one session.
- **Citation integrity:** every authority in any output is in the student's uploaded corpus, verified, pinpointed; ungroundable output is rejected, never fabricated.
- **Free to the user**, with a hard **US$5 model-spend cap per session** (operator-funded), plus an optional **bring-your-own-API-key** path for unlimited use at no cost to us.
- Responsive web; Australia-first; results on screen + downloadable/printable.

**Non-goals (MVP)**
- No accounts, no database, no payments, no server-side storage of user materials or work.
- No cross-device sync; no long-term progress history beyond the current device's browser.
- Not legal advice; not a web-research tool; we do not host/redistribute course materials.

## 4. Users & JTBD
- **Primary:** law/PLT students, exam-prepping, cost-sensitive, want zero-friction practice they can trust to stay inside their syllabus.
- **JTBD:** "Generate realistic practice and a model IRAC answer from *my* materials, citing only what my course allows, right now, without signing up or paying."

## 5. Domain concepts (session-scoped; nothing persisted server-side)
- **Subject (session):** the course being practised; holds the uploaded corpus + the citation **allow-list**, for this session only.
- **Source:** an uploaded file (case / statute / slides / notes), parsed to text with page/slide locations, held in memory / browser.
- **Authority (allow-list):** citable items extracted from sources (case, statute section, course concept) with the exact corpus location(s) they appear — the allow-list the verifier enforces.
- **Question / Model answer / Attempt / Feedback / Exam session:** as before, but all session/browser-scoped.

## 6. Functional requirements (MVP)
### 6.1 Start (no login)
- Land → "Start practising" immediately. A subject is created in the browser; an opaque **session id** (httpOnly cookie) is issued server-side for spend metering only.
- Optional: paste your own API key (stored only in your browser) to bypass the shared cap.

### 6.2 Corpus ingestion (in-memory)
- Upload Sources (PDF/DOCX/PPTX/TXT/MD), multi-file. Parsed **server-side in memory** (or in-browser where feasible), text + page/slide map returned to the browser; **originals are not stored** on our servers.
- Classify each source (case/statute/slides/notes); user can correct.
- Extract authorities → build the per-subject **allow-list** with locations/pinpoints; show it for the student to review/confirm. The corpus + allow-list are cached in **localStorage** so the student needn't re-upload on that device.

### 6.3 Question generation
- Generate hypotheticals (facts raising multiple taught issues) and essays (contention propositions); controls for topic/difficulty/length; regenerate; kept in localStorage.

### 6.4 Model answers (grounded + verified) — unchanged core
- IRAC for hypos (Issue/Rule/Application/Conclusion + counter-arguments + reasoned conclusion); contention→both sides→preferred for essays.
- **Every authority must be on the session allow-list, pinpointed**, click-to-source. Ungroundable authority ⇒ reject + regenerate from clean context; after the attempt cap, show "couldn't ground this from your materials" — never fabricate.

### 6.5 Practice & feedback
- Distraction-light attempt editor (live word count, optional timer). Feedback: issues spotted/missed vs the model answer, IRAC structure, **authority use** (flag any out-of-corpus citation), application depth, rubric score, 3 actions. References only the allow-list.

### 6.6 Exam simulation + light progress
- Timed sessions (word/time budgeting, our typing-speed model). **Progress is single-device** (localStorage): topics practised this device, weakest IRAC limb, most-missed issues; an in-session "practise your weak area" nudge. No cross-device history.

### 6.7 Keep your results
- Download/print model answers and feedback (PDF/MD). Nothing is stored for them server-side.

### 6.8 Cost guard (the new core operational requirement)
- **Hard US$5 model-spend cap per session.** The server meters actual token cost per session (Upstash) and blocks further generation once the cap is reached, with a clear message and the BYO-key option.
- **Backstops:** per-IP session/spend limits; a **global daily operator budget** kill-switch (when exhausted, the shared free tier pauses and only BYO-key works); fail-closed if the meter is unavailable.
- **BYO-key calls don't count** against the $5 cap or the global budget and cost us nothing.

## 7. Grounding engine (the moat) — unchanged behaviour, DB-free
1. **Allow-list per session, user-confirmed;** no generation against an empty/unconfirmed allow-list.
2. **Retrieval without a vector DB.** For a single subject the corpus is small; use **whole-corpus-in-context** when it fits a token budget, else **in-browser keyword retrieval** that selects the relevant passages to send to the server. No embeddings service, no vector store.
3. **Post-processing verification (non-negotiable, harness §11/§11.2).** Deterministic verifier checks every authority token against the session allow-list (citation-whitelist gate) + IRAC/essay structure gate + out-of-jurisdiction gate + pinpoint-binding gate.
4. **Fail handling.** Structural failure → small-model envelope repair; content failure (wrong/extra authority) → reject + regenerate from clean context (never patch); attempt cap → graceful "insufficient grounding" state.
5. **No AI-mentions in user copy** (drift-tested). Keys server-side; prompt caching; cache deterministic inputs.

## 8. Non-functional
- **Privacy/IP (improved):** materials processed in memory and **discarded**; never stored server-side; never logged; never used to train shared models. This is a headline trust feature.
- **Cost (§6.8):** the $5/session cap + global daily budget keep operator spend bounded; cheap/small models by default; output-token caps; aggressive caching.
- **Fail-closed (harness §6.4):** rate limiter and spend-meter block when unconfigured/unavailable in prod.
- **Performance:** streamed generation; first token < 3s; ingestion shows progress.
- **Accessibility:** WCAG AA; keyboard-first editor.
- **Data residency:** Vercel `syd1`.

## 9. UX / screens (responsive; harness §14.0 consumer/educational model)
- **Landing:** hero (one-sentence value + "Start free, no sign-up") → what's inside (3–4 cards) → live preview (a sample question + grounded model answer from a small cleared demo corpus we own) → 3-step how-it-works → closing CTA → footer. No fabricated testimonials.
- **App (single flow, no account):** Upload/Corpus → Authorities (confirm allow-list) → Practice (generate → write → model answer → feedback) → Exam (timed) → "Download my results". A persistent, friendly **usage meter** ("free session: $1.20 / $5 used") and the BYO-key affordance.
- Design system: small primitives, centralised tokens; verify on 375×812 (§14.5).

## 10. Analytics & metrics (no DB → client GA4 only, PII-safe)
- GA4 events (no PII, no materials content): start → upload → allow-list confirmed → question generated → model answer shown → attempt → feedback → download → cap-hit / BYO-key-added.
- **North-star:** weekly sessions reaching "first grounded model answer". **Trust metric:** verified-citation pass rate (>99%). **Cost metric:** avg \$/session and % sessions hitting the cap. **Funnel:** start → first model answer.

## 11. Legal / IP / academic integrity
- **Not legal advice** (disclaimer). **Privacy/IP:** in-memory, discarded, never stored/shared/trained-on; the student uploads for private study; ToS puts upload-rights responsibility on the user (still worth a brief legal sanity check). **Academic integrity:** a practice/study tool; integrity notice; don't write answers to live assessments. **AI honesty:** verified citations only; honest "couldn't ground this" states.

## 12. Out of scope (MVP) → future "Pro" (re-introduces Tier A)
- Accounts, cross-device sync, saved long-term progress/adaptivity, subscriptions, institutional B2B — all deferred to a later **Pro** tier that bolts Supabase + Auth + Stripe onto the *same* engine with no rework. This MVP is **Phase 0 of the same product**, built to validate demand at near-zero operating cost.

## 13. Open questions
- Brand/domain. · Default model + output caps to make \$5 stretch sensibly (how many full answers ≈ \$5?). · BYO-key: which providers (Anthropic only v1?). · Demo corpus for the landing preview (small, cleared, owned by us). · Max corpus size we accept before forcing keyword-retrieval mode. · Session length / cookie TTL and per-IP limits.
