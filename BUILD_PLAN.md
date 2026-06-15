# Adaptive IRAC — Build Plan (v2, Tier B)

**M0 — Scaffold (Tier B).** Next.js+TS strict on Vercel Pro (`syd1`), `verify` gate + CI, design tokens, GA4, Upstash provisioned, localStorage storage adapters (Zod-typed, versioned), session cookie. Exit: empty app deploys; verify green.

**M1 — Ingestion + allow-list (in-memory, the foundation).** `/api/parse` (pdf/docx/pptx/txt → text + page/slide map, discarded after response); classify; extract authorities + issue taxonomy; user-confirmable Authority list; cache corpus + allow-list in localStorage. Exit: upload admin-law materials → correct, editable allow-list with pinpoints; nothing stored server-side.

**M2 — Cost guard + grounded answers + verification (the moat + the budget).** `lib/cost` (\$5/session meter, per-IP + global budget, fail-closed) wired before every model call; retrieval (whole-corpus-or-keyword); generation; the 4-gate verifier; pinpoint-bound click-to-source; reject+regenerate; "insufficient grounding" state; BYO-key path. Exit: integration tests prove (a) out-of-allow-list citation rejected, (b) spend blocked at \$5 and fails closed when KV down.

**M3 — Question generation + practice + feedback.** Hypo/essay generation (method from `KNOWLEDGE/`); attempt editor (word count/timer); feedback (issues, IRAC structure, authority use, rubric, actions); all in localStorage. Exit: full single-session practice loop.

**M4 — Exam simulation + single-device progress + export.** Timed sessions (word/time budgeting), batch feedback, localStorage progress + weakest-area nudge, download/print results, export/import JSON. Exit: timed mock exam end-to-end; results downloadable.

**M5 — Landing + launch hardening.** Landing (§14 consumer model) with a small cleared demo-corpus preview; usage meter UI + BYO-key affordance; rate limits + security headers; mobile pass; legal/IP + academic-integrity notices. Exit: launch gates met; runs at near-zero operator cost.

**Post-MVP "Pro" (re-introduces Tier A):** accounts, cross-device sync, saved progress/adaptivity, subscriptions, institutional B2B — bolt Supabase+Auth+Stripe onto the *same* engine.
