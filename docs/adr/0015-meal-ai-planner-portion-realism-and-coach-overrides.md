# ADR-0015: Meal-plan portion realism, coach-level generation instructions, and per-meal regeneration

- **Status**: Accepted
- **Date**: 2026-08-23
- **Approved**: 2026-08-23 — the recommended options (D1-E, D2-D + rich-text-C, D3-C) are confirmed as written. This revision adds the engineering-principles rationale ("Design principles applied") and concrete smoke-test specifications ("Smoke tests") requested at approval; it does not change which option was chosen in any decision. A follow-on request — showing the per-meal kcal split on the plan screen — is added as **D4**, a small presentational addition with no architecture decision to litigate (see D4 below).
- **D5/D6 added 2026-08-23, Status for these two: Proposed, not yet Accepted.** These are the direct continuation of the D2 discussion above ("the coach is the final authority… fine-tune AI meal generation"), not a separate initiative. D5 (weekly variety) and D6 (structured positive food preferences) refine Layer 2's _selection_ logic specifically to deliver more "curated"-feeling plans while staying inside the deterministic, LLM-free boundary D2 above already re-confirmed — see their sections below for the full case, comparison matrices, and the one idea (macro-fit-aware scoring) that was evaluated and deliberately deferred rather than built speculatively.
- **D7 added 2026-08-23, Status: Accepted.** Meal calorie shares are now enforced by Layer 2 (they were only an initial guess) and coaches set them as structured percents on Settings → Meal AI Planner — not via free-text instructions. Filed after a 2000 kcal plan produced a 759 kcal breakfast against a requested 10% share.
- **Phase**: AI-native nutrition track ([ADR-0001](0001-hybrid-ai-nutrition.md) lineage), not a `CLAUDE.md` P1–P4 alignment phase. The one net-new UI surface this introduces (Settings → Meal AI Planner) must still consume the P1 token/component set — it is new functionality, not a re-skin, so it does not belong to P1 itself.

This is a planning ADR. D1–D4 are accepted for implementation as written; D5–D6 are proposed, pending confirmation of the specific designs below (rotating-template variety, the `PREFERRED` restriction type). No source files change in _this_ PR; it sequences six follow-on implementation PRs total, each scoped to its own CODEOWNERS review gate where one applies, and each is expected to ship with the smoke test(s) specified for it below, not just the `docs/specs/` acceptance criteria.

## Context

Three coach-reported problems, all rooted in the Layer 2 solver and the coach-facing plan workflow:

1. **Unrealistic single-item portions — every meal slot, not a breakfast-only bug.** The solver (`packages/core/src/nutrition/solver.ts`) sizes each pattern slot independently, and the same `buildItems`/`optimizePortions` code path runs for every entry in `MEAL_TEMPLATES` (`solver.ts:106-125`) — breakfast, lunch, dinner, and snack alike: it takes that meal's kcal share, divides by the number of adjustable pattern groups, and converts to serving units, clamped only by `UNIT_MAX = 8` native servings per item (`solver.ts:217-219`, `solver.ts:329-341`). There is no ceiling tied to what a food realistically looks like on a plate, in any slot. "Egg (whole, boiled)" at breakfast (`servingUnits: [{ name: 'piece', grams: 50 }]`, `packages/db/src/seed-data/foods.ts:121-131`) ballooning to 8 units — 400g, 8 whole eggs — in a single slot is the reported symptom, but the identical mechanism applies to lunch's `protein`/`staple`/`vegetable`/`fat` pattern and dinner's `protein`/`vegetable` pattern (`MEAL_TEMPLATES`, `solver.ts:106-125`) — e.g. "Chicken breast (skinless, cooked)" at lunch (`servingUnits: [{ name: 'piece', grams: 120 }]`) can equally be pushed to 8 pieces (960g) if that closes lunch's kcal gap cheapest. The post-build hill-climb (`optimizePortions`, `solver.ts:247-276`) pushes _any_ adjustable item in _any_ slot to that ceiling if it is the cheapest way to close a kcal gap; any food with a small per-100g kcal density relative to `perItemKcal` (`targets.kcal * meal.share / adjustableCount`) is at risk, regardless of which meal it is in. D1's fix below is therefore scoped to the shared solver mechanism, not to breakfast or to eggs specifically — the illustrative numbers throughout this ADR (eggs, breakfast) are the reported case, and every example is re-run against a lunch/dinner protein below to keep that generality explicit rather than assumed. This is a Layer 2 defect, not a Layer 3 one — Layer 3 (`packages/ai`) only names meals and writes prep notes and never sees or emits portion numbers (`packages/ai/src/prompts/meal-narrative.v1.ts:7-12`, `packages/ai/src/types.ts:38-55`); fixing it anywhere in Layer 3 would violate [ADR-0001](0001-hybrid-ai-nutrition.md)'s hard boundary and is not on the table.
2. **No coach-level fine-tuning of meal narration.** [ADR-0001](0001-hybrid-ai-nutrition.md) fixed the global system prompt as a versioned code artifact (`MEAL_NARRATIVE_SYSTEM`, `packages/ai/src/prompts/meal-narrative.v1.ts:7-12`) plus an optional tenant-wide cuisine pack (`packages/ai/src/prompts/packs.ts`, `resolvePromptPack`). Neither is coach-scoped. Individual coaches have preferences the global prompt should not encode (protein-forward breakfasts, specific prep styles, phrasing tone) and today the only way to express them is editing the shared code prompt or the tenant manifest — both wrong-grained and both requiring an engineering change per preference.
3. **No single-meal regeneration.** `generatePlan` (`packages/modules/src/nutrition/plans.ts:65-401`) always solves and narrates the full week from a fresh day-1 template (`solveWeek`, `solver.ts:431-459`). The only per-item control today is `patchPlan` → `applyPlanOps` (`packages/modules/src/nutrition/plan-ops.ts`) — manual `set-portion` / `swap` / `add` / `remove`, one item at a time. A coach who dislikes just breakfast on day 2 has no faster path than editing every item by hand or regenerating the entire week (`plan-editor.tsx:223-272`) and losing every other edit.
4. **No visible per-meal calorie split on the plan screen.** `plan-editor.tsx` shows a single day-level totals `Card` (kcal/protein/fat/carbs vs. targets, `plan-editor.tsx:276-307`) above the list of meal sections, but each meal's own `SectionTitle` (`plan-editor.tsx:333`) shows only the slot label ("Breakfast," "Lunch," "Dinner," "Snack") with no calorie figure next to it. A coach can currently only learn a single meal's kcal contribution by adding up every item under that section by hand — exactly the information that would make D3's "Regenerate meal" button meaningfully actionable (is this meal over its share before I bother regenerating it?), so this pairs naturally with D3 rather than standing fully apart from it.

D5 and D6 below continue directly from item 2's discussion, not a new complaint: the request behind D2 was, in full, "the AI should determine the food split per meal — curated around calories, allergens, and dietary flags (halal, etc.) — for a balanced plan," and the follow-up push was that if the current architecture prevents that, the architecture needed rethinking. The resolution reached was: that goal is already what Layers 1–2 deliver today, deterministically, and moving it into an LLM was rejected on the same grounds as D1's option D below (unreproducible, unauditable, unreliable at hard constraints like allergens) — but Layer 2 itself has real, fixable gaps in how "curated" the result feels:

5. **Zero day-to-day variety within a week.** `solveWeek` (`solver.ts:427-458`) solves day 1 once and **shallow-clones** the result to days 2–7 verbatim — every day in a generated week has the exact same foods and portions. This is a deliberate, documented ADR-0001 choice ("Per-day variety is coach-authored via edits, not solver randomness"), but it is very likely the single biggest reason a generated plan reads as mechanical rather than curated. The mechanism for day-specific variety already exists and is unused: `solveDay(day, targets, candidates, config)` seeds its `rand()` with `${config.seed}:day:${day}:attempt:${attempt}` (`solver.ts:371`), so calling it independently per day already produces different, still-deterministic, tolerance-respecting picks — `solveWeek` simply never calls it for days 2–7.
6. **No positive food-preference signal, and a slot-ranking bug that compounds it.** `RESTRICTION_TYPES` (`packages/core/src/nutrition/restrictions.ts:31-39`) — `ALLERGY_SEVERE | ALLERGY_MILD | INTOLERANCE | DISLIKE | RELIGIOUS | ETHICAL | MEDICAL` — every one of these _removes_ a food from consideration; there is no way to say "this client responds well to fish" that would _boost_ a food's odds instead of merely not excluding it. Separately, `food_rankings` is correctly keyed `(foodId, slot, goal)` (`packages/db/src/schema/nutrition.ts:262-276`), but `candidatesForRestrictions` loads it **by goal only** and folds every slot into one number via `Math.max` (`foods.ts:142-154`), before `pickCandidate` — which _does_ receive `slot`, and does nothing with it beyond a hardcoded olive-oil check (`solver.ts:281-285`) — ever sees the discarded dimension.

All six land primarily in `packages/core` and/or `packages/ai`/`packages/modules` (D1–D3, D5, D6) or are pure presentation over data already fetched (D4), which `CODEOWNERS` requires a human (`@KhubaibQaiser`) to review for the former. Approving this ADR accepts the _architecture_ below; it does not substitute for that CODEOWNERS review on the actual implementation PRs, which still happens per PR as normal.

## Decision

Ship as six independently reviewable PRs. Dependency ordering: D3 depends on D1's solver refactor; D2, D4, D5, D6 are each independent of the others and of D1/D3 (D4 is more useful once D3 ships, but not blocked on it).

- **D1** — Solver: realistic per-food serving ceilings + dynamic item-count expansion (`packages/core`).
- **D2** — Coach-level generation instructions, stored per-coach, layered under the global/tenant prompt, surfaced at Settings → Meal AI Planner (`packages/db`, `packages/modules`, `apps/api`, `packages/app`).
- **D3** — Per-meal regenerate action, reusing D1's solver entry point and D2's effective prompt (`packages/core`, `packages/modules`, `apps/api`, `packages/app`).
- **D4** — Per-meal kcal split shown on the plan screen, computed client-side from data already fetched — no comparison matrix below; this one has no real competing architecture options (`packages/app` only).
- **D5** — Weekly variety via a rotating-template week mode, opt-in alongside the existing `daily_template` default (`packages/core`, `packages/modules`).
- **D6** — Structured positive food preferences, reusing the existing dietary-restriction storage and query path, plus a fix to the slot-ranking bug in the same function (`packages/core`, `packages/db`, `packages/modules`, `packages/app`).

