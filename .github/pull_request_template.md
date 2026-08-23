<!--
GymOS PR contract. One logical unit per PR.
Link a spec (docs/specs/) or ADR (docs/adr/). Include a test that would have failed before this change.

CODEOWNERS — these paths need explicit human review (agents propose; they do not bypass):
- packages/core/
- packages/ai/
- infra/
-->

## Summary

<!-- 1–2 sentences: problem + outcome. Imperative, no fluff. -->

## Track

<!-- Check one primary track. Name the roadmap slice or alignment checklist item if relevant. -->

- [ ] Roadmap (Phase __ — slice __)
- [ ] Alignment (P__ — checklist item __)
- [ ] AI-native / agent eval (task: `docs/evals/agent-tasks/…`)
- [ ] Bugfix / hotfix
- [ ] Infra / deploy
- [ ] Docs-only (no executable change)

## Spec / ADR

<!-- Required unless docs-only with no behavior claim. Specs describe current behavior; update the spec in the same PR as the code. -->

- Link: `docs/specs/…` or `docs/adr/…`
- Invariant touched (one line):

## Problem

<!-- What was wrong or missing? -->

## Solution

<!-- Major behavior or architecture changes only — not a file tour. -->

## Risk

- [ ] Low — localized, no contract / auth / AI boundary change
- [ ] Medium — API or UI behavior, migrations, or module-boundary touch
- [ ] High — auth / tenancy, nutrition safety, Layer-3, infra, or breaking contract

---

## Nutrition & AI safety

<!-- Complete if touching packages/core, packages/ai, packages/modules nutrition, or meal-plan flows. Otherwise check N/A. -->

- [ ] N/A — this PR does not touch nutrition, Layer-3, or meal-plan flows
- [ ] Kcal / macros / targets remain Layers 1–2 only; Layer-3 does not emit numbers
- [ ] Generation still produces `DRAFT`; no auto-publish on generate or adjust
- [ ] Layer-3 payloads pass `assertDeidentified` (food names + grams only; no PII to the model)
- [ ] Allergen / restriction checks unchanged or strengthened (Layer-2 filter + post-check; neither delegated to the model)
- [ ] LLM failure path still fail-closed to `fallbackNarrative` (generation must not fail solely because the LLM failed)
- [ ] If prompt / adapter / guardrails changed: offline eval green (`pnpm --filter @gymos/ai test`)
- [ ] If promoting prompt / adapter: canary / rollback plan documented (`docs/ai/prompt-canary.md`)
- [ ] If incident-driven fix: golden fixture added under `packages/ai/src/evals/`

## Security & tenancy

<!-- Complete if touching auth, API routes, DB schema / RLS, or list queries. Otherwise check N/A. -->

- [ ] N/A — this PR does not touch auth, API routes, schema / RLS, or list queries
- [ ] Server-side authorization enforced; negative test added or updated
- [ ] No cross-tenant data leakage (scoped queries / RLS / integration test)
- [ ] No secrets, PII in logs, or PII sent to Layer-3
- [ ] No tenant-name conditionals (`if (tenant === …)`)

## Architecture boundaries

<!-- Complete if touching apps/* or packages/*. Otherwise check N/A. -->

- [ ] N/A — docs-only or no app / package code change
- [ ] Domain writes go through `packages/modules` public barrels (no cross-module table reads)
- [ ] No new routes appended to `apps/api/src/app.ts` (register in `apps/api/src/routes/`)
- [ ] No banned patterns: raw `fetch` in `packages/app`, raw `<div>` in `packages/app`, `Platform.OS` in `packages/app`, `new Date()` in `packages/db` or `packages/modules` (Luxon only)
- [ ] OpenAPI regenerated if HTTP contract changed (`openapi:generate`, drift check clean)

## Tests

<!-- Required per AGENTS.md unless docs-only with no behavior claim. -->

- Test(s) that would fail before this change:
  - `path/to/file.test.ts` — proves spec bullet: "Given …, Then …"

## Verification

<!-- Commands you ran locally. CI re-runs merge gates: gitleaks, format, lint (module boundaries), typecheck, OpenAPI drift, unit/integration tests, web build, Playwright login smoke, prod audit, iOS Metro export.

Not CI-gated (do not claim these as merge gates): Maestro, Lighthouse, authenticated roster e2e. -->

- [ ] `pnpm format:check` (or formatted touched files)
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test` — scope: <!-- e.g. `@gymos/modules...` or full workspace if `packages/contracts` / shared types changed -->
- [ ] `pnpm --filter @gymos/web build` (if web / app / ui / platform touched)
- [ ] `./scripts/eval-agent-diff.sh` (if agent-eval task or harness-relevant change)

## Rollout & rollback

<!-- If applicable: infra, migrations, prompt canary, feature flags, tenant manifest. Otherwise write N/A. -->

- Deploy order / migration notes:
- Rollback:

## Out of scope / deferred

<!-- Phase discipline — flag anything intentionally not in this PR (later alignment phase, follow-up slice). -->

## Review notes

<!-- Edge cases, breaking changes, follow-ups, CODEOWNERS paths needing human review. -->

## Test plan

<!-- Human checklist for reviewer / QA. -->

- [ ]
