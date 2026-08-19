# Agent eval result — split-api-routes

- **Date:** 2026-08-19
- **Task:** [split-api-routes](../agent-tasks/split-api-routes.md)
- **PR:** https://github.com/KhubaibQaiser/fitness-app/pull/47
- **Model / runtime:** Cursor agent on this repo (mechanical extract of `apps/api/src/app.ts`)
- **Files touched:** `apps/api/src/app.ts`, `apps/api/src/app-deps.ts`, `apps/api/src/http.ts`, `apps/api/src/auth-cookies.ts`, `apps/api/src/rbac-http.ts`, `apps/api/src/route-bind.ts`, `apps/api/src/routes/*`, `AGENTS.md`

## Scorer (`./scripts/eval-agent-diff.sh`)

| Check                                                            | Result                                       |
| ---------------------------------------------------------------- | -------------------------------------------- |
| `new Date()` in `packages/modules` / `packages/db` (excl. tests) | PASS                                         |
| raw `fetch(` in `packages/app` (excl. tests)                     | PASS                                         |
| `apps/api/src/app.ts` line budget (< 400)                        | PASS (329)                                   |
| `pnpm lint`                                                      | PASS                                         |
| `pnpm typecheck`                                                 | PASS                                         |
| `pnpm test` on this machine                                      | FAIL (`@gymos/web` vitest `ERR_REQUIRE_ESM`) |

Local Node was `v20.14.0`; `package.json` engines require `>=22.11.0`. CI uses `.nvmrc` and is the merge gate. `pnpm --filter @gymos/api test` on this change: 37 passed.

Harness-only (`EVAL_SKIP_TURBO=1`): **PASS**.

## Verdict

**PASS** for the task invariants (behavior-preserving split, OpenAPI unchanged, line budget). Do not treat a Node 20 local `pnpm test` failure as an agent regression.