### Design principles applied

Each decision below was already screened against these before being marked "Chosen" — this section names the principle explicitly so the rationale doesn't have to be re-derived from the comparison tables during review:

- **DRY.** D1's `solveMeal` extraction is consumed by both the full-week solver (`solveDay`'s loop) and D3's single-meal regenerate path — one portion-solving implementation, not two that could drift apart. D2's coach addendum reuses the exact `MEAL_NARRATIVE_SYSTEM` / `pack.systemAddendum` join pattern already in `narrate.ts`, and its safety checks reuse the existing `containsNumericClaim` / `assertDeidentified` guardrails rather than duplicating that pattern-matching logic a third time. D5's weekly variety reuses `solveDay` completely unmodified — the per-day seed it needs already exists, `solveWeek` just never called it independently before. D6's preference boost reuses the exact `dislike:<foodId>` storage, query path, and UI pattern the codebase already has for exclusions, just with the opposite polarity.
- **KISS.** D1 rejects the LP/knapsack re-solve (option C) — a bounded-expansion rule over the existing deterministic hill-climb solves the actual defect without a new dependency or a new class of non-determinism to reason about. D2 rejects a DOM rich-text library (option A) for an ~80-line first-party markdown-subset stripper — the simplest mechanism that satisfies "good formatting" and "parses to plain text" without taking on an HTML-sanitization surface to maintain. D3 is scoped to exactly one meal, not a generalized "regenerate any subset of a plan" abstraction nobody asked for. D4 skips the comparison-matrix ceremony the other three decisions get, on purpose — a one-line derived display over data already in hand does not have competing architectures worth tabulating, and pretending otherwise would be the opposite of KISS. D5 rejects full 7-day independent solving (maximum variety, but worse for a real client's grocery/meal-prep practicality) in favor of a small rotation — more variety is not automatically better if nobody asked for 7 different shopping lists a week. D6 explicitly defers macro-fit-aware candidate scoring rather than building it speculatively — the existing tolerance tests show no live problem it would fix yet, so it isn't built "just in case."
- **SOLID:**
  - _Single Responsibility_ — `solveMeal` only sizes portions; `narrate()` only names meals and writes prep notes; `coach-instructions.ts` only owns the coach's override text and its lifecycle. RBAC/authorization stays entirely in the route layer, never inside `packages/core` or `packages/ai`. No decision here merges two of those responsibilities into one function.
  - _Open/Closed_ — the coach addendum is _appended_ onto the existing prompt-composition pipeline in `narrate.ts`, not a rewrite of `MEAL_NARRATIVE_SYSTEM` or a new conditional branch inside it; `NarrateOptions`/`AiConfig` gain an additive optional field, so every existing caller keeps compiling and behaving identically without modification.
  - _Liskov substitution_ (no literal class hierarchy here, but the same discipline applies to the refactor) — extracting `buildItems`/`optimizePortions` into `solveMeal` must keep `solveDay`'s existing callers (`solveWeek`, `generatePlan`) working against the exact same return shape and tolerance contract; `solver.test.ts`'s current assertions passing unmodified is the regression check for that substitutability.
  - _Interface segregation_ — coach instructions get their own module (`coach-instructions.ts`) and route file, instead of growing `plans.ts` / `foods.ts` into a wider surface a caller has to pull in fully just to reach one narrow capability.
  - _Dependency inversion_ — `packages/ai`'s `narrate()` depends on a plain `coachAddendum: string | null` value passed into it, not on `packages/db`/`packages/modules` to go fetch it itself. The module layer (`generatePlan`, D3's `regenerateMeal`) owns resolving that dependency and injects it, keeping `packages/ai` free of any database or tenancy import — the same boundary that already holds today for tenant packs.

---

### D1 — Portion realism

**Options considered**

