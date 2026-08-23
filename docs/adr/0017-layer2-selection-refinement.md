# ADR-0017: Layer 2 selection refinement — weekly variety and structured food preferences (deterministic, no LLM)

- **Status**: Proposed
- **Date**: 2026-08-23
- **Phase**: AI-native nutrition track ([ADR-0001](0001-hybrid-ai-nutrition.md) lineage), same track as [ADR-0015](0015-meal-ai-planner-portion-realism-and-coach-overrides.md) and [ADR-0016](0016-coach-custom-foods.md). Separate arc of work from both — this is about the sophistication of Layer 2's _selection_ algorithm, not portion realism, narration, or catalog ownership.

This is a planning ADR. No source files change in this PR.

## Context

This ADR closes a discussion, not opens a new complaint: the request was "the AI should determine the food split per meal, curated around calories, allergens, and dietary flags (halal, etc.), to produce a balanced plan." The response established that this is already what Layers 1–2 do today, deterministically — and that moving those decisions into an LLM was rejected, both by [ADR-0001](0001-hybrid-ai-nutrition.md) and by the always-applied nutrition-safety rule for this repo (`Layer 3: meal names and prep notes only`), because it would trade a testable, reproducible, allergen-safe pipeline for an unreliable one, for no proven quality gain. The agreed conclusion: **Layer 2 needs to be more refined** — the deterministic side needs to get smarter, not hand its job to a model.

Concretely, three real gaps in Layer 2 today limit how "curated" a plan feels, independent of anything Layer 3 does:

1. **Zero day-to-day variety within a week.** `solveWeek` (`packages/core/src/nutrition/solver.ts:427-458`) solves day 1 once and **shallow-clones** the result to days 2–7 verbatim. Every day in a generated week has the exact same foods and portions. This is a deliberate, documented ADR-0001 choice ("Per-day variety is coach-authored via edits, not solver randomness") — but it is very likely the single biggest reason a generated plan reads as mechanical rather than curated: a coach or client opening day 4 sees the identical breakfast as day 1, every week, until someone manually edits it. Notably, the _mechanism_ for day-specific variety already exists and is unused: `solveDay(day, targets, candidates, config)` seeds its internal `rand()` with `${config.seed}:day:${day}:attempt:${attempt}` (`solver.ts:371`), so calling it independently per day already produces different (but still deterministic, tolerance-respecting) picks — `solveWeek` simply never calls it for days 2–7.
2. **No positive food-preference signal — only exclusions.** `RESTRICTION_TYPES` (`packages/core/src/nutrition/restrictions.ts:31-39`) is `ALLERGY_SEVERE | ALLERGY_MILD | INTOLERANCE | DISLIKE | RELIGIOUS | ETHICAL | MEDICAL` — every one of these _removes_ a food from consideration (allergens and `dislike:<foodId>` hard-filter in SQL, `foods.ts:115-123`). There is no analogous way to say "this client responds well to fish" or "lean toward chicken over red meat" that would _boost_ a food's chance of being picked instead of merely not excluding it. The only existing positive signal, `varietyLookback`'s de-prioritization of recently-used foods (`foods.ts:157-192`), only ever pushes selection _away_ from something, never toward it, and only reads a client's own prior plan history — it has no within-week effect either, since `solveWeek` never independently solves days 2–7 in the first place.
3. **`food_rankings`' slot dimension is collected but then discarded at load time.** The table is correctly keyed `(foodId, slot, goal)` (`packages/db/src/schema/nutrition.ts:262-276` — a food can rank differently at breakfast vs. dinner), but `candidatesForRestrictions` loads rankings **by goal only** and folds every slot into one number per food via `Math.max` (`foods.ts:142-154`), before `pickCandidate` (which _does_ receive `slot` as a parameter, `solver.ts:287-308`) ever sees it. The per-slot signal the schema was built to carry never reaches the function that could use it.

None of these are safety gaps — they're quality/personalization gaps, entirely inside the deterministic, seeded, testable Layer 2 boundary. Fixing them stays inside that boundary; nothing here proposes any new call to an LLM, and nothing here touches `packages/ai`.

## Decision

Ship two changes, both `packages/core`/`packages/modules` (CODEOWNERS-gated, same as ADR-0015's D1 and D3 — this is not a lighter review bar just because it isn't about an LLM):

