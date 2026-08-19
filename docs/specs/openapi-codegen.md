# OpenAPI contract and codegen

## Invariant

The committed spec `packages/contracts/openapi/openapi.v1.json` is generated from Zod routes (`pnpm --filter @gymos/api openapi:generate`) and must not drift in CI.

## Why client types stay hand-written (for now)

`packages/contracts/src/types.ts` is the typed client DTO layer used by `packages/app`. Most OpenAPI responses are still `anyObject` (see ADR-0007). Generating TypeScript from that spec with hey-api or `openapi-typescript` would replace precise DTOs with `unknown` / empty objects and break the app.

Codegen replacement is unblocked only after:

1. Auth routes are on `app.openapi` (they are still plain `app.post` in places).
2. Response bodies use real Zod schemas, not `dto.anyObject`.
3. A generate → prettier → `git diff --exit-code` gate is green (this file's CI step).

Until then, keep `types.ts` hand-maintained and treat OpenAPI as the HTTP documentation + drift surface, not the TS source of truth.

## Acceptance

- Given a Zod/OpenAPI route change, When CI runs `openapi:generate` then Prettier, Then `packages/contracts/openapi/openapi.v1.json` has no diff.
- Given a response still typed as `anyObject`, When someone proposes hey-api codegen, Then reject the PR until the schema is real.
