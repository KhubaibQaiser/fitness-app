# Task: openapi-response-schemas

## Prompt

Replace `dto.anyObject` on one authenticated GET (for example `getMe`) with a real Zod response schema, regenerate OpenAPI, and keep the typed client compiling.

## Invariants

- `docs/specs/openapi-codegen.md` still holds: do not switch `packages/contracts/src/types.ts` to hey-api until several routes have real response schemas.
- OpenAPI drift CI stays green.
- No tenant-name conditionals.

## Done when

`./scripts/eval-agent-diff.sh` prints `PASS` and the spec for that operation no longer uses a free-form object for 200.