- **D1** — Weekly variety via a rotating-template week mode, opt-in alongside the existing `daily_template` default.
- **D2** — Structured positive food preferences, reusing the existing dietary-restriction storage and query path, plus a "while we're here" fix to the slot-dimension bug in item 3 above (both touch the same function).

One idea was evaluated and **deliberately deferred**, not silently dropped — see "Considered and deferred" below.

---

### D1 — Weekly variety (rotating template week mode)

**Options considered**

| Option                                                                                                               | Variety                                                                                                                                                                                                                    | Grocery/prep practicality                                                                                                                                                                                              | Complexity                                                                                                                                                  | Verdict                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Status quo (`daily_template` only)                                                                                | None — the exact gap this ADR exists to close                                                                                                                                                                              | Best (one shopping list, one prep session)                                                                                                                                                                             | None                                                                                                                                                        | Rejected — doesn't address the request.                                                                                                                     |
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

### D2 — Structured positive food preferences (+ fix the slot-ranking bug in the same pass)

**Options considered**

| Option                                                                                                                                                                                                                                                                                                                               | Reuses existing infra                                                                                                                                                                                                                       | Storage grain                                                                                  | Verdict                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. New `RESTRICTION_TYPES` value `PREFERRED` + a `preferred:<foodId>` code, handled in `candidatesForRestrictions` exactly like the existing `dislike:<foodId>` convention (`foods.ts:115-123`), stored in the same `client_dietary_profiles`/`dietary_restrictions` tables, edited through the same `DietaryChips`-style UI pattern | Maximum — same table, same versioned-profile write path (`dietary.ts`), same query function, same UI component family                                                                                                                       | Per-client (mirrors how dislikes already work — one client's fish preference is not another's) | **Chosen.**                                                                                                                                                                                                                                                                                                                                                                              |
| B. New dedicated `client_food_preferences` table                                                                                                                                                                                                                                                                                     | None — duplicates the versioned-profile infrastructure `client_dietary_profiles` already provides (version, `is_active`, restriction rows) for a feature that is structurally identical to an existing one, just with the opposite polarity | Per-client                                                                                     | Rejected — this is exactly the "no parallel utility" case; a second table for "same shape, opposite sign" data is duplication, not separation of concerns.                                                                                                                                                                                                                               |
| C. Coach-level (not client-level) structured preference, applying across every one of a coach's clients                                                                                                                                                                                                                              | N/A                                                                                                                                                                                                                                         | Per-coach                                                                                      | Rejected for _this_ ADR, not forever — a coach's client-agnostic "house style" is a real, different idea (closer to Layer 4's ranking signals than to a per-client dietary profile), but it's a separate mechanism from "this specific client likes fish," and bundling both into one decision risks solving neither well. Flagged as a plausible follow-up, out of scope here.          |
| D. Reuse [ADR-0015](0015-meal-ai-planner-portion-realism-and-coach-overrides.md) D2's free-text coach instructions, parsed for food-preference keywords                                                                                                                                                                              | None reusable safely                                                                                                                                                                                                                        | N/A                                                                                            | Rejected — that channel is explicitly Layer-3/narration-only by design; turning free text into a structured Layer-2 selection signal needs either an LLM (reintroducing exactly what this whole discussion just ruled out, one level removed) or a brittle keyword heuristic. Positive preferences need a real structured input, not text-mining of a field designed for something else. |

**Decision detail (A):**

- **Restriction type** (`packages/core/src/nutrition/restrictions.ts`): add `'PREFERRED'` to `RESTRICTION_TYPES`, mirrored in the DB enum (`packages/db/src/schema/enums.ts:35-43`) and `RestrictionInput` (`packages/modules/src/nutrition/dietary.ts:7-18`) — additive to an existing union, not a breaking change to any existing caller. Canonical code shape `preferred:<foodUuid>`, following the exact ad-hoc convention `dislike:<foodUuid>` already uses (neither is part of the `ALLERGENS`/`RELIGIOUS_CODES` registries — both are handled directly in `candidatesForRestrictions`).
- **Selection** (`packages/modules/src/nutrition/foods.ts`, `candidatesForRestrictions`): a new loop parallel to the existing `dislike:` loop (`foods.ts:115-123`) collects `preferred:<foodId>` codes into a `Set<string>`. In the final scoring pass (`foods.ts:188-203`, where `rankScore` is currently computed from `food_rankings` + the variety-lookback penalty), foods in that set get a rank **boost** (e.g. `rankScore *= 1.5`, tunable) — symmetric to, and reusing the same scoring pipeline as, the existing `recentFoodIds.has(r.id) ? rankScore *= 0.55` penalty one line below it. A preference boosts a food's odds of being picked when it's otherwise eligible; it never bypasses an allergen or hard exclusion — the SQL hard-filter still runs first, unchanged, so a "preferred" food a client is also allergic to is still filtered out before this ever runs.
- **Bug fix, same pass:** the ranking query in this same function currently loads `food_rankings` **by goal only** and folds every slot into one number via `Math.max` (`foods.ts:142-154`), discarding the slot dimension the table's own primary key `(foodId, slot, goal)` was designed to carry. Since D2 is already restructuring how `rankScore` is assembled in this exact code path, fix this at the same time: carry a per-slot rank (e.g. a small `Map<MealSlot, number>` per food, or query keyed by `(foodId, slot)` and pass the map through to `CandidateFood`), and have `effectiveRank(food, group, slot)` (`solver.ts:281-285`, which already receives `slot` and does nothing with it beyond the hardcoded olive-oil check) actually look up the slot-specific score instead of a flattened one. This is a pre-existing bug, not new scope — it's called out here because leaving it in place while _adding_ a new boost mechanism to the same scoring step would compound confusion about which of two overlapping signals is doing what.
- **UI** (`packages/app/src/features/dietary/`): a third `DietaryChips`-style section alongside the existing "Severe allergies" and "Preferences & restrictions" cards in the dietary profile editor (`packages/app/src/features/dietary/index.tsx`) and its onboarding-wizard counterpart (`step-diet.tsx`) — "Preferred foods," populated from the catalog (reuse `useFoods`/`PlanFoodPicker`'s search pattern to pick specific foods, rather than the fixed allergen/religious code lists `DietaryChips` currently renders, since "preferred food" is an open-ended pick from the catalog, not a fixed vocabulary). `client-hub-plan.tsx`'s dietary-profile summary card gains a corresponding "Preferred" chip row alongside its existing "Severe allergens" and "Preferences & restrictions" rows.
- **Tests:** a `candidatesForRestrictions` unit test (there is none today — this function has zero direct test coverage, only indirect coverage through generation-level integration tests) asserting a `preferred:<foodId>` code raises that food's `rankScore` relative to an otherwise-identical unpreferred food in the same group, and that a preference never overrides a hard allergen exclusion for the same food. A separate case for the slot-ranking fix: two `food_rankings` rows for the same food at different slots with different scores must produce different `rankScore`s when the candidate pool is built for each slot, not one flattened value.

---

### Considered and deferred: macro-fit-aware candidate scoring

An earlier draft of this ADR also considered scoring `pickCandidate`'s initial picks by how well a food's macro _ratio_ (protein:fat:carb) fits the day's remaining macro gap, not just by group rank + a random top-3 pick — today, macro balance is entirely reactive, handled only by `optimizePortions`'s post-hoc portion hill-climb (`solver.ts:247-276`), never by which foods get picked in the first place.

**Deferred, not rejected:** the existing tolerance tests (`solver.test.ts:232-420`) show the current reactive approach already converges within the configured kcal/macro tolerance today — there is no evidence of a live quality problem this would fix, only a plausible one. Adding a macro-fit score is real algorithmic complexity (a distance/similarity function, a new weight to tune against `rankScore` and the preference boost D2 just added, a wider combinatorial space to keep deterministic and tested) for a benefit that is speculative until D1 and D2 ship and someone can observe whether plans still feel imbalanced in a way the hill-climb doesn't already fix. Revisit if, after D1/D2 ship, coach feedback or `ai_feedback_events` data shows day totals routinely landing at the edge of tolerance rather than comfortably inside it, or shows a specific pattern of "technically balanced but oddly composed" days (e.g. every protein-group pick happening to be the fattiest option available). Building it now, speculatively, would be the over-engineering this initiative has otherwise been careful to avoid.

## Consequences

**Easier:**

- A generated week visibly varies (3 distinct days by default, not 1 repeated 7 times or 7 fully independent shopping lists) without touching Layer 3 or any LLM call.
- A coach or client can steer selection toward specific foods, not just away from them — closing the asymmetry where exclusion has always been possible but preference never was.
- The `food_rankings` table's slot dimension finally does what its schema was designed for.
- Both changes are fully covered by the same kind of deterministic, seeded tests the solver already has — no new class of non-reproducibility is introduced anywhere.

**Harder:**

- `solveWeek` and `candidatesForRestrictions` both grow in complexity and CODEOWNERS review surface — this is the same `packages/core`/`packages/modules` review bar as ADR-0015's D1, not a lighter one just because no LLM is involved.
- `weekMode`/`templateCount` is a new tenant-config knob that needs a rollout decision (who defaults to `rotating_template`, and when, if ever, the default changes for already-onboarded tenants) — this ADR intentionally leaves that decision to whoever owns tenant config, rather than picking silently.
- A `PREFERRED` restriction type sitting in the same enum as severe-allergy and medical restriction types needs care in any UI or report that lists "restrictions" generically — a preference is not a restriction in the safety sense, and anything that currently assumes every `dietary_restrictions` row is an exclusion (e.g. `restrictedAllergenCodes`, `dietary.ts`) must be checked to confirm it still only reads exclusion-type rows and ignores `PREFERRED` ones; this is a real regression risk worth an explicit test, not an assumption.
- Two independent "nudge the rank score" mechanisms now exist (D2's preference boost, the existing variety-lookback penalty) plus the slot-ranking fix changing a third — `candidatesForRestrictions`' scoring step needs a clear, tested order of operations (hard filters → slot-aware base rank → preference boost → variety penalty, applied in that stated order) so the interaction between them is deliberate, not emergent.

## Alternatives Considered

Captured inline per decision above. One alternative rejected across both decisions: doing either of these via a call to an LLM (e.g. "ask the model to pick a more varied day," or "ask the model to weight preferences") — this is the same category of mistake [ADR-0015](0015-meal-ai-planner-portion-realism-and-coach-overrides.md) D1's Option D and this session's earlier exchange already rejected, and it applies identically here: variety and preference-weighting are both precisely the kind of structured, checkable, reproducible computation Layer 2 already exists to own.

## Implementation guidance

| If shipping | Changes                                                                                                                                                                              | Depends on                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| D1 only     | `packages/core` (solver), `packages/modules/src/tenancy` (manifest schema), `packages/modules/src/nutrition/plans.ts` (thread-through), tests                                        | Nothing else in this ADR                     |
| D2 only     | `packages/core/src/nutrition/restrictions.ts`, `packages/db` (enum + no new table), `packages/modules/src/nutrition/{dietary,foods}.ts`, `packages/app/src/features/dietary/`, tests | Nothing else in this ADR — independent of D1 |

**Required outputs** (per `AGENTS.md`): a `docs/specs/` entry per decision (e.g. `fr-c15-weekly-variety.md`, `fr-c16-positive-food-preferences.md` — continuing the `fr-c*` series; `fr-c13` is [ADR-0016](0016-coach-custom-foods.md)'s, `fr-c10`–`fr-c12`/`fr-c14` are [ADR-0015](0015-meal-ai-planner-portion-realism-and-coach-overrides.md)'s) with Given/When/Then acceptance criteria, a test that fails before the change, and scoped `pnpm lint` / `pnpm typecheck` / `pnpm test` for every touched package.

**Smoke tests** (target tests for the implementing PR, in the same spirit as ADR-0015's — asserting user-visible behavior, not internals):

```ts
// packages/core/src/nutrition/solver.test.ts — D1
describe('D1 smoke test — rotating_template week mode', () => {
  it('produces exactly templateCount distinct days, not 1 and not 7, deterministically', () => {
    const config = {
      ...DEFAULT_SOLVER_CONFIG,
      seed: 'smoke-d1-rotation',
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

```ts
// packages/modules/src/nutrition/foods.test.ts — D2 (new file; candidatesForRestrictions has no direct test today)
describe('D2 smoke test — positive food preferences boost, never bypass, allergen exclusion', () => {
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

**Blocking issues to resolve before implementation starts:**

1. D1's default `weekMode` and rollout plan for existing tenants needs an explicit answer from whoever owns tenant config — this ADR does not pick a default rollout timeline, only the mechanism and a safe (unchanged-behavior) default.
2. D2's `PREFERRED` restriction type must be audited against every existing consumer of `dietary_restrictions` (`restrictedAllergenCodes`, any report or export that lists "restrictions") to confirm none of them silently treat a preference as an exclusion or vice versa — this is a correctness requirement, not a nice-to-have, given it shares a table with severe-allergy data.
