# Task: split-api-routes

## Prompt

Extract HTTP route handlers out of `apps/api/src/app.ts` into `apps/api/src/routes/` without changing request/response behavior. Keep middleware, token issuance, and health checks in `buildApp`.

## Invariants

- `pnpm --filter @gymos/api test` stays green (pilot loop, tenant isolation, signup).
- `pnpm --filter @gymos/api openapi:generate` then Prettier leaves `packages/contracts/openapi/openapi.v1.json` unchanged.
- New endpoints go in `routes/`, not appended to `app.ts`.
- `apps/api/src/app.ts` stays under 400 lines.

## Done when

`./scripts/eval-agent-diff.sh` prints `PASS`.