| Option                                                                                                                                                                                                                                                                                                         | Performance                                                             | Determinism                                                                                                   | Complexity                                                                                                                                                       | Catalog burden                                                                                                                          | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Global absolute gram cap (e.g. 400g/item), one hardcoded number applied uniformly to every food in the catalog regardless of type — chicken, beef, mutton, rice, oil, all capped identically — replacing `UNIT_MAX`                                                                                         | O(1), no change to hill-climb shape                                     | Preserved                                                                                                     | Trivial (one constant)                                                                                                                                           | None                                                                                                                                    | Rejected in both directions at once: too _high_ for calorie-dense fats (2 tbsp/27g of olive oil is already a full realistic serving — 400g of oil is absurd) and too _low_ for bulky low-density staples in a large-surplus meal (600g of rice for a bulking client's lunch can be entirely realistic). A single number cannot be correct across `FoodGroup`s or across meal targets — this is not a minor edge case, it is the general shape of the problem, which is why option A is rejected outright rather than tuned. |
| B. Per-food `maxUnits` (or `maxGrams`) column on `foods`, hill-climb respects it as a ceiling, but meal composition stays fixed at the template's item count                                                                                                                                                   | O(1)                                                                    | Preserved                                                                                                     | Small: one migration + one solver clamp                                                                                                                          | One column to backfill per seed row                                                                                                     | Partial fix only — stops one item from ballooning, but if the meal's kcal share can't be met within realistic caps, the day silently drifts under target or `SOLVER_INFEASIBLE` fires more often.                                                                                                                                                                                                                                                                                                                           |
| C. Full linear/integer-programming re-solve (multi-item knapsack over the whole catalog per meal)                                                                                                                                                                                                              | Slower, no closed-form determinism guarantee across library versions    | At risk — LP solvers are not guaranteed bit-identical across environments the way the seeded hill-climb is    | Large: new dependency, new numerical-stability test surface                                                                                                      | None                                                                                                                                    | Rejected — breaks the "seeded PRNG ⇒ identical inputs + seed reproduce the identical plan" invariant this module is tested against (`solver.test.ts`), and is disproportionate to the actual defect.                                                                                                                                                                                                                                                                                                                        |
| D. Let Layer 3 (LLM) suggest a second item or adjust portions                                                                                                                                                                                                                                                  | N/A                                                                     | N/A                                                                                                           | N/A                                                                                                                                                              | N/A                                                                                                                                     | Rejected outright — violates [ADR-0001](0001-hybrid-ai-nutrition.md): Layer 3 never emits or influences kcal/macro numbers. Not reconsidered.                                                                                                                                                                                                                                                                                                                                                                               |
| **E. Per-food realistic serving ceiling (B) + dynamic pattern expansion: when hill-climb needs more kcal from a pattern group but every adjustable item in that group is already at its ceiling, add a second item from the same group (or its `GROUP_FALLBACKS`) instead of continuing to inflate the first** | O(1) amortized — bounded by `ATTEMPTS_PER_DAY` retries already in place | Preserved — expansion is a deterministic function of the same seeded `rand()` stream, same as `pickCandidate` | Moderate: new `foods.maxUnits` column, a bounded-items-per-slot cap (e.g. 3) to stop runaway expansion, and one new code path in `buildItems`/`optimizePortions` | One column, sane defaults derivable from existing `servingUnits[0].grams` (e.g. `maxUnits = clamp(realistic gram ceiling / unitGrams)`) | **Chosen.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**Decision detail (E):**

- **`maxUnits` is per-food, not a global constant — this is the entire point of choosing E over A.** Every food gets its own ceiling, derived from its own `servingUnits[0].grams`, so meat is not squeezed into the same box as an egg or a tablespoon of oil:

  | Food                              | `servingUnits[0]` | `maxUnits` | Realistic ceiling                                                                                                                                                                                                                                                   |
  | --------------------------------- | ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Egg (whole, boiled)               | 1 piece = 50g     | 3          | 150g                                                                                                                                                                                                                                                                |
  | Chicken breast (skinless, cooked) | 1 piece = 120g    | 3          | 360g — _higher_ than option A's flat 400g would suggest is even the same order, and correctly food-specific, not incidentally similar                                                                                                                               |
  | Beef qeema (lean, cooked)         | 1 cup = 150g      | 2–3        | 300–450g — can legitimately exceed 400g for a large-surplus dinner; a static cap would either wrongly block this or wrongly permit it for every other food too                                                                                                      |
  | White rice (cooked)               | 1 cup = 160g      | 3–4        | 480–640g — a bulky, low-kcal-density staple genuinely needs more grams to contribute a meaningful kcal share; a 400g cap here would starve the meal and push the solver toward `SOLVER_INFEASIBLE` or a compensating second item that shouldn't have been necessary |
  | Olive oil                         | 1 tbsp = 13.5g    | 2          | 27g — a food this calorie-dense has a real ceiling far below 400g; a global cap would let a single tablespoon-scale fat balloon to fill an entire meal's kcal gap                                                                                                   |

  Add `foods.max_units numeric` (nullable) via a new migration in `packages/db/migrations/`; when unset, the solver falls back to a conservative per-food default computed from that food's own serving size (e.g. `min(UNIT_MAX, round(250 / unitGrams))`), never a fixed gram number shared across foods. The nutrition-literate seed-catalog review (blocking issue #2 below) sets the deliberate values in the table above; the formula is only the unreviewed fallback for foods nobody has looked at yet.

- **"How many calories to fulfil" and "what other options are available" are exactly what the dynamic-expansion half of E answers — deterministically, not via a static number or an LLM call.** The per-food ceiling on its own only answers "is this a realistic single-item portion" — it says nothing about the meal's remaining kcal gap. That is handled by the second half of option E: when an item is already at its ceiling and the meal still needs more kcal, the solver pulls in _another_ item from the same food group (or its `GROUP_FALLBACKS`) out of the actual candidate pool available for that slot, exactly the "available options for meal composition" the question asks for — e.g. a lunch that still needs kcal after two realistic servings of chicken adds a second protein-group item (or falls back to dairy) rather than a third unrealistic serving of chicken. This _is_ contextual — food identity, meal slot, remaining kcal target, and the live candidate pool all feed into the decision — but it is computed by the same deterministic, seeded solver that already exists (`buildItems`/`optimizePortions`), not delegated to an LLM. That last point is not incidental: [ADR-0001](0001-hybrid-ai-nutrition.md) draws a hard line that Layer 3 never influences kcal/macro/portion numbers specifically _because_ those numbers need to be safe, reproducible given a seed, and auditable — an LLM asked to "use judgment" about portion sizes would reintroduce the exact class of failure (an ungrounded, unreproducible, unaudited number) this ADR exists to close. "Contextual" here means "a function of structured inputs the algorithm can reason about," not "AI-generated."
- `buildItems`/`optimizePortions` clamp each item's `units` to `min(UNIT_MAX, food.maxUnits ?? defaultFor(food))` instead of `UNIT_MAX` alone — applied identically regardless of which `MealTemplateEntry`/slot the item belongs to; there is no slot-specific branch, by design, because the defect is not slot-specific, and a food's realistic per-item ceiling (how much of _that food_ is a plausible single serving) does not change depending on which meal it appears in — only the _number of items_ used to hit that meal's calorie target does, which is what the expansion logic above governs.
- Cap items-per-slot at a small constant (e.g. 3) so no meal — breakfast, lunch, dinner, or snack — silently grows past a realistic number of components; when the group is already at that count and every item is at its ceiling, the day falls through to the existing `ATTEMPTS_PER_DAY` retry-with-different-seed path, and ultimately to the existing `SOLVER_INFEASIBLE` error if truly infeasible — no new failure mode, just a tighter one.
- `solver.test.ts` gets new cases covering more than the reported breakfast/egg symptom: a high-kcal target that would have produced a >maxUnits single item today must produce ≥2 items in that slot instead, still within the existing kcal/macro tolerance — asserted for at least one breakfast case and one lunch-or-dinner case, so the fix is proven generic rather than only regression-tested against the specific complaint that triggered it. Add a case for a bulky staple (e.g. rice) too, proving the ceiling does not wrongly suppress a legitimately larger portion the way a flat 400g cap would.
- This is a `packages/core` change — CODEOWNERS review is mandatory, no exception.

---

### D2 — Coach-level generation instructions

**Options considered**

| Option                                                                                                                                                                                                                                                   | Data model fit                                                                                                                                                         | Auditability                                                                                                                        | Cross-platform (web + `apps/mobile`)                                                              | Blast radius                                                                                 | Verdict                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. Extend `tenant_configs.manifest.aiConfig` with a per-coach map                                                                                                                                                                                        | Wrong grain — manifest is tenant-scoped JSONB, keyed and versioned per org, not per coach; every coach edit would rewrite the whole tenant manifest                    | Manifest has no per-field history                                                                                                   | N/A                                                                                               | High — couples an org-wide config surface to a per-user editing workflow it wasn't built for | Rejected.                                                                                                                                                                      |
| B. `users.metadata`-style JSONB blob on the user/coach row                                                                                                                                                                                               | Wrong grain — mixes with unit prefs, no independent versioning, `updateUserPrefs` (`apps/api/src/routes/me.ts`) is not built for a save/cancel/regenerate-confirm flow | No revision history, so "what changed since the last plan generation" (needed for the regenerate-confirm dialog) is unanswerable    | Fine                                                                                              | Low, but leaves us unable to build the required "instructions actually changed" diff check   | Rejected.                                                                                                                                                                      |
| C. Client-side only (localStorage / device storage)                                                                                                                                                                                                      | No server grain at all                                                                                                                                                 | None                                                                                                                                | Breaks — instructions used server-side during generation, and `apps/mobile` and web would diverge | N/A                                                                                          | Rejected — also directly banned (`AGENTS.md`: no raw client-only persistence standing in for a real data layer; `packages/app` has no `localStorage` primitive to begin with). |
| **D. New versioned table `coach_meal_instructions`, one active row per coach, following the existing `client_dietary_profiles` versioning pattern (`packages/db/src/schema/nutrition.ts:33-57`: `version` + `is_active` + `created_by` + `created_at`)** | Right grain: coach-scoped, append-only history, one query for "current"                                                                                                | Full history for free; diffing current vs. previous active row answers "did instructions actually change" without extra bookkeeping | Server-resolved, same for web and `apps/mobile`                                                   | Contained: one new table, one new module, one new route file, one new settings screen        | **Chosen.**                                                                                                                                                                    |

**Decision detail (D):**

- **Schema** (`packages/db/src/schema/nutrition.ts`, new migration): `coach_meal_instructions(id, coach_id → coaches.id, version int, is_active bool default true, rich_text jsonb, plain_text text, created_by → users.id, created_at)`. Unique-active-per-coach index mirrors `dietary_profiles_one_active_uq`. `rich_text` stores the structured content (see editor decision below); `plain_text` is the derived, agent-readable string computed at save time — this is what actually reaches Layer 3, never the rich structure.
- **Module** (new `packages/modules/src/nutrition/coach-instructions.ts`, exported from the existing `packages/modules/src/nutrition/index.ts` barrel): `getActiveInstructions(db, coachId)`, `saveInstructions(db, principal, plainText, richDoc)` (**sanitizes both inputs first** — see "Input sanitization" below — then writes a new version, flips `is_active`, `writeAudit`-logs the change same as `plan-ops.ts` does).
- **Route** (new `apps/api/src/routes/coach-instructions.ts`, registered like every other route file — never appended to `app.ts` per `AGENTS.md`): `GET /v1/me/meal-instructions`, `PUT /v1/me/meal-instructions`. Response includes the previous `plain_text` alongside the new one so the client can show the regenerate-confirm dialog only when the saved text actually changed (`before !== after`), without a second round-trip.
- **Layer-3 wiring** (`packages/ai/src/narrate.ts`): `callOpenAiCompatible` currently composes `MEAL_NARRATIVE_SYSTEM` + tenant `pack.systemAddendum` (`narrate.ts:186-189`). Add a third, coach-scoped addendum appended last (highest precedence, per the requirement that coach overrides win on conflict with global instructions): `system = [MEAL_NARRATIVE_SYSTEM, pack.systemAddendum, coachAddendum].filter(Boolean).join(' ')`. `coachAddendum` is threaded through `NarrateOptions`/`AiConfig` from `generatePlan` (and D3's per-meal path), sourced from `getActiveInstructions`. This keeps `packages/ai` prompt composition itself unchanged in shape — still versioned, still `assertDeidentified`-checked (coach text is server-authored, not client input, but it still flows through the same de-identification gate for defense in depth) — only the input to that composition grows a new field.
- **Guardrail reuse, not new guardrails.** A coach could write "say each meal is 400 kcal" into their instructions. The existing `numeric_claim` guardrail (`packages/ai/src/guardrails.ts`, `containsNumericClaim`) already scans every LLM _output_ regardless of what produced it, so a coach cannot get a number into a published meal name/prep note this way — any such output guardrail-fails and falls back to `fallbackNarrative`. Additionally, run the same `containsNumericClaim` check against the instructions text at **save time** as a non-blocking warning ("Your instructions mention numbers — GymOS never lets the AI state calories or macros, so this line may be ignored or cause the AI to fall back to plain meal names"). Warn, don't block — a coach might legitimately write "focus on high-protein options," which is fine and contains no digits; blocking on any digit would be too broad in the other direction (order-of-magnitude annoying for phrases like "3 eggs is a good staple").
- **Input sanitization, server-side, at save time — not optional, and not the client's responsibility.** `saveInstructions` sanitizes both the stored markdown-subset string and the derived `plain_text` before anything is persisted; the client-side editor is not trusted to have already cleaned the input. This matters more here than for any other coach-authored free text in the codebase (e.g. `coach_notes.body`) because the derived value is concatenated directly into an LLM system-prompt string (`narrate.ts`), not merely displayed back. The sanitizer (`sanitizeInstructionsText`, a small pure function colocated in `coach-instructions.ts` — the only call site, so it stays there rather than becoming a new shared package per `surgical-changes`' "no parallel utility until something else needs it") does, in order:
  1. **Strip raw HTML tags and event-handler-style attributes** (`<`, `>`, `on\w+=` patterns) — even though today's preview renderer only maps a small markdown _subset_ to Tamagui elements and never uses `dangerouslySetInnerHTML`/`innerHTML`, this is defense in depth for any future surface that displays this text without knowing its provenance (a PDF export, an admin audit view, a notification digest).
  2. **Strip non-printable and zero-width/control Unicode** (`\u0000`–`\u001F` except newline/tab, `\u200B`–`\u200F` zero-width chars, `\uFEFF` BOM) — these have no legitimate use in coaching instructions and are a known technique for hiding or obfuscating injected text from a casual read of what was saved.
  3. **Collapse runs of blank lines/excess whitespace.**
  4. **Hard-cap length** (e.g. 2,000 characters) — bounds prompt-token cost and limits the blast radius of any single bad input, on top of the existing per-field `maxLength` validation the form already needs.
     Sanitization runs once, at the single write path (`saveInstructions`); `getActiveInstructions` and `narrate.ts` read already-clean data, so `narrate.ts` keeps only its existing `assertDeidentified` check rather than gaining a redundant second sanitize pass.
- **Scope of coach authority, confirmed: narration only, never portions or macros.** The coach is the final authority over how a plan reads and feels — meal names, phrasing, prep-note style, cuisine tone — and D2's override instructions are exactly that authority made concrete and durable instead of a one-off editing request. That authority does not extend to _how much_ of a food appears or _which numbers_ a plan targets: D1's per-food serving ceiling is a deterministic, engine-owned correctness floor applied identically for every coach and every plan, not a preference exposed through the instructions text box, and it cannot be loosened or overridden by anything a coach writes there. This is the same split [ADR-0001](0001-hybrid-ai-nutrition.md) already draws between Layers 1–2 (numbers, never learn, never take free-text input) and Layer 3 (language, coach-tunable) — D2 does not renegotiate that boundary, it is the sanctioned instance of it for narration. A coach's _food-selection_ preferences (e.g. "avoid organ meats," "prefer fish over red meat") already have a real, safety-appropriate channel today — dietary dislike codes and Layer-4 food rankings (`candidatesForRestrictions`, `packages/modules/src/nutrition/foods.ts:75-204`) — plus direct manual edits via `patchPlan`. If a future ask wants the coach to tune _portioning behavior itself_ (e.g. a per-coach default toward smaller, more frequent items), that is a new, structured, numeric preference — not free text — and would need its own ADR; this one does not smuggle it in as a side effect of D2's addendum.
- **Prompt injection is a related but distinct risk, and sanitization alone does not close it.** Because the coach addendum is concatenated into the LLM system message, a coach (or anyone who compromises a coach's session) could type "ignore all prior instructions and…"-style text. Sanitization above removes obfuscation vectors and caps size, but the actual boundary against that risk is unchanged from [ADR-0001](0001-hybrid-ai-nutrition.md) and was never meant to depend on prompt hygiene alone: the addendum is appended _after_ `MEAL_NARRATIVE_SYSTEM`, never prepended, so the core "JSON only / never emit numbers / only reference listed foods" instructions are not reorderable by coach input; `response_format: json_schema` with `strict: true` (`narrate.ts:205-211`) constrains decoding regardless of what the system prompt contains; and the existing output guardrails (`schema`, `numeric_claim`, `shape_mismatch`, `ungrounded` — `packages/ai/src/guardrails.ts`) still gate every response and fall back to `fallbackNarrative` on any failure. A successful injection attempt still cannot produce a schema-violating or numeric-bearing output. This ADR narrows the attack surface; it does not claim the LLM boundary becomes injection-proof, because that boundary was already designed not to rely on prompt hygiene in the first place.
- **Settings UI** (`packages/app/src/features/settings/`, new sub-feature `meal-instructions/`; route `apps/web/app/(coach)/settings/meal-planner/page.tsx` following the existing `settings/nutrition/page.tsx` sub-route convention): a button on the flat `SettingsScreen` ("Meal AI Planner →") navigates to the sub-route. That screen:
  - Shows only the coach's own override text — never the global prompt or tenant pack, per the requirement that this surface is coach-scoped only.
  - Editor: see "Rich text" decision below.
  - **Save** / **Cancel** buttons, `PrimaryButton` / `GhostButton` per existing convention (`plan-editor.tsx`).
  - On **Save**, if the new `plain_text` differs from what was active before the edit, show a confirm dialog before committing: _"Regenerate all client meal plans with these instructions? This resets any manual food swaps or portion edits on their current draft/published plans."_ Two actions: _Regenerate all plans_ (calls save, then triggers a batch regenerate — see rollout note below) and _Save without regenerating_ (saves the instructions; existing plans keep their current narration until each is next regenerated normally). This mirrors the existing inline-card confirm pattern (`PlanPublishConfirm`, `override-prompt.tsx`) rather than introducing a new modal/dialog primitive — the codebase has none today, and adding one is out of scope for this feature.
  - **Rollout note:** a "regenerate all plans" bulk action is a queue/background-job concern (N clients × `generatePlan`), not a synchronous request. Scope D2 to _offer_ the choice and persist it (e.g. queue a `coach_id`-scoped batch job processed by the existing generation pipeline, one `generatePlan(kind: 'ADJUSTMENT')` call per active client), but do not block D2's merge on building new job infrastructure if none exists — flag this explicitly as a D2 sub-item to confirm against the actual job/worker setup (`ADR-0001`'s "learning.ranking-refresh" nightly worker is the closest existing precedent) before implementation, rather than assuming a synchronous fan-out is safe at scale.

**Rich text → plain text: options considered**

| Option                                                                                                                                                                                                                                                                                                                                                                          | New dependency                                                                                                                                                                                                                            | RN + web parity                                                                                                                                                                | Editing power vs. ask                                                                                 | Verdict                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. TipTap / Slate / Lexical (DOM-based rich text)                                                                                                                                                                                                                                                                                                                               | Yes — none currently in the repo (verified: no `tiptap`/`slate`/`lexical`/`quill`/`draft-js` in any `package.json`)                                                                                                                       | Breaks — these are web/DOM editors; `apps/mobile` would need a second, divergent implementation, which is exactly the "divergent-capability" anti-pattern `CLAUDE.md`/v4 flags | High                                                                                                  | Rejected — new heavy dependency with no concrete cross-platform story, against `surgical-changes` ("no new dependencies without a concrete reason") and the `gymos-boundaries` "no raw `<div>`" constraint for `packages/app`. |
| B. Plain multiline `FormField` (already used for the override-reason textarea, `override-prompt.tsx:34-46`)                                                                                                                                                                                                                                                                     | No                                                                                                                                                                                                                                        | Full parity                                                                                                                                                                    | None — no formatting at all                                                                           | Rejected on its own — the user explicitly asked for "good formatting," and a flat textarea for multi-paragraph coaching instructions with lists is a worse authoring experience than the ask calls for.                        |
| **C. Lightweight Markdown authoring: a toolbar of insert-shortcuts (bold/italic/heading/bullet) over a multiline `FormField`/`TextInput`, plus a live preview rendered with existing Tamagui `Text`/`Body`/`SectionTitle` primitives via a small first-party markdown→RN-element mapper (bold/italic/headings/lists only — a deliberately small subset, not a general parser)** | No — the subset needed (bold, italic, one heading level, bullet lists) is under ~80 lines of parsing logic, well inside "reuse existing functions... do not add a parallel utility" once written once in `packages/core` or `packages/ui` | Full — `TextInput`/`Text` are RN primitives already used on both platforms                                                                                                     | Matches the ask: "rich text field... good formatting" while staying parseable to a clean plain string | **Chosen.**                                                                                                                                                                                                                    |

- `plain_text` derivation runs **after** the sanitization pass described under "Input sanitization" above (control-character/HTML-tag stripping, length cap), then strips the markdown syntax characters coaches typed (`**`, `_`, `#`, leading `- `) and joins with newlines — trivial, deterministic, unit-testable, and exactly what "parse the rich text to plain agent-readable string" asks for. Choosing a markdown-subset string over a DOM-based rich-text library also keeps the sanitization surface small and fully first-party — there is no third-party HTML-sanitizer dependency to keep current against new bypass techniques, unlike any DOM-based rich text lib that would be feeding raw user-authored HTML into a stored field.
- `rich_text` column stores the raw markdown-subset string (not a bespoke JSON doc) — since the "rich" representation and the editable text are the same string here, there is no separate document model to keep in sync, no lossy round-trip, and no serialization format to version. `plain_text` remains a separately stored, denormalized field purely so the Layer-3 wiring never has to re-run the stripper on every generation call.

---

### D3 — Per-meal regenerate

**Options considered**

| Option                                                                                                                                                                                                                                                                                            | Reuses D1/D2                                                                                                      | Atomicity                                                                                                                                                  | UX clarity                                                                        | Verdict                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A. Client repeatedly calls existing `swap` `PlanOp`s with random reselection until the meal "looks different"                                                                                                                                                                                     | No — bypasses the solver's kcal-share targeting entirely                                                          | Non-atomic: N separate patch calls, partial-failure states possible                                                                                        | Poor — "regenerate" implies solver-quality targeting, not repeated random swaps   | Rejected.                                                                                          |
| B. Scope a full `generatePlan` call down to `kind: 'MEAL'` conceptually, but actually still solve/narrate the whole week and discard everything except the target meal                                                                                                                            | Reuses generation pipeline wholesale                                                                              | Wasteful — solves 7 days × N meals to keep 1                                                                                                               | Confusing audit trail (`plan_generations` row would claim a full-week generation) | Rejected — correct in spirit but wrong grain; disproportionate cost and a misleading audit record. |
| **C. Factor `solveDay`'s per-slot logic into a reusable `solveMealItems(mealTemplateEntry, targets, candidates, config)` (used both by the existing `buildItems`/`optimizePortions` loop and by a new, narrower entry point), add a `regenerate-meal` operation, and narrate only that one meal** | Directly reuses D1's per-food ceilings and D2's coach addendum (same `narrate()` call, one-meal `NarrativeInput`) | Single transactional unit: one solve, one narrate call, one item-replace within the existing plan-editing transaction pattern (`patchPlan`/`applyPlanOps`) | Matches the ask exactly: one action button per meal                               | **Chosen.**                                                                                        |

**Decision detail (C):**

- **Solver** (`packages/core/src/nutrition/solver.ts`): extract the per-`MealTemplateEntry` body of `buildItems`'s loop plus a scoped `optimizePortions` pass into an exported `solveMeal(entry: MealTemplateEntry, targets: MacroTargets, candidates, config, usedElsewhereThatDay: ReadonlySet<string>)`. `solveDay` becomes a thin wrapper calling `solveMeal` per template entry — a refactor, not new behavior, so `solver.test.ts`'s existing determinism/tolerance assertions must keep passing unmodified as the regression check for "no behavior change from the extraction," with new tests added specifically for `solveMeal` in isolation.
- **Target share for a single-meal regenerate:** reuse that meal's existing `share` from `MEAL_TEMPLATES`, applied against the plan's stored `targets` (`meal_plans.targets`) — not the day's current totals — so the regenerated meal is evaluated against the same tolerance the original generation used, and the day-level `drift` check in `publishPlan`/`driftedDays` (`plans.ts:620-646`) remains meaningful afterward.
- **Module** (`packages/modules/src/nutrition/plans.ts` or a new sibling `plan-meal-regenerate.ts` kept behind the existing `nutrition/index.ts` barrel): `regenerateMeal(db, principal, planId, day, mealIndex)` — loads the plan and its items, re-solves just that slot with a fresh sub-seed (`${plan.generationId}:regen:${day}:${mealIndex}:${nextRegenSequence}`, so repeated regenerates of the same meal are reproducible per attempt but not identical to each other), calls `narrate()` for that single meal with the coach's current effective addendum from D2, replaces that meal's `meal_plan_items` rows within a transaction, and logs a new `feedback_kind` value `REGENERATE_MEAL` (extends the existing `feedbackKindEnum`, `packages/db/src/schema/enums.ts:65-73`) to `ai_feedback_events` — distinct from the existing plan-level `REGENERATE`, so Layer-4 learning and reporting can tell the two apart.
- **API**: new operation on the existing plans route file (`apps/api/src/routes/plans.ts`) — `POST /v1/meal-plans/{planId}/days/{day}/meals/{mealIndex}/regenerate` — not a new route file, since it is a natural extension of the existing plan-editing surface `plans.ts` already owns; add to `packages/contracts/openapi/` per the committed-spec workflow (query via the `gymos-openapi` MCP server before hand-writing types, per `AGENTS.md`'s context-budget rule) rather than hand-inventing the route shape.
- **UI**: one new action per meal section in `plan-editor.tsx`'s meal loop (`plan-editor.tsx:331-376`) — a `GhostButton` ("Regenerate meal") next to the existing "Add food" toggle, editable-gated the same way, calling the new mutation and replacing that meal's `PlanItemCard`s on success. No new confirm dialog needed here: unlike D2's "regenerate everything" (which destroys all manual edits across every client), a single-meal regenerate only discards manual edits within that one meal, which is the same blast radius as an existing `swap`, so it does not warrant a different confirmation bar than the other in-place edits `plan-editor.tsx` already allows without a dialog.

---

### D4 — Per-meal kcal split on the plan screen

No options table: unlike D1–D3 there is no real architectural fork here — the data (`PlanItem.macros.kcal` per item, already tagged with `mealIndex`/`mealSlot`) is already fetched into `plan-editor.tsx`'s `items` prop; this is a pure derived-display addition, not a new fetch, new endpoint, or new business rule. The only actual choice is _where_ to put the number, so that's what's decided below rather than screened through a comparison matrix.

**Decision:**

- **Placement: inline, next to each meal's own section header** — e.g. "Breakfast · 350 kcal" — rather than a separate summary row above the meal list. `plan-editor.tsx` already has a day-level totals `Card` at the top of the screen (`plan-editor.tsx:276-307`); stacking a _second_ summary element above the meal list before the coach even reaches the sections themselves would be redundant with the per-section labels sitting one scroll away, for a feature this simple. The number appears exactly where the coach is already looking (at that meal's items), not in a second place they have to cross-reference. (The example numbers in the request — "Breakfast (350 cal)" — are illustrative, per the request itself; the actual UI keeps the existing codebase convention of labeling the unit "kcal," matching every other calorie figure already on this screen and in `PlanFoodPicker`, `client-hub-plan.tsx`, etc., rather than switching to "cal" for this one label.)
- **Computation: reuse the exact pattern already one line above it in the same file, not a new utility.** `plan-editor.tsx` already computes `dayTotals` by filtering `dayItems` and reducing `macros.kcal` (`plan-editor.tsx:134-142`). D4 adds a small pure helper, `mealKcal(items: readonly PlanItem[], mealIndex: number): number`, colocated in `plan-editor.tsx` next to the existing `daySignature`/`planSwitcherLabel` helpers (`plan-editor.tsx:53-73`), and calls it once per entry inside the existing `meals.map(([mealIndex, mealSlot]) => ...)` loop (`plan-editor.tsx:331`). No new state, no new query, no new prop — it derives from the same `items` array `PlanItemCard` already renders from, so it is always in sync with whatever generated, patched, or (once D3 ships) regenerated the plan, with no separate cache-invalidation path to wire.
- **Component: wrap the existing `SectionTitle` in the already-used `Row` primitive** (`Row` — an `XStack` with `justifyContent: 'space-between'`, `packages/ui/src/components/typography.tsx:42-47`, the same component `client-hub-plan.tsx` already uses to pair a title with a trailing element) rather than adding a new layout primitive: `SectionTitle` on the left, a `Muted` kcal label on the right. No new `packages/ui` component needed.
- **Scope boundary, explicit:** this is presentational only, per `AGENTS.md`'s "restyle presentational UI without changing fetch, routing, or business conditionals" allowance — it reads existing data, computes a sum, and renders text. It does not touch `patchPlan`, `generatePlan`, D3's `regenerateMeal`, or any API contract. It is not gated on D1, D2, or D3 landing first, though it is more useful once D3's "Regenerate meal" button exists (that is when a coach most wants a fast answer to "which meal is over").

---

### D5 — Weekly variety (rotating template week mode)

**Options considered**

| Option                                                                                                               | Variety                                                                                                                                                                                                                    | Grocery/prep practicality                                                                                                                                                                                              | Complexity                                                                                                                                                  | Verdict                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Status quo (`daily_template` only)                                                                                | None — the exact gap this decision exists to close                                                                                                                                                                         | Best (one shopping list, one prep session)                                                                                                                                                                             | None                                                                                                                                                        | Rejected — doesn't address the request.                                                                                                                     |
| B. Fully independent per-day solve (call `solveDay(day, ...)` for all 7 days)                                        | Maximum — every day can differ                                                                                                                                                                                             | Worst — a real coaching client following this would need to shop and prep for up to 7 distinct sets of meals a week, which is a genuine practicality regression for a meal-_plan_ product, not just a taste preference | Lowest of the real options — reuses `solveDay` completely unmodified, zero new logic beyond the loop `solveWeek` already almost has                         | Rejected on product grounds, not technical ones — maximizing variety at the cost of weekly shopping/prep practicality is not what "curated" was asking for. |
| **C. N-day rotating template (solve N distinct "template days," assign them across the 7 real days; default N = 3)** | Real, visible variety (a client sees 3 different days across the week, not 1 or 7) while keeping shopping/prep to N distinct meal sets, matching how working nutrition coaches actually structure weekly plans in practice | Good — bounded, predictable prep load, coach/tenant-configurable                                                                                                                                                       | Slightly more than B: an assignment map from calendar day → template index, still built entirely from repeated `solveDay` calls                             | **Chosen.**                                                                                                                                                 |
| D. Post-hoc random item swaps on the cloned days 2–7, instead of independently re-solving                            | Some, but unprincipled — swaps are not re-optimized against tolerance, so day 2's totals could silently drift outside the tolerance band the original day-1 solve satisfied                                                | N/A                                                                                                                                                                                                                    | Higher than C for less rigor — needs new swap-selection logic _and_ a re-validation pass against tolerance, none of which `solveDay` already gives for free | Rejected — reinvents the solver's own tolerance-checking machinery worse than just calling `solveDay` again.                                                |

**Decision detail (C):**

- **Solver** (`packages/core/src/nutrition/solver.ts`): add `WeekMode = 'daily_template' | 'rotating_template'` (currently an untyped string on `plan_generations.config`, `plans.ts:206-214` — this is also the moment to give it a real type). `solveWeek` gains a `templateCount` parameter (default 3, clamped 1–7): for `rotating_template`, solve `templateCount` distinct days via the existing `solveDay(day, targets, candidates, config)` — each already gets a distinct seed and therefore distinct (still tolerance-respecting) picks, so this is additive looping, not new selection logic — then assign each of the 7 calendar days to one template via a small, deterministic rotation (e.g. `day % templateCount`), identical every time for a given seed. `daily_template` keeps its exact current behavior (`templateCount` effectively 1) — **no behavior change for any tenant that doesn't opt in**, and the existing "7 identical days" test for `daily_template` still passes unmodified.
- **Within-week dedupe pressure:** thread a shared `usedAcrossWeek: Set<string>` through the `templateCount` `solveDay` calls (each template's `buildItems` already tracks a per-day `used` set for its own picks, `solver.ts:318`; extend this to also avoid foods already claimed by an earlier template this week, same pattern `GROUP_FALLBACKS` and the existing `used` set already use — de-prioritize, do not hard-exclude, so a small candidate pool never goes infeasible over this). This is what actually delivers "3 different-_feeling_" days rather than 3 templates that all still gravitate to the same top-ranked chicken breast.
- **Config surface** (`packages/modules/src/tenancy/manifest.ts`): add `aiConfig.weekMode` (`'daily_template' | 'rotating_template'`, default `'daily_template'`) and `aiConfig.templateCount` (default 3, only meaningful when `weekMode: 'rotating_template'`). Default stays `daily_template` deliberately — flipping the _behavior_ of every already-onboarded tenant's future generations without an explicit opt-in is a rollout decision for whoever manages tenant config, not something this ADR should force silently. New tenants (or the pilot tenant, if desired) can default to `rotating_template` from day one.
- **`generatePlan`** (`packages/modules/src/nutrition/plans.ts`): reads `manifest.aiConfig.weekMode`/`templateCount` and passes them to `solveWeek`; `plan_generations.config.weekMode` is now the typed value, not a hardcoded literal string.
- **Tests:** `solver.test.ts:424-433`'s "7 identical days" assertion is the regression check that `daily_template` is unchanged — it must keep passing verbatim. New cases for `rotating_template`: exactly `templateCount` distinct day-signatures across the week (not 7, not 1), every day still within the configured kcal/macro tolerance, and full determinism (same seed ⇒ same rotation, same templates).

---

### D6 — Structured positive food preferences (+ fix the slot-ranking bug in the same pass)

**Options considered**

| Option                                                                                                                                                                                                                                                                                                                               | Reuses existing infra                                                                                                                                                                                                                       | Storage grain                                                                                  | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. New `RESTRICTION_TYPES` value `PREFERRED` + a `preferred:<foodId>` code, handled in `candidatesForRestrictions` exactly like the existing `dislike:<foodId>` convention (`foods.ts:115-123`), stored in the same `client_dietary_profiles`/`dietary_restrictions` tables, edited through the same `DietaryChips`-style UI pattern | Maximum — same table, same versioned-profile write path (`dietary.ts`), same query function, same UI component family                                                                                                                       | Per-client (mirrors how dislikes already work — one client's fish preference is not another's) | **Chosen.**                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| B. New dedicated `client_food_preferences` table                                                                                                                                                                                                                                                                                     | None — duplicates the versioned-profile infrastructure `client_dietary_profiles` already provides (version, `is_active`, restriction rows) for a feature that is structurally identical to an existing one, just with the opposite polarity | Per-client                                                                                     | Rejected — this is exactly the "no parallel utility" case; a second table for "same shape, opposite sign" data is duplication, not separation of concerns.                                                                                                                                                                                                                                                                                                          |
| C. Coach-level (not client-level) structured preference, applying across every one of a coach's clients                                                                                                                                                                                                                              | N/A                                                                                                                                                                                                                                         | Per-coach                                                                                      | Rejected for _this_ decision, not forever — a coach's client-agnostic "house style" is a real, different idea (closer to Layer 4's ranking signals than to a per-client dietary profile), but it's a separate mechanism from "this specific client likes fish," and bundling both risks solving neither well. Flagged as a plausible follow-up, out of scope here.                                                                                                  |
| D. Reuse D2's free-text coach instructions above, parsed for food-preference keywords                                                                                                                                                                                                                                                | None reusable safely                                                                                                                                                                                                                        | N/A                                                                                            | Rejected — that channel is explicitly Layer-3/narration-only by design (see D2's "Scope of coach authority" bullet above); turning free text into a structured Layer-2 selection signal needs either an LLM (reintroducing exactly what D1's option D and this ADR's whole premise already ruled out, one level removed) or a brittle keyword heuristic. Positive preferences need a real structured input, not text-mining of a field designed for something else. |

**Decision detail (A):**

- **Restriction type** (`packages/core/src/nutrition/restrictions.ts`): add `'PREFERRED'` to `RESTRICTION_TYPES`, mirrored in the DB enum (`packages/db/src/schema/enums.ts:35-43`) and `RestrictionInput` (`packages/modules/src/nutrition/dietary.ts:7-18`) — additive to an existing union, not a breaking change to any existing caller. Canonical code shape `preferred:<foodUuid>`, following the exact ad-hoc convention `dislike:<foodUuid>` already uses (neither is part of the `ALLERGENS`/`RELIGIOUS_CODES` registries — both are handled directly in `candidatesForRestrictions`).
- **Selection** (`packages/modules/src/nutrition/foods.ts`, `candidatesForRestrictions`): a new loop parallel to the existing `dislike:` loop (`foods.ts:115-123`) collects `preferred:<foodId>` codes into a `Set<string>`. In the final scoring pass (`foods.ts:188-203`, where `rankScore` is currently computed from `food_rankings` + the variety-lookback penalty), foods in that set get a rank **boost** (e.g. `rankScore *= 1.5`, tunable) — symmetric to, and reusing the same scoring pipeline as, the existing `recentFoodIds.has(r.id) ? rankScore *= 0.55` penalty one line below it. A preference boosts a food's odds of being picked when it's otherwise eligible; it never bypasses an allergen or hard exclusion — the SQL hard-filter still runs first, unchanged, so a "preferred" food a client is also allergic to is still filtered out before this ever runs.
- **Bug fix, same pass:** the ranking query in this same function currently loads `food_rankings` **by goal only** and folds every slot into one number via `Math.max` (`foods.ts:142-154`), discarding the slot dimension the table's own primary key `(foodId, slot, goal)` was designed to carry. Since D6 is already restructuring how `rankScore` is assembled in this exact code path, fix this at the same time: carry a per-slot rank (e.g. a small `Map<MealSlot, number>` per food, or query keyed by `(foodId, slot)` and pass the map through to `CandidateFood`), and have `effectiveRank(food, group, slot)` (`solver.ts:281-285`, which already receives `slot` and does nothing with it beyond the hardcoded olive-oil check) actually look up the slot-specific score instead of a flattened one. This is a pre-existing bug, not new scope — it's called out here because leaving it in place while _adding_ a new boost mechanism to the same scoring step would compound confusion about which of two overlapping signals is doing what.
- **UI** (`packages/app/src/features/dietary/`): a third `DietaryChips`-style section alongside the existing "Severe allergies" and "Preferences & restrictions" cards in the dietary profile editor (`packages/app/src/features/dietary/index.tsx`) and its onboarding-wizard counterpart (`step-diet.tsx`) — "Preferred foods," populated from the catalog (reuse `useFoods`/`PlanFoodPicker`'s search pattern to pick specific foods, rather than the fixed allergen/religious code lists `DietaryChips` currently renders, since "preferred food" is an open-ended pick from the catalog, not a fixed vocabulary). `client-hub-plan.tsx`'s dietary-profile summary card gains a corresponding "Preferred" chip row alongside its existing "Severe allergens" and "Preferences & restrictions" rows.
- **Tests:** a `candidatesForRestrictions` unit test (there is none today — this function has zero direct test coverage, only indirect coverage through generation-level integration tests) asserting a `preferred:<foodId>` code raises that food's `rankScore` relative to an otherwise-identical unpreferred food in the same group, and that a preference never overrides a hard allergen exclusion for the same food. A separate case for the slot-ranking fix: two `food_rankings` rows for the same food at different slots with different scores must produce different `rankScore`s when the candidate pool is built for each slot, not one flattened value.

**Considered and deferred, not silently dropped: macro-fit-aware candidate scoring.** An earlier draft also considered scoring `pickCandidate`'s initial picks by how well a food's macro _ratio_ (protein:fat:carb) fits the day's remaining macro gap, not just by group rank + a random top-3 pick — today, macro balance is entirely reactive, handled only by `optimizePortions`'s post-hoc portion hill-climb (`solver.ts:247-276`), never by which foods get picked in the first place. Deferred because the existing tolerance tests (`solver.test.ts:232-420`) show the current reactive approach already converges within tolerance today — there is no evidence of a live quality problem this would fix, only a plausible one. Adding a macro-fit score is real algorithmic complexity (a distance/similarity function, a new weight to tune against `rankScore` and D6's preference boost, a wider combinatorial space to keep deterministic and tested) for a benefit that is speculative until D5/D6 ship and someone can observe whether plans still feel imbalanced in a way the hill-climb doesn't already fix. Revisit if, after D5/D6 ship, coach feedback or `ai_feedback_events` data shows day totals routinely landing at the edge of tolerance rather than comfortably inside it, or a specific pattern of "technically balanced but oddly composed" days. Building it now, speculatively, would be the over-engineering this initiative has otherwise been careful to avoid.

---

### D7 — Honor meal calorie shares (and let the coach set them)

**Status: Accepted 2026-08-23** — filed after a generated plan showed **759 kcal breakfast on a 2000 kcal target** when the coach had asked for 10% (200 kcal). Two independent defects, one product gap:

1. **`solveDay` never enforced meal shares.** `buildItems` sizes each meal to `targets.kcal * meal.share`, then `optimizePortions` hill-climbs _every item in the day against the day-level targets_. The cheapest way to close a protein/kcal gap is often to inflate breakfast (eggs + oats are small, dense, and unconstrained once the day score is the only score). 759 / 2000 ≈ 38% is that drift — the day total can still land inside ±5% while breakfast is 35% over its 28% default, let alone a coach-set 10%.
2. **"Breakfast = 10%" in the Meal AI Planner instructions box cannot change portions.** D2 is narration-only by design (ADR-0001 Layer 3). Free text is the wrong channel for a number the solver has to honor.
3. **No structured place existed to set the split.** `MEAL_TEMPLATES` hardcodes 28/47/25 (3 meals). The Tools page documents those defaults. There was nothing a coach could edit.

**Decision:**

- **Enforce per-meal kcal bands in `solveDay`.** After the initial share-sized build, the day-level hill-climb _rejects_ a move that would worsen a meal's distance from its share once that meal is outside `share ± MEAL_SHARE_TOLERANCE_PCT` (15%, not the day-level 5% — 5% of an 8% snack is a 9 kcal window, smaller than one 0.5-unit almond step). Meal-share error is **not** added to the day score: weighting it starved protein/fat/carbs balancing and made default 3/5-meal days `SOLVER_INFEASIBLE` even when the day total was inside ±5%. Day success remains day-level `withinTolerance` only — a snack a few grams off its share does not fail the day. Day-level macro balancing is preserved — we do not force each meal to carry a proportional slice of protein/fat/carbs (a 10% breakfast that is carb-forward with protein later is a normal coaching pattern).
- **Structured share overrides, not parsed prose.** `SolverConfig.mealShares?: Partial<Record<MealSlot, number>>` (fractions 0–1, each slot clamped 5–80%). `resolveMealTemplate(mealCount, overrides)` applies them: a lone `breakfast: 0.10` keeps 10% and redistributes the remaining 90% across lunch/dinner in the same _relative_ proportion as the default. All-slots-set normalizes to 1. Logged on `plan_generations.config.mealShares`.
- **Persisted on the existing `coach_meal_instructions` row** as `meal_share_overrides` jsonb (nullable = use template defaults). Same versioning/audit path as the narration text; same GET/PUT `/v1/me/meal-instructions`. Omitting `mealShares` on PUT keeps the previous split so D2 clients that only send `text` do not wipe it.
- **UI:** Settings → Meal AI Planner gains a "Calorie split" card (Breakfast / Lunch / Dinner / Snack percent fields) _above_ the narration editor, with copy that states the instructions box cannot change portions. The plan editor meal header shows `actual/target kcal` so a 759-vs-200 miss is visible without adding numbers by hand.
- **Not in scope:** parsing "breakfast 10%" out of free text; per-client (vs per-coach) splits; forcing proportional macros per meal.

**Smoke test:** `solveDay` on a 2000 kcal / 3-meal day with `mealShares: { breakfast: 0.1 }` produces breakfast totals under 300 kcal (the reported 759 case fails this). Catalog min-portions cannot always hit a 190–210 window on a 200 kcal breakfast; 15% of 200 is 30 kcal, and one egg is 70+ kcal. `resolveMealTemplate(3, { breakfast: 0.1 })` leaves breakfast at 0.10 and lunch/dinner summing to 0.90. PUT `/v1/me/meal-instructions` with `{ mealShares: { breakfast: 0.1 } }` round-trips and the next `generatePlan` writes that split onto `plan_generations.config` and the breakfast items stay under 20% of daily kcal.

## Consequences

**Easier:**

- Coaches get realistic multi-item meals without any change to how they read a plan (still `meal_plan_items` rows, still the same `PlanItemCard` UI).
- Per-coach narration preference is now a first-class, audited, versioned setting instead of an engineering ticket to edit a shared prompt file.
- Single-meal iteration no longer requires either full-week regeneration (losing all edits) or slow manual food-by-food editing.
- D1's `solveMeal` extraction is reused directly by D3 — no duplicated solving logic between full-plan and single-meal generation.
- A coach can tell at a glance which meal is heavy or light before deciding whether to regenerate it (D3) or edit it manually — D4 turns D3's button from "regenerate and hope" into an informed decision, at essentially zero added engineering cost.
- A generated week visibly varies (3 distinct days by default, not 1 repeated 7 times or 7 fully independent shopping lists) without touching Layer 3 or any LLM call.
- A coach or client can steer selection toward specific foods, not just away from them — closing the asymmetry where exclusion has always been possible but preference never was — and the `food_rankings` table's slot dimension finally does what its schema was designed for.

**Harder:**

- `packages/core`'s solver picks up a new per-food data dependency (`maxUnits`) that must be seeded thoughtfully for every catalog food, and a new bounded-expansion code path that widens the solver's test surface (`solver.test.ts` grows meaningfully; CODEOWNERS review load on `packages/core` increases for this PR).
- A new persistence/version/audit surface (`coach_meal_instructions`) is one more coach-scoped table to reason about in tenancy/RLS review, on top of `client_dietary_profiles`' existing pattern.
- Prompt composition (`narrate.ts`) now has three layers to reason about (global → tenant pack → coach) instead of two; prompt-quality regressions become slightly harder to attribute to a single layer, which argues for logging which layers were non-empty on each `plan_generations.validation` row (cheap addition, should be included in D2's implementation, not deferred).
- The "regenerate all plans" bulk action in D2 is explicitly _not_ fully specified here (see rollout note) — it is a real dependency that must be resolved (against actual worker/queue infrastructure) before D2's UI can safely offer that button, or D2 ships with that button disabled/deferred and only "save without regenerating" live.
- `REGENERATE_MEAL` is a new enum value — Postgres enum additions are forward-only (no easy removal), so it should land in the same migration as D3's other schema needs, reviewed once.
- `sanitizeInstructionsText` is new hand-written text-processing logic with its own edge cases (Unicode ranges, markdown-subset stripping order, length-cap interaction with multi-byte characters) — it needs dedicated unit tests for adversarial input (raw `<script>` tags, zero-width-obfuscated text, oversized strings) as part of D2's test surface. This is separate from, and does not get folded into, the existing guardrail tests in `packages/ai`, which cover LLM _output_, not coach-authored _input_.
- `solveWeek` and `candidatesForRestrictions` both grow in complexity and CODEOWNERS review surface for D5/D6 — the same `packages/core`/`packages/modules` review bar as D1, not a lighter one just because no LLM is involved.
- `weekMode`/`templateCount` is a new tenant-config knob that needs a rollout decision (who defaults to `rotating_template`, and when, if ever, the default changes for already-onboarded tenants) — this ADR intentionally leaves that decision to whoever owns tenant config, rather than picking silently.
- A `PREFERRED` restriction type sitting in the same enum as severe-allergy and medical restriction types needs care in any UI or report that lists "restrictions" generically — a preference is not a restriction in the safety sense, and anything that currently assumes every `dietary_restrictions` row is an exclusion (e.g. `restrictedAllergenCodes`, `dietary.ts`) must be checked to confirm it still only reads exclusion-type rows and ignores `PREFERRED` ones; this is a real regression risk worth an explicit test, not an assumption.
- Two independent "nudge the rank score" mechanisms now exist (D6's preference boost, the existing variety-lookback penalty) plus the slot-ranking fix changing a third — `candidatesForRestrictions`' scoring step needs a clear, tested order of operations (hard filters → slot-aware base rank → preference boost → variety penalty, applied in that stated order) so the interaction between them is deliberate, not emergent.

## Alternatives Considered

Captured per-decision above (D1/D2/D3/D5/D6 comparison tables) rather than duplicated here. Alternatives that were rejected outright across multiple decisions, not just one option row: putting any nutrition or selection decision under Layer 3's control (violates [ADR-0001](0001-hybrid-ai-nutrition.md) unconditionally — D1's option D, and D5/D6's rejection of an LLM-driven variety/preference mechanism, are the same category of mistake at different scope, regardless of which problem it would appear to solve), and introducing a new client-only or DOM-only UI primitive to solve a formatting/interaction need that the existing Tamagui/RN component set can solve with a small, first-party addition instead (`gymos-boundaries`: no raw `<div>`, and `surgical-changes`: no new dependency without a concrete reason).

## Implementation guidance

| If shipping | Changes                                                                                                                                                                                                                                                                  | Depends on                                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 only     | `packages/core` (solver + tests), one migration + seed backfill (`packages/db`)                                                                                                                                                                                          | Nothing else in this ADR                                                                                                                                                                                                |
| D2 only     | `packages/db` (new table + migration), `packages/modules/src/nutrition`, `apps/api/src/routes/coach-instructions.ts`, `packages/ai/src/narrate.ts` (thread-through only, no prompt-shape change), `packages/app/src/features/settings/meal-instructions/`, new web route | D1 not required, but ships more usefully after D1 (coach instructions are about narration quality; portion realism is the more visible fix)                                                                             |
| D3 only     | `packages/core` (solver extraction — do this _as_ D1's refactor, not twice), `packages/modules`, `apps/api/src/routes/plans.ts`, OpenAPI spec update, `packages/app/src/features/plan/plan-editor.tsx`                                                                   | **Blocked on D1's `solveMeal` extraction** — do not implement D3's regenerate path against the current monolithic `buildItems`/`optimizePortions` loop and refactor later; extract once, in D1, and have D3 consume it. |
| D4 only     | `packages/app/src/features/plan/plan-editor.tsx` only — one small pure helper plus wrapping the existing `SectionTitle` in `Row`                                                                                                                                         | Nothing else in this ADR — ships independently, any time, including before D1–D3.                                                                                                                                       |
| D5 only     | `packages/core` (solver), `packages/modules/src/tenancy` (manifest schema), `packages/modules/src/nutrition/plans.ts` (thread-through), tests                                                                                                                            | Nothing else in this ADR                                                                                                                                                                                                |
| D6 only     | `packages/core/src/nutrition/restrictions.ts`, `packages/db` (enum, no new table), `packages/modules/src/nutrition/{dietary,foods}.ts`, `packages/app/src/features/dietary/`, tests                                                                                      | Nothing else in this ADR — independent of D1–D5                                                                                                                                                                         |

**Required outputs for each implementation PR** (per `AGENTS.md`): a `docs/specs/` entry (e.g. `fr-c10-meal-portion-realism.md`, `fr-c11-coach-meal-instructions.md`, `fr-c12-meal-regenerate.md`, `fr-c14-meal-kcal-split.md`, `fr-c15-weekly-variety.md`, `fr-c16-positive-food-preferences.md` — numbered continuing from the existing `fr-c*` spec series; `fr-c13` is already used by [ADR-0016](0016-coach-custom-foods.md)) with Given/When/Then acceptance criteria, a test that fails before the change, and scoped `pnpm lint` / `pnpm typecheck` / `pnpm test` for every touched package (full workspace run if `packages/contracts` changes, which D3 requires; D4/D5/D6 do not touch `packages/contracts`). For D2 specifically, the acceptance criteria must include save-time sanitization cases: a submitted instruction containing raw HTML/script-like markup, zero-width or control Unicode characters, or a string past the length cap is neutralized/truncated before it is persisted and before it can reach `narrate.ts` — proven by a test that saves an adversarial input and asserts on the stored `plain_text`/`rich_text`, not just on final LLM output. For D6, acceptance criteria must include that a `PREFERRED` code never overrides a hard allergen exclusion. The concrete smoke test for each decision, verifying the user-visible behavior end-to-end rather than an internal implementation detail, is specified below.

## Smoke tests

One smoke test per decision, each written against real conventions already in the repo (`vitest`, the `food()` fixture helper in `solver.test.ts`, the PGlite + `buildApp` harness in `apps/api/tests/pilot-loop.test.ts` / `tenant-isolation.test.ts`). These are the target tests for the implementing PR to add — not retrofits of existing passing tests — and each asserts on observable behavior a coach would notice, not on an internal code path, so a reviewer can tell the feature actually works without reading the implementation.

### D1 — no meal, in any slot, puts an unrealistic amount of one food in a single item

Deliberately covers breakfast **and** lunch/dinner in the same test file, so the fix is proven against the general mechanism (every `MEAL_TEMPLATES` slot shares the same `buildItems`/`optimizePortions` code path), not re-litigated only against the specific breakfast/egg complaint that surfaced it. Add to `packages/core/src/nutrition/solver.test.ts`:

```ts
describe('D1 smoke test — realistic portion ceilings across every meal slot', () => {
  const staple = food(
    'roti',
    'staple',
    { kcal: 264, proteinG: 9, fatG: 4, carbsG: 51, fiberG: 7 },
    { servingUnits: [{ name: 'roti', grams: 40 }], allowedSlots: slots('breakfast', 'lunch') },
  );
  const beverage = food(
    'coffee',
    'beverage',
    { kcal: 2, proteinG: 0.1, fatG: 0, carbsG: 0, fiberG: 0 },
    { servingUnits: [{ name: 'cup', grams: 240 }], allowedSlots: slots('breakfast') },
  );
  const vegetable = food(
    'palak',
    'vegetable',
    { kcal: 41, proteinG: 2.9, fatG: 0.4, carbsG: 6.8, fiberG: 2.4 },
    { servingUnits: [{ name: 'serving', grams: 150 }], allowedSlots: slots('lunch', 'dinner') },
  );
  const eggWithCeiling = food(
    'egg',
    'protein',
    { kcal: 155, proteinG: 13, fatG: 11, carbsG: 1.1, fiberG: 0 },
    {
      servingUnits: [{ name: 'piece', grams: 50 }],
      allowedSlots: slots('breakfast'),
      name: 'Egg (whole, boiled)',
      maxUnits: 3, // this ADR's realistic ceiling — 3 pieces / 150g, not UNIT_MAX's 8
    },
  );
  const chickenWithCeiling = food(
    'chicken',
    'protein',
    { kcal: 165, proteinG: 31, fatG: 3.6, carbsG: 0, fiberG: 0 },
    {
      servingUnits: [{ name: 'piece', grams: 120 }],
      allowedSlots: slots('lunch', 'dinner'),
      name: 'Chicken breast (skinless, cooked)',
      maxUnits: 3, // 3 pieces / 360g, not UNIT_MAX's 8 (960g)
    },
  );

  const denseTarget: MacroTargets = {
    kcal: 4800,
    proteinG: 260,
    fatG: 160,
    carbsG: 420,
    fiberG: 40,
  };

  it('breakfast: spreads a large kcal share across multiple eggs instead of one oversized item', () => {
    const result = solveDay(
      1,
      denseTarget,
      [eggWithCeiling, staple, beverage, chickenWithCeiling, vegetable],
      {
        ...DEFAULT_SOLVER_CONFIG,
        mealCount: 3,
        seed: 'smoke-d1-portion-ceiling-breakfast',
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const breakfast = result.value.meals.find((m) => m.slot === 'breakfast');
    const eggItems = breakfast?.items.filter((i) => i.foodId === 'egg') ?? [];
    expect(eggItems.length).toBeGreaterThan(0);
    for (const item of eggItems) {
      expect(item.portionGrams).toBeLessThanOrEqual(150); // never the old UNIT_MAX ceiling of 400g
    }
  });

  it('lunch: the same ceiling mechanism applies to a lunch protein, not just breakfast', () => {
    const result = solveDay(
      1,
      denseTarget,
      [eggWithCeiling, staple, beverage, chickenWithCeiling, vegetable],
      {
        ...DEFAULT_SOLVER_CONFIG,
        mealCount: 3,
        seed: 'smoke-d1-portion-ceiling-lunch',
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lunch = result.value.meals.find((m) => m.slot === 'lunch');
    const chickenItems = lunch?.items.filter((i) => i.foodId === 'chicken') ?? [];
    expect(chickenItems.length).toBeGreaterThan(0);
    for (const item of chickenItems) {
      expect(item.portionGrams).toBeLessThanOrEqual(360); // never the old UNIT_MAX ceiling of 960g
    }
  });
});
```

### D2 — coach instructions are sanitized before they ever reach the model, and take precedence over the tenant pack

Two smoke tests: the sanitizer in isolation (`packages/modules/src/nutrition/coach-instructions.test.ts`), and prompt composition in isolation (`packages/ai/src/narrate.test.ts` or alongside `ai.test.ts`).

```ts
// packages/modules/src/nutrition/coach-instructions.test.ts
import { describe, expect, it } from 'vitest';
import { sanitizeInstructionsText } from './coach-instructions';

describe('D2 smoke test — sanitizeInstructionsText', () => {
  it('strips HTML tags and event-handler attributes', () => {
    const dirty = 'Prefer <img src=x onerror="steal()"> high-protein breakfasts';
    expect(sanitizeInstructionsText(dirty)).not.toMatch(/[<>]/);
    expect(sanitizeInstructionsText(dirty)).toContain('high-protein breakfasts');
  });

  it('strips zero-width and control characters used to hide text', () => {
    const dirty = 'Focus on lean\u200B\u0000 proteins';
    expect(sanitizeInstructionsText(dirty)).toBe('Focus on lean proteins');
  });

  it('hard-caps length so one bad input cannot balloon prompt cost', () => {
    expect(sanitizeInstructionsText('a'.repeat(5000)).length).toBeLessThanOrEqual(2000);
  });
});
```

```ts
// packages/ai/src/narrate.test.ts (new case)
import { describe, expect, it, vi } from 'vitest';
import { narrate } from './narrate';

describe('D2 smoke test — coach addendum appended last, after sanitization', () => {
  it('includes the coach instructions in the outgoing system message, after the base prompt', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  days: [{ meals: [{ name: 'Egg & Roti', prepNotes: '' }] }],
                }),
              },
            },
          ],
        }),
      ),
    );

    await narrate(
      {
        locale: 'en',
        cuisineContext: 'pakistani',
        verbosity: 'standard',
        days: [
          { day: 1, meals: [{ slot: 'breakfast', items: [{ foodName: 'Egg', grams: 100 }] }] },
        ],
      },
      {
        mode: 'local',
        baseUrl: 'http://llm.local',
        model: 'test-model',
        // Already sanitized by saveInstructions before it ever reaches this call — see coach-instructions.ts.
        coachAddendum: 'Prefer high-protein breakfasts. Keep prep under 10 minutes.',
      },
      { expectedMealCount: 1 },
    );

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      messages: { role: string; content: string }[];
    };
    const system = body.messages.find((m) => m.role === 'system')?.content ?? '';
    expect(system).toContain('Prefer high-protein breakfasts');
    // The coach's words come after the base "JSON only / never emit numbers" instructions, never before.
    expect(system.indexOf('Respond with JSON only')).toBeLessThan(
      system.indexOf('Prefer high-protein breakfasts'),
    );
  });
});
```

### D3 — regenerating one meal never touches any other meal, day, or plan

Add to (or alongside) `apps/api/tests/pilot-loop.test.ts`'s harness, after a plan already exists for the seeded demo client:

```ts
describe('D3 smoke test — regenerate one meal in isolation', () => {
  it('changes only the targeted day/meal and logs REGENERATE_MEAL', async () => {
    const before = await req(`/v1/meal-plans/${planId}`);
    const beforeItems = ((await before.json()) as { items: PlanItem[] }).items;
    const untouchedBefore = beforeItems.filter((i) => !(i.day === 2 && i.mealIndex === 0));

    const res = await req(`/v1/meal-plans/${planId}/days/2/meals/0/regenerate`, { method: 'POST' });
    expect(res.status).toBe(200);

    const after = await req(`/v1/meal-plans/${planId}`);
    const afterItems = ((await after.json()) as { items: PlanItem[] }).items;
    const untouchedAfter = afterItems.filter((i) => !(i.day === 2 && i.mealIndex === 0));

    // Every other day/meal is byte-identical — a coach's other edits are never touched.
    expect(untouchedAfter).toEqual(untouchedBefore);

    const regenerated = afterItems.filter((i) => i.day === 2 && i.mealIndex === 0);
    expect(regenerated.length).toBeGreaterThan(0);

    const events = await db
      .select()
      .from(schema.aiFeedbackEvents)
      .where(eq(schema.aiFeedbackEvents.planId, planId));
    expect(events.some((e) => e.kind === 'REGENERATE_MEAL')).toBe(true);
  });
});
```

### D4 — each meal section shows its own kcal total, and it matches the sum of that meal's items

No PGlite/API harness needed — this is a pure function over data already shaped like `PlanItem`. Add alongside `plan-editor.tsx` (e.g. `plan-editor.test.ts`, a new file — the pattern already exists for co-located pure helpers, just not yet exercised by a test in this particular file):

```ts
// packages/app/src/features/plan/plan-editor.test.ts
import { describe, expect, it } from 'vitest';
import { mealKcal } from './plan-editor';

const item = (mealIndex: number, kcal: number) => ({
  id: `i-${mealIndex}-${kcal}`,
  day: 1,
  mealIndex,
  mealSlot: 'breakfast' as const,
  mealName: 'Breakfast',
  foodId: 'food-1',
  portionGrams: 100,
  macros: { kcal, proteinG: 0, fatG: 0, carbsG: 0 },
  macrosSource: 'food_db' as const,
  prepNotes: null,
  position: 0,
});

describe('D4 smoke test — mealKcal', () => {
  it('sums only the items belonging to the given meal, ignoring other meals', () => {
    const items = [item(0, 200), item(0, 150), item(1, 500)];
    expect(mealKcal(items, 0)).toBe(350); // breakfast: 200 + 150, not influenced by lunch's 500
    expect(mealKcal(items, 1)).toBe(500);
  });

  it('returns 0 for a meal with no items rather than throwing', () => {
    expect(mealKcal([], 0)).toBe(0);
  });
});
```

### D5 — a generated week visibly varies, deterministically

```ts
// packages/core/src/nutrition/solver.test.ts
describe('D5 smoke test — rotating_template week mode', () => {
  it('produces exactly templateCount distinct days, not 1 and not 7, deterministically', () => {
    const config = {
      ...DEFAULT_SOLVER_CONFIG,
      seed: 'smoke-d5-rotation',
      weekMode: 'rotating_template' as const,
      templateCount: 3,
    };
    const first = solveWeek(TARGETS, CANDIDATES, config);
    const second = solveWeek(TARGETS, CANDIDATES, config);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    const signature = (day: (typeof first.value)[number]) =>
      day.meals.flatMap((m) => m.items.map((i) => `${i.foodId}:${i.portionGrams}`)).join('|');
    const distinctDays = new Set(first.value.map(signature));
    expect(distinctDays.size).toBe(3); // exactly templateCount, not 1 (old default) and not 7

    // Same seed + config ⇒ identical week, every time.
    expect(second.value.map(signature)).toEqual(first.value.map(signature));

    // Every day still meets the same tolerance the daily_template mode already guarantees.
    for (const day of first.value) {
      expect(Math.abs(day.totals.kcal - TARGETS.kcal) / TARGETS.kcal).toBeLessThanOrEqual(0.05);
    }
  });
});
```

### D6 — a preferred food ranks higher, but never overrides an allergen exclusion

```ts
// packages/modules/src/nutrition/foods.test.ts (new file; candidatesForRestrictions has no direct test today)
describe('D6 smoke test — positive food preferences boost, never bypass, allergen exclusion', () => {
  it('ranks a preferred food above an equivalent unpreferred one in the same group', async () => {
    const withPreference = await candidatesForRestrictions(
      db,
      [{ type: 'PREFERRED', code: 'preferred:chicken-food-id' }],
      manifest,
      {},
    );
    const chicken = withPreference.find((f) => f.id === 'chicken-food-id');
    const otherProtein = withPreference.find(
      (f) => f.foodGroup === 'protein' && f.id !== 'chicken-food-id',
    );
    expect(chicken?.rankScore ?? 0).toBeGreaterThan(otherProtein?.rankScore ?? 0);
  });

  it('never lets a preference override a hard allergen exclusion for the same food', async () => {
    const result = await candidatesForRestrictions(
      db,
      [
        { type: 'ALLERGY_SEVERE', code: 'allergen:egg' },
        { type: 'PREFERRED', code: 'preferred:egg-food-id' },
      ],
      manifest,
      {},
    );
    expect(result.some((f) => f.id === 'egg-food-id')).toBe(false); // still excluded — preference is not a bypass
  });
});
```

## Blocking issues to resolve before implementation starts

1. D2's "regenerate all plans" bulk action needs a real job/worker decision (synchronous fan-out is not acceptable past a handful of clients) — resolve against whatever the nightly `learning.ranking-refresh` job runs on, before building the UI's "Regenerate all" path.
2. D1's default `maxUnits` backfill needs a nutrition-literate pass over the seed catalog (the seed data is already flagged in-repo as needing exactly this kind of review: `packages/db/src/seed-data/foods.ts:24-28`) — do not ship silent, guessed per-food ceilings as the permanent values without that review.
3. D3's new route needs an OpenAPI contract entry authored against the committed spec via the `gymos-openapi` MCP server, not hand-invented, per the context-budget rule.
4. D5's default `weekMode` and rollout plan for existing tenants needs an explicit answer from whoever owns tenant config — this ADR does not pick a default rollout timeline, only the mechanism and a safe (unchanged-behavior) default.
5. D6's `PREFERRED` restriction type must be audited against every existing consumer of `dietary_restrictions` (`restrictedAllergenCodes`, any report or export that lists "restrictions") to confirm none of them silently treat a preference as an exclusion or vice versa — this is a correctness requirement, not a nice-to-have, given it shares a table with severe-allergy data.
