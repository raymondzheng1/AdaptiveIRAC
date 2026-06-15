# BUILD_INDEX — Adaptive IRAC (start here) — v2 Tier B

Read order:
1. `C:\Users\Ivy\RayTasks\Projects\Harness.md` — global guardrails (**Tier B**).
2. `CLAUDE.md` — operating manual: Tier B, stack, do/don't, env, launch gates, **where domain knowledge lives**.
3. `PRODUCT_REQUIREMENTS.md` — what & why (login-free, free, in-memory; grounding engine §7; cost guard §6.8).
4. `TECHNICAL_SPEC.md` — how. **Read §0 first** (where domain knowledge comes from) then the generate→verify pipeline (§5) and cost guard (§6).
5. `BUILD_PLAN.md` — milestones M0–M5; build in order; verify green at each exit.
6. `KNOWLEDGE/answer-structures.md` (the method the generator follows) + `KNOWLEDGE/domain.md` (illustrative admin-law examples only — never a source of citable authority).

**Two invariants that must never regress:** (1) no generated output reaches a user without passing `lib/verification` (cite only the user's corpus, every citation pinpointed); (2) no model call happens without passing the `lib/cost` guard (\$5/session, fail-closed).
