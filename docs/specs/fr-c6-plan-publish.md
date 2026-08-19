# FR-C6 — Plan generate, edit, publish

## Invariant

Generation always creates a `DRAFT` (or leaves `NEEDS_REVIEW` when a later dietary write invalidates a published plan). The LLM never writes kcal or macros. Publish requires `reviewed: true` on the request body. Off-target day totals require `acknowledgeDrift: true`.

## Acceptance

- Given a successful generate, When the row is read, Then status is `DRAFT` and item macros come from `food_db` (or an audited `coach_override`), not from Layer-3 output.
- Given generate with `AI_MODE=fallback` or a Layer-3 timeout/guardrail fail, When generate returns, Then meal names come from `fallbackNarrative` and a `DRAFT` still exists (`fellBack` / template path). Generation must not fail solely because the LLM failed.
- Given a `DRAFT`, When `POST /v1/meal-plans/{id}/publish` omits `reviewed: true`, Then 400 (Zod: `publishBody.reviewed` is `z.literal(true)`). Domain `REVIEW_REQUIRED` is 422 if the service is called with `reviewed: false`.
- Given a `DRAFT` whose day totals sit outside tenant kcal/macro tolerance, When publish without `acknowledgeDrift: true`, Then 422 `DRIFT_ACK_REQUIRED`.
- Given a `PUBLISHED` plan, When `PATCH /v1/meal-plans/{id}`, Then 422 `PLAN_NOT_EDITABLE`.
- Given a swap on a `DRAFT`, When the food exists, Then macros are recomputed as `per100g × grams` and an `ai_feedback_events` row of kind `SWAP` is written.

## Proven by

- `packages/modules/src/nutrition/plans.ts` (`generatePlan`, `publishPlan`, `patchPlan`)
- `packages/ai/src/narrate.ts` (fail-closed fallback)
- `apps/api/tests/pilot-loop.test.ts`
- `packages/modules/src/nutrition/plan-ops.test.ts` (if present) / `plan-ops.ts`
