# FR-C7 — Dietary profile and allergen dual-check

## Invariant

Severe allergies are data, not UI-only warnings. Foods are hard-filtered by allergen tags before the solver (Layer 2). After composition, `assertNoRestrictedFoods` runs again. A coach's manual add, swap or apply-day-to-week obeys the same allergen rule. Neither check is delegated to the LLM. Changing the active profile re-validates the published plan.

## Acceptance

- Given restrictions that include `ALLERGY_SEVERE` / `allergen:*` codes, When `generatePlan` runs, Then candidate foods exclude overlapping `allergenTags` (`candidatesForRestrictions`).
- Given a composed week that still contains a restricted allergen, When the post-check runs, Then generate returns `ALLERGEN_POSTCHECK_FAILED` (422 at the HTTP boundary) and does not persist a client-facing plan.
- Given a client whose active profile has an `allergen:*` restriction of type `ALLERGY_SEVERE`, `ALLERGY_MILD` or `INTOLERANCE` (the same set `restrictedAllergenCodes` gives the Layer-2 filter), When `PATCH /v1/meal-plans/{id}` adds or swaps in a food tagged with that allergen, or applies a day holding such a food to the week, Then 422 problem+json `ALLERGEN_CONFLICT` (detail `allergen=<code>`) and the plan is unchanged: the whole batch of ops rolls back. This holds for `DRAFT` and `NEEDS_REVIEW` plans.
- Given a `PUBLISHED` plan, When `putProfile` writes a new restriction version that the current items violate, Then the plan status becomes `NEEDS_REVIEW` and a HIGH `PLAN_NEEDS_REVIEW` notification is raised.
- Given Layer-3 narration, When the model names a tracked food absent from that meal, Then `runGuardrails` fails closed (`ungrounded`) and the fallback template is used.

## Proven by

- `packages/modules/src/nutrition/foods.ts` (`candidatesForRestrictions`)
- `packages/modules/src/nutrition/plans.ts` (post-check)
- `packages/modules/src/nutrition/plan-ops.ts` (`applyAdd`, `applySwap`, `applyDayToWeek`)
- `apps/api/tests/pilot-loop.test.ts` (O16: manual add and swap)
- `packages/modules/src/nutrition/dietary.ts` (`putProfile`)
- `packages/core/src/nutrition/restrictions.ts` / `restrictions.test.ts`
- `packages/ai/src/guardrails.ts`
