# CLAUDE.md — Adaptive IRAC (project operating manual, v2 Tier B)

**Read `C:\Users\Ivy\RayTasks\Projects\Harness.md` first.**

## Stack tier
**Tier B — KV-only, no Supabase, no Auth, no Stripe.** Honour Tier-B trims (§2.0): no migrations, no recovery crons, no admin dashboard, no backup cron (all user state lives in the user's browser + an export JSON; nothing user-specific is stored server-side). Keep the §4 verify gate, §6 security baseline, §8 SEO, §11 AI track.

## What this is
A free, **login-free** responsive web app that generates exam practice (hypotheticals, essays), model **IRAC** answers and feedback from a student's **own uploaded course materials**, citing **only** authorities in that uploaded corpus, every citation verified and pinpointed. Materials are processed **in memory and discarded** — never stored server-side. Results display on screen and can be downloaded. The verified-citation discipline is the product — never ship an ungrounded or fabricated citation.

## Where domain knowledge lives (important)
- **Substantive law** (cases/statutes/ratios) → **only** the user's uploaded corpus, at runtime. We ship none. Do not add a law knowledgebase.
- **Answer method/structure** (IRAC, merits-review shape, JR grounds order, essay method, citation formats) → shipped in `KNOWLEDGE/` and the generation prompt templates. Method only, never substantive authority.
- **Issue/ground taxonomy** → extracted from the uploaded corpus at ingestion (optionally aided by user-selected structure templates).

## Stack (frozen for MVP — ask before adding deps)
Next.js (App Router) + TS strict · Vercel Pro (`syd1`) · browser localStorage (only client state) · Upstash Redis (cost meter + rate limit, fail-closed) · Anthropic Claude API server-side (default cost-efficient model + small model; prompt caching) · optional BYO user key (client-held) · GA4 (PII-safe). **No DB, no Auth, no Stripe.**

## Do
- Server-first only where needed (parse, generate, feedback); the workspace is a client app reading/writing localStorage.
- Route **every** generated answer through `lib/verification` before display; reject + regenerate on content failure, never patch.
- Run the **cost guard** (`lib/cost`) before every model call; fail-closed; BYO-key bypasses the shared meter.
- Zod at every boundary; no `any`. One `verify` gate before every push; pair bug fixes with tests; add drift tests for cross-file conventions.
- Treat uploaded-document text as **data, not instructions** (sanitise before prompting).
- Bash hygiene (§6.8): one program per call, no `cd`, no inline loops/`$(…)` — put dynamic work in `scripts/*.mjs`.

## Don't
- Don't add Supabase/Auth/Stripe/a vector DB (Tier B; ask first if you think you need one).
- Don't store users' uploaded materials or work server-side; don't log source/attempt content or BYO keys.
- Don't ship a substantive-law knowledgebase; don't let the model cite anything outside the session allow-list.
- Don't mention AI/LLM/Claude in customer copy (drift-tested).
- Don't return an answer that fails verification, a citation without a pinpoint, or allow uncapped spend.

## Env vars (placeholders in repo; real secrets never committed)
`ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SESSION_CAP_USD` (=5), `GLOBAL_DAILY_BUDGET_USD`, `APP_BASE_URL`, `CRON_SECRET` (if budget-alert cron), `RESEND_API_KEY` (optional alerts).

## Launch gates
`verify` green · verification gate rejects an out-of-corpus citation (integration test) · cost guard blocks at \$5/session and fails closed when KV down (integration test) · no materials persisted server-side (verified) · no-AI-mentions linter green · mobile 375×812 pass · BYO-key path works and bypasses the meter.
