# Adaptive IRAC

A free, **login-free** web app that turns a law student's **own course materials** into instant exam practice: realistic hypotheticals and essays, model **IRAC** answers and feedback that cite **only** the authorities in the uploaded corpus — every citation verified and pinpointed, or the answer is declined. Materials are processed **in memory and discarded**; nothing about them is stored server-side.

**Stack tier: B** — KV-only. No database, no auth, no payments. Browser `localStorage` holds all user state; Upstash Redis holds only the spend meter + rate limits (fail-closed).

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in ANTHROPIC_API_KEY (+ Upstash for prod parity)
npm run dev                  # http://localhost:3000
```

For local dev without Upstash, `.env.local` sets `ALLOW_INSECURE_DEV_KV=true` (an in-memory KV). In production the cost guard **fails closed** if Upstash is unconfigured.

## The two invariants (never regress)

1. **No generated output reaches a user without passing `lib/verification`** — every authority is checked against the session allow-list and bound to a corpus pinpoint, or the answer is rejected and regenerated; after the cap, an honest "couldn't ground this" state. Never fabricates.
2. **No model call happens without passing `lib/cost`** — a US$5/session cap + global daily budget, metered in Upstash, fail-closed when KV is down. BYO-key requests bypass the shared meter.

Both are pinned by drift tests in `tests/drift/invariants.test.ts`.

## Where domain knowledge lives

- **Substantive law** → only the user's uploaded corpus, at runtime. We ship none.
- **Answer method** (IRAC, essay shape, citation format) → `KNOWLEDGE/` + `lib/generation/prompts.ts`.
- **Issue taxonomy** → extracted from the upload at ingestion.

## Architecture

```
lib/
  ingestion/     parse pdf/docx/pptx/txt in memory + classify + sanitize (data, not instructions)
  authorities/   deterministic citation parser + allow-list / issue-taxonomy extraction
  retrieval/     whole-corpus budgeter + BM25-lite keyword selection (no vector DB)
  generation/    model client (test seam + BYO-key) · prompts (the method) · generate→verify runner
  verification/  4 gates: structure · citation-allowlist · jurisdiction · pinpoint-binding
  cost/          pricing table + fail-closed session/global/IP guard (Upstash)
  kv/            Upstash adapter + in-memory test/dev fallback (__setKvForTests)
  feedback/      progress reducer (weakest limb, most-missed issues)
  exam/          timed-session + word-budget logic (pure, injectable clock)
  storage/       localStorage adapters + export/import JSON (the only "backup")
  schemas/       Zod — single source of truth for every IO shape
app/
  page.tsx       landing (SEO, demo preview, legal notices)
  practice/      the single-flow workspace (upload → authorities → practice → feedback → export)
  api/           parse · generate/question · generate/answer · feedback · usage
scripts/         no-ai-mentions · citation-format · tokens linters
```

## Verify gate

```bash
npm run verify   # no-ai-mentions → citation-format → tokens → eslint+tsc → vitest
npm run build    # deploy-equivalent check
```

## Deploy (Vercel, region syd1)

1. Push to GitHub, import to Vercel (Pro recommended for 300s functions).
2. Provision **Upstash Redis** (Vercel Marketplace) → sets `UPSTASH_REDIS_REST_URL` / `_TOKEN`.
3. Set env vars (see `.env.example`): `ANTHROPIC_API_KEY`, `SESSION_CAP_USD=5`, `GLOBAL_DAILY_BUDGET_USD`, `APP_BASE_URL`, optional `NEXT_PUBLIC_GA4_ID`.
4. Do **not** set `ALLOW_INSECURE_DEV_KV` in production (the guard must fail closed).

## Models

Default generation: **Claude Sonnet 4.6** ($3/$15 per Mtok). Small model (classification / structural repair): **Claude Haiku 4.5** ($1/$5). Pricing + model ids live in `lib/cost/pricing.ts`.
