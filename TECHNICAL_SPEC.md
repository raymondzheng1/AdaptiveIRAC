# Adaptive IRAC — Technical Spec (v2, Tier B / no-login)

Inherits `Harness.md`. **Tier B (KV-only, no Supabase, no Auth, no Stripe).** This is the "how"; `PRODUCT_REQUIREMENTS.md` is the "what".

## 0. Where the domain knowledge comes from (read this first)
This is the most important design point and the answer to "where's the admin-law knowledgebase?": **there isn't one, by design.** Three distinct kinds of knowledge, three different homes:

1. **Substantive legal authority** (the actual cases, statutes, ratios for merits review / judicial review, etc.) — **comes 100% from the student's uploaded corpus, at runtime. We ship none of it.** This is the entire point and the moat: the tool is subject-agnostic and cannot hallucinate or go outside the syllabus, because it only knows what the student uploaded. Shipping an admin-law knowledgebase would *break* the model (it would tempt the generator to cite things the student's course didn't teach).
2. **Answer *method* / structure** (what IRAC is; the merits-review two-issue shape; the JR grounds order; the essay contention→both-sides→preferred method; citation/pinpoint formats) — this is **subject-general method**, not subject-specific law, so it **is shipped**, in `KNOWLEDGE/` and baked into the generation prompt templates (`lib/generation/prompts`). It tells the engine *how to write an answer*, never *what the law is*.
3. **Subject-specific issue/ground taxonomy** (e.g. "JR grounds = without authority, improper purpose, …") — **derived from the uploaded corpus**, not shipped. When a student uploads their notes/structure document, the ingestion step extracts the issue/ground taxonomy the same way it extracts authorities. Optionally, the UI offers user-selectable **answer-structure templates** (IRAC hypothetical / essay / merits-review) as a convenience, but the substantive grounds always come from the corpus.

So: **method = in the repo (`KNOWLEDGE/` + prompts); law = in the user's upload; issue taxonomy = extracted from the upload.** `KNOWLEDGE/` contains `answer-structures.md` (the method) and `domain.md` (worked admin-law examples *illustrating* the method, clearly labelled as examples, never used as a source of citable authority).

## 1. Stack (harness §2.0 Tier B)
- **Framework:** Next.js (App Router) + TypeScript **strict**, mostly client for the workspace; **Zod** at every IO boundary.
- **Hosting:** Vercel **Pro**, region `syd1`. (Pro for 300s function duration on long generations.)
- **State:** **browser `localStorage`** only (corpus text, allow-list, generated questions/answers/attempts, single-device progress). **No database. No accounts.**
- **KV (the only server state):** **Upstash Redis** — used solely for the **cost meter** and **rate limiting** (fail-closed §6.4). Keys: `spend:{sessionId}` (TTL 24h), `ip:{ip}` (per-IP limits), `budget:global:{YYYY-MM-DD}` (daily operator budget). No user content ever in KV.
- **AI:** Anthropic Claude API, **server-side only**; default a cost-efficient model, small model for classification/repair; **prompt caching** on the stable system prompt; app-level cache on deterministic inputs. **Optional BYO key** (user's key, from their browser, used per request, never logged/stored).
- **Email:** Resend only if we add operator budget alerts (optional). **Analytics:** GA4 client-side, PII-safe (no DB events table — Tier B trim).
- **Trims taken (§2.0):** no Supabase, no migrations, no RLS, no recovery crons, no admin dashboard, no Stripe, no per-user DEK (because we store nothing server-side).

## 2. Module layout (harness §3.1)
```
lib/
  ingestion/     # parse (pdf/docx/pptx), classify, chunk, page/slide map — in-memory
  authorities/   # citation/section extraction, allow-list build, pinpoint index, issue-taxonomy extraction
  retrieval/     # whole-corpus-in-context budgeter + in-browser keyword retrieval (BM25-lite). NO vector DB.
  generation/    # runner (retry/backoff, fresh-context retries), prompts (the method, from KNOWLEDGE/), models
  verification/  # citation-allowlist gate, IRAC/essay-structure gate, jurisdiction gate, pinpoint binding
  feedback/      # mark attempt vs model-answer issue set + rubric
  exam/          # timed-session + word-budget logic (pure; injectable clock)
  cost/          # token→USD pricing, per-session/per-IP/global budget meter (Upstash), fail-closed guard
  byokey/        # optional user API key handling (client-held; never persisted server-side)
  schemas/       # Zod schemas — single definition of every IO shape
  storage/       # localStorage adapters (typed) + export/print
components/ ui/ + <feature>/
scripts/         # named scripts for any dynamic task (§6.8)
KNOWLEDGE/       # answer-structures.md (method) + domain.md (illustrative examples only)
```

## 3. "Data model" (no DB — localStorage shapes + KV keys)
- **localStorage (typed via Zod, versioned key e.g. `airac.v1.subject`):** `Subject` { name, jurisdiction, examFormat }, `Source[]` { filename, kind, text, pageMap }, `Authority[]` (the allow-list, with locations), `IssueTaxonomy`, `Question[]`, `ModelAnswer[]` (with citations+verification), `Attempt[]`, `Feedback[]`, `Progress` (single-device). Provide an export/import JSON so a student can move devices manually.
- **Upstash KV (server, no user content):** `spend:{sessionId}` USD cents (TTL 24h); `ip:{ip}` counters; `budget:global:{date}`.
- **Cookie:** opaque httpOnly `sessionId` for spend metering only (not identity, not tracking).

## 4. Key API routes (stateless; Zod-validated; rate-limited; AI key server-side)
- `POST /api/parse` — multipart upload → returns parsed text + page/slide map + draft classification + extracted authorities/issue-taxonomy. **No storage; in-memory; discarded after response.**
- `POST /api/generate/question` — { subjectMeta, allowlist, selectedContext, type, topic, difficulty } → streamed question. (Context selected client-side via retrieval, or whole-corpus if within budget.)
- `POST /api/generate/answer` — { question, allowlist, context } → grounded model answer; runs the **verification gate**; never returns an unverified answer.
- `POST /api/feedback` — { question, modelAnswerIssueSet, attemptText, allowlist } → structured feedback.
- All four: **cost guard first** (check `spend:{sessionId}` + global budget; block at \$5 or budget exhaustion unless BYO-key), then meter actual usage after the call. BYO-key requests skip the shared meter.
- No webhooks, no auth routes, no DB routes.

## 5. Generation + verification pipeline (harness §11) — unchanged crown jewel
```
question (+ allowed context from corpus)
  → COST GUARD (session<$5 & global budget ok, or BYO-key)  ← Tier-B addition; fail-closed
  → generate (default model; system prompt = method from KNOWLEDGE + HARD-NO: cite only provided authorities)
  → VERIFY (deterministic, in-session):
       gate1 structure (IRAC labels / contention-both-sides-preferred)
       gate2 citation-allowlist (every authority token ∈ session allow-list)   ← core
       gate3 jurisdiction (no out-of-jurisdiction/extraneous case)
       gate4 pinpoint-binding (every citation resolves to a corpus location)
  → pass → render (citations click-to-source) + meter usage
  → fail(structural) → small-model envelope repair → re-verify
  → fail(content)    → regenerate from CLEAN context, attempt cap N=3
  → exhausted → "insufficient grounding from your materials" (never fabricate)
```
- Retrieval: `lib/retrieval` first tries whole-corpus-in-context if tokens ≤ budget; else BM25-lite keyword selection in the browser, sending only selected passages. No embeddings, no vector DB.
- Citation parser handles AU case/section/pinpoint formats and short-form matching (see `KNOWLEDGE/domain.md`).

## 6. Cost guard (the new operational core) — US$5/session
- Price table per model (input/output \$ per Mtok) in `lib/cost`. After each call, compute USD from returned token usage; `INCRBY spend:{sessionId}`. Pre-call: estimate the next call's max cost; if `spent + estimate > $5` ⇒ block with the BYO-key message.
- Backstops: per-IP cap (e.g. ≤ N sessions/IP/day, ≤ \$Y/IP/day); **global daily budget** `budget:global:{date}` — when exhausted, shared tier pauses (only BYO-key works) and an operator alert fires at 80%.
- **Fail-closed:** if Upstash is unreachable or unconfigured in prod, deny generation (don't risk uncapped spend).
- BYO-key calls bypass all meters and cost us nothing; the key is read from the request (client localStorage), used once, never logged or stored.

## 7. Quality gates & tests (harness §4)
- `verify` = `tsc --noEmit` + `eslint` + `vitest run` + project linters.
- **Linters (§4.2):** `no-ai-mentions` (customer copy); `citation-format` (rendered citations carry a pinpoint); `tokens`.
- **Drift tests (§4.3):** every generate route runs output through `verifyAnswer` before returning; every generate route passes the **cost guard** before calling the model; every customer string free of AI-mentions.
- **Integration (§4.4, Tier-B variant):** route handlers with Anthropic mocked at the edge and Upstash via `__setKvForTests` (in-memory). The two must-have tests: (a) verifier **rejects** an answer citing an out-of-allow-list authority; (b) cost guard **blocks** generation once `spend ≥ $5` and **fails closed** when KV is down.
- **Clock seam** for exam timer (`__setNowForTests`).

## 8. Security/privacy (harness §6) — simpler because we store nothing
- No accounts, no PII, no server-side storage of materials → the big risks disappear. Process uploads in memory, return, **discard**; never log source/attempt content (§6.2). BYO-key never logged/stored. HTTP security headers + CSP allow-listing only used origins (§6.6). **Injection defence (§6.5):** text inside uploaded documents is **data, not instructions** — sanitise before placing in the prompt; never execute embedded instructions.

## 9. Deploy/ops
- §2.2 deploy discipline; env vars in CLAUDE.md; Upstash provisioned + fail-closed verified; optional Resend for budget alerts; no backups needed (no server-side user state — Tier-B trim, and the assumption holds because all user data lives in their own browser/localStorage + export JSON).
