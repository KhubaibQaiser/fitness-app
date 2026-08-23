# ADR-0016: Coach-owned custom foods ("My Foods")

- **Status**: Proposed
- **Date**: 2026-08-23
- **Phase**: AI-native nutrition track ([ADR-0001](0001-hybrid-ai-nutrition.md) lineage), same track as [ADR-0015](0015-meal-ai-planner-portion-realism-and-coach-overrides.md). Not a `CLAUDE.md` P1–P4 alignment phase — this is a net-new capability, not a re-skin.

This is a planning ADR. No source files change in this PR. It is a separate arc of work from ADR-0015 and does not block or get blocked by it, with one soft coordination note (see Consequences).

Scope, locked by the two open questions this ADR resolves before any code:

1. **Visibility**: a coach's custom food is **private to that coach** — visible only in that coach's own catalog search/solver candidate pool, not shared at outlet or org level.
2. **Authoring model**: **direct manual entry** — the coach types the same shape of data the existing seed catalog already has (name, food group, allergens, per-100g macros, serving units), not a computed composite recipe built from other foods.

## Context

The `foods` table (`packages/db/src/schema/nutrition.ts:91-117`) is a single flat, global catalog — 34 curated rows (`packages/db/src/seed-data/foods.ts`) with **no tenant, outlet, or coach scoping column at all**, unlike every other nutrition-adjacent table (`meal_plans`, `plan_generations`, `client_dietary_profiles`) which [ADR-0003](0003-shared-schema-tenant-isolation.md) already backfilled with `outlet_id`. There is no create/update/delete path anywhere in the stack today:

- **RBAC**: only `foods.read` exists (`packages/core/src/rbac/actions.ts:22`), granted `org` scope to every staff role (`packages/core/src/rbac/matrix.ts:27,55,70,94,103`). No `foods.write`.
- **API**: exactly one route, `GET /v1/foods` → `listFoods` (`apps/api/src/routes/plans.ts:17-36`).
- **Module**: `packages/modules/src/nutrition/foods.ts` exports only `listFoods`, `candidatesForRestrictions`, `foodsById` — all reads.
- **DB writes**: only the seed script (`packages/db/src/seed.ts:100-121`, `source: 'curated'`) and one backfill migration.
- The `food_source` enum already has an unused third value, `'tenant'` (`packages/db/src/schema/enums.ts:45`), and an unused `verified` boolean, always `false` (`packages/db/src/seed.ts:115`, never read anywhere) — both look like placeholders for exactly this kind of feature, never wired up.

Coaches want to add their own recipes (e.g. a specific home-cooked dish with known macros) so the Layer 2 solver can place them in AI-generated plans and the coach can select them manually in the plan editor, the same way any catalog food works today.

Two existing precedents this design leans on directly:

- **RBAC already has a `self` scope level** built for exactly this shape of resource — `ResourceRef.ownerUserId === scope.userId` (`packages/core/src/rbac/scope.ts:36-37`) — but it has **no real usage today**. The one production call site, `notification.read` on `GET /v1/notifications` (`apps/api/src/routes/notifications.ts:22-23`), passes the caller's own `userId` as the resource ref by construction (the list query is already self-scoped, so the check is trivially true) — it never fetches a target resource's actual owner and compares. This feature is the first case that needs the real check: fetch the food, compare its owner to the caller.
- **Coach-entered nutrition numbers are already trusted elsewhere** — `meal_plan_items.macrosSource: 'coach_override'` lets a coach hand-type kcal/macros for a single plan item today, audited but unblocked ([ADR-0001](0001-hybrid-ai-nutrition.md), [ADR-0014](0014-coach-calorie-override.md)'s "warn, don't block" precedent). A custom food is the same trust decision made once, at the catalog level, instead of per plan-item.

## Decision

Add a coach-owned, privately-scoped extension to the existing food catalog. No new table — `foods` gains an owner column and an archive column; a new module, route file, RBAC action, and Settings sub-route provide CRUD; the two hot read paths (`listFoods`, `candidatesForRestrictions`) gain a visibility filter.

### Ownership model — options considered

| Option | Fits existing schema | RBAC fit | Query cost | Verdict |
|---|---|---|---|---|
| A. New `coach_foods` table, joined into candidate queries | Clean separation, but duplicates every column `foods` already has (`per100g`, `allergenTags`, `allowedSlots`, `dietaryFlags`, serving units) | Needs its own scope wiring, doubles the solver's candidate-fetch code path (two tables to union) | Extra join per generation | Rejected — the "no parallel utility" rule applies to tables as much as functions; `foods` already has every column a custom food needs. |
| B. `foods.source = 'tenant'` (repurpose the existing unused enum value) + an `owner_user_id` column | Reuses the placeholder value | Misleading — `'tenant'` reads as "shared with the whole tenant," which contradicts the private-to-coach decision this ADR is resolving | None | Rejected on naming grounds only — the mechanism (one shared table, one owner column) is right, the label is wrong for what it now means. |
| **C. Add `foods.source = 'coach'` (extend the enum) + `foods.created_by_user_id` (nullable, `references users.id`) + `foods.archived_at` (nullable)** | Reuses the exact `foods` shape; `'tenant'` stays reserved and unused for a genuinely tenant-shared catalog later, which is a different feature this ADR does not build | `created_by_user_id` is exactly the `ownerUserId` the existing `self` scope level was built to compare against | One extra indexed column filter, same query shape | **Chosen.** |

**Schema detail:**

- Migration (new file in `packages/db/migrations/`, next available number after whichever of ADR-0015's migrations lands first): `ALTER TYPE food_source ADD VALUE 'coach'` (forward-only, same caveat ADR-0015 already notes for its own new enum value — land it deliberately, once); `ALTER TABLE foods ADD COLUMN created_by_user_id uuid REFERENCES users(id)`; `ALTER TABLE foods ADD COLUMN archived_at timestamptz`; `CREATE INDEX foods_owner_idx ON foods (created_by_user_id) WHERE created_by_user_id IS NOT NULL`.
- **No hard delete.** `meal_plan_items.food_id` is a `NOT NULL` FK to `foods.id` (`packages/db/src/schema/nutrition.ts:189-191`) — a coach's already-used custom food cannot be removed without breaking every historical plan that references it. `archived_at` (soft-delete) follows the same shape as `coach_notes.deletedAt` (`packages/db/src/schema/tenancy.ts:194`) and `client_dietary_profiles.isActive` — archived foods stay joinable for old plans, disappear from new search/candidate results.

### Visibility enforcement — where it must land

Both existing read paths in `packages/modules/src/nutrition/foods.ts` get an additive `opts` field — no breaking change to either function's existing callers:

- `listFoods(db, opts: { q?, group?, limit?, viewerUserId })` — the general catalog search backing `GET /v1/foods`, `useFoods`, and `PlanFoodPicker` (`packages/app/src/features/plan/plan-food-picker.tsx`). Adds `and(isNull(foods.archivedAt), or(ne(foods.source, 'coach'), eq(foods.createdByUserId, viewerUserId)))`. This is the one change that makes a coach's custom food show up automatically in the existing "Add food" / "swap" pickers — no picker code changes needed beyond a "Custom" badge (see UI below).
- `candidatesForRestrictions(db, restrictions, manifest, opts: { ..., coachUserId })` — the Layer 2 solver's candidate pool (`packages/modules/src/nutrition/foods.ts:75-204`). Same visibility condition, plus the same `archivedAt` exclusion. `generatePlan` (`packages/modules/src/nutrition/plans.ts:65-71`) already receives `principal: { userId, coachId, outletId }` — wiring `principal.userId` through as `coachUserId` is a one-line change at the existing call site (`plans.ts:235-239`), not a new plumbing path.
- Without a `viewerUserId`/`coachUserId`, both functions must exclude every `source = 'coach'` row by default (fail closed on the visibility filter, not fail open) — every real call site always has an authenticated principal, so this only matters as a defensive default.

### Immediate eligibility, no review gate

A custom food is usable by the solver and pickers as soon as it is saved — no `verified`-style approval step. This mirrors the existing `coach_override` trust model rather than inventing a new one: a coach who can already hand-type kcal/macros for one plan item can already do more damage per edit than a mistyped catalog entry that stays confined to their own clients. The dormant `verified` boolean is left untouched — this feature does not repurpose it, to avoid coupling an unused, unrelated flag to a decision it was never designed for.

**One soft safety addition, non-blocking:** at save time, warn (do not block) if entered `per100g.kcal` is inconsistent with the entered macros by more than a wide tolerance (`kcal` vs. `4×proteinG + 4×carbsG + 9×fatG`, e.g. >20% off) — catches an obvious typo (a missing digit, a decimal shifted) without gatekeeping legitimate values. Same "warn, don't block" shape as [ADR-0015](0015-meal-ai-planner-portion-realism-and-coach-overrides.md) D2's numeric-claim save-time warning.

### RBAC

New action `foods.write` (`packages/core/src/rbac/actions.ts`). Matrix grants (`packages/core/src/rbac/matrix.ts`):

- `COACH: 'foods.write': 'self'` — the actual, correct use of the `self` scope level: routes that mutate a specific food must first fetch it and pass `{ ownerUserId: food.createdByUserId }` to `authorize()`, comparing the row's real owner against the caller, not a trivially-true self-reference. This is a genuinely new pattern for the codebase (see Context) — worth a short comment at the call site since it is the first of its kind, so the next self-scoped resource copies the correct shape.
- `ORG_ADMIN` / `SUPER_ADMIN` / `PLATFORM_OPERATOR` (`ALL_ORG`, `matrix.ts:7-32`): `'foods.write': 'org'` — housekeeping ability to archive an inappropriate custom food without needing coach cooperation, consistent with every other `*.manage`-style org-wide grant already in `ALL_ORG`.
- `OUTLET_ADMIN` / `COACH_MANAGER`: no `foods.write` grant — they can already `foods.read` at `org` scope, but per the "private to that coach" decision, an outlet admin does not get edit rights over a coach's personal recipe by default. Flagged as a call to confirm in review, not a default I am silently picking past the decision already made (visibility is about *other coaches*, not about admin oversight, and the ADR-0003 tenancy model already treats `OUTLET_ADMIN` as having outlet-wide operational visibility over coach-scoped resources like `coach_notes`) — if review wants outlet admins to have `foods.write: 'outlet'` for oversight, that is a one-line matrix change, not a schema change.

### Module (`packages/modules/src/nutrition/coach-foods.ts`, exported from the existing `nutrition/index.ts` barrel)

- `createCoachFood(db, principal, input)` — validates required fields (non-empty name; `foodGroup` one of the existing `FoodGroup` union; `per100g` all finite, non-negative; at least one serving unit with `grams > 0`; `allowedSlots` a non-empty subset of `MealSlot`; `costTier` 1–3; `prepTimeMin > 0`), inserts the `foods` row (`source: 'coach'`, `createdByUserId: principal.userId`) plus its `food_serving_units` rows in one transaction, `writeAudit`-logs `food.create` (same helper `plan-ops.ts` and `plans.ts` already use).
- `listMyFoods(db, coachUserId, opts?: { includeArchived? })` — the Settings "My Foods" list.
- `updateCoachFood(db, principal, foodId, patch)` — re-fetches the food, returns a typed error if `createdByUserId !== principal.userId` and the caller is not an org-scoped actor (defense in depth on top of the route-level `authorize()` call, same layering `patchPlan`/`applyPlanOps` already use for plan ownership checks); replaces serving units wholesale on edit rather than diffing them (input set is always small, matches how `plan-ops.ts` already treats portion edits as whole-value replacements, not deltas).
- `archiveCoachFood(db, principal, foodId)` — same ownership check, sets `archivedAt`, audit-logs `food.archive`.

### API (new `apps/api/src/routes/coach-foods.ts`, registered in `apps/api/src/app.ts` alongside the other `register*Routes` calls — never appended inline per `AGENTS.md`)

- `GET /v1/me/foods` — `authorize(c, 'foods.read')` (already org-granted, no new check needed for reading your own list), returns `listMyFoods`.
- `POST /v1/me/foods` — `authorize(c, 'foods.write', { ownerUserId: principal.userId })` (self-authoring a new row — no existing owner to compare against, so this one case *is* the trivial self-reference, correctly).
- `PATCH /v1/me/foods/:foodId`, `POST /v1/me/foods/:foodId/archive` — fetch the food first, then `authorize(c, 'foods.write', { ownerUserId: food.createdByUserId })` against the row's real owner.
- OpenAPI entries authored against the committed spec via the `gymos-openapi` MCP server before hand-writing shapes, per the `AGENTS.md` context-budget rule — not invented ad hoc in this ADR.
- `packages/contracts/src/types.ts` gains `Food.source` (widen from implicit to `'usda' | 'curated' | 'coach' | 'tenant'`) and `Food.isMine: boolean` (server-computed convenience flag so the picker doesn't need to compare IDs against the current principal); `packages/contracts/src/client.ts` gains `foods.mine()`, `foods.create()`, `foods.update()`, `foods.archive()`.

### UI

**Where it lives:** Settings → "My Foods", a second sub-route alongside [ADR-0015](0015-meal-ai-planner-portion-realism-and-coach-overrides.md) D2's "Meal AI Planner" — same convention (`apps/web/app/(coach)/settings/foods/page.tsx`, a button on the flat `SettingsScreen`), not the `Tools → Meals` explainer (`packages/app/src/features/meal-composition/`), which is deliberately static/read-only ("Coach explainer — Layer 2 meal templates and slot rules," `meal-composition/index.tsx:25`) and would be the wrong place to bolt on catalog CRUD.

**Form pattern** — mirrors the existing goal-creation form shell exactly (`packages/app/src/features/goal-form/`: local `value`/`errors` state, `useFocusChain`, `Card` + `PageHeader`, `StickyFormFooter` with `OutlineButton` Cancel + `PrimaryButton` Save disabled while pending), reusing established primitives rather than inventing new ones:

| Field | Component | Precedent |
|---|---|---|
| Name / Urdu name | `FormField` | `goal-fields.tsx` |
| Food group | `SegmentedControl` (protein/staple/vegetable/fruit/dairy/fat/snack/beverage) | `goal-fields.tsx` |
| Allowed slots | Toggleable `GhostButton` chip row (breakfast/lunch/dinner/snack) | Same chip-toggle pattern as `DietaryChips` (`packages/app/src/features/dietary/dietary-chips.tsx`), a small dedicated set since the codes/labels differ from restriction chips |
| Allergens | Toggleable chip row over the canonical `ALLERGENS` list (`packages/core/src/nutrition/restrictions.ts`) | Same pattern; stores bare codes (`'egg'`, `'milk'`, …) matching how `foods.allergenTags` is already stored in seed data |
| Halal / vegetarian / vegan / contains-beef / contains-pork / contains-alcohol | One `SegmentedControl` (halal status: HALAL/HARAM/QUESTIONABLE/NA) + toggle chips for the five booleans | New but built from the same two primitives already used everywhere else |
| Per-100g kcal / protein / fat / carbs / fiber | `FormField` with `inputMode="numeric"`/`"decimal"` | Exact precedent: `plan-item-card.tsx:140-167`'s macro-override fields |
| Cost tier | `SegmentedControl` (`$`/`$$`/`$$$`) | `goal-fields.tsx` |
| Prep time (min) | `FormField` numeric | — |
| Serving units | A small repeatable name+grams row list (add/remove, minimum one row) | The one genuinely new list-editing UI in this feature — no existing repeatable-field-list component to reuse; kept intentionally small (name `FormField` + grams `FormField` per row, a `GhostButton` "+ Add another unit") rather than a generic list-builder abstraction, since nothing else in the app needs one yet |

- List screen: cards per custom food (name, group badge, kcal/100g, an "Archived" `Badge` when applicable), a `PrimaryButton` "+ New custom food" into the create form (same component handles create and edit, `isEditing` flag, exactly like `goal-form/index.tsx`).
- Archive action: `DangerButton` with the same tap-twice-to-confirm micro-pattern the flat `SettingsScreen` already uses for "Sign out of all devices" (`confirmAll` local state, `settings/index.tsx:178-195`) — no new confirm-dialog primitive needed, consistent with ADR-0015's finding that the codebase has none and building one is out of scope.
- `PlanFoodPicker` (`packages/app/src/features/plan/plan-food-picker.tsx`): add a small `Badge` ("Custom") next to results where `food.isMine` is true, so a coach recognizes their own recipes when adding/swapping items on a client's plan — the only change needed there, since visibility is already handled server-side by the `listFoods` filter.
- **Nice-to-have, not required for a first cut:** when `PlanFoodPicker`'s search returns nothing, a "Can't find it? Create a custom food" link that opens Settings → My Foods with the typed query pre-filled as the new food's name. Flagged as a UX polish item for the implementing PR to include if time allows, not a blocking requirement of this ADR.

## Consequences

**Easier:**

- Coaches get a real answer to "the catalog doesn't have my client's actual breakfast" without an engineering ticket to add a row to `FOOD_SEED`.
- No schema duplication — one table, one visibility filter, reused everywhere `foods` is already read.
- The `self` RBAC scope level goes from a documented-but-unexercised concept to a real, correctly-implemented example (fetch-then-compare), which future coach-owned resources can copy.

**Harder:**

- `listFoods` and `candidatesForRestrictions` both need a new required-in-practice `opts` field threaded through every call site (`plans.ts`, any future caller) — omitting it fails closed (no coach foods visible) rather than open, which is the safe direction, but it is still a new parameter every future caller must remember.
- `food_source` gains a second forward-only enum value in this initiative (`'coach'`, alongside [ADR-0015](0015-meal-ai-planner-portion-realism-and-coach-overrides.md)'s planned `REGENERATE_MEAL` feedback-kind value) — both should land deliberately, reviewed once each, not casually.
- A coach's mistyped custom-food macros now compound across every future plan generated for their clients that selects it, not just one plan item — the same class of risk as `coach_override` today, but now catalog-level and longer-lived until corrected. Mitigated only by the non-blocking kcal/macro-consistency warning at save time, not a hard gate.
- **Soft coordination with [ADR-0015](0015-meal-ai-planner-portion-realism-and-coach-overrides.md) D1** (solver portion realism, still Proposed): a custom food with an unusually calorie-dense per-100g value and no realistic serving ceiling can reproduce the exact "oversized single item" problem D1 exists to fix, just from a new entry point. Neither ADR blocks the other — if D1 ships first, custom foods automatically inherit its per-food ceiling default (computed from `servingUnits[0].grams`, which every custom food already supplies); if this ships first, custom foods behave exactly as today's catalog foods do under the current `UNIT_MAX = 8` rule, which is the existing (imperfect but not worsened) status quo. No schema coupling is required now; call this out again at whichever PR lands second so the default-ceiling formula is applied retroactively to already-created custom foods, not just newly-seeded catalog rows.

## Alternatives Considered

Captured inline in the "Ownership model" comparison table above. Two alternatives rejected outright, not just as one option among several: a composite-recipe authoring model (explicitly out of scope — the second locked answer for this ADR is direct manual entry, matching the existing catalog shape, not ingredient composition with derived macros), and any form of shared/outlet-wide default visibility (explicitly out of scope — the first locked answer is private-to-coach; outlet/org sharing is a plausible future extension of the same `source`/owner columns, via widening the visibility filter, not a reason to redesign the schema now).

## Implementation guidance

Single PR is reasonable here (unlike ADR-0015's three-way split) — this is one cohesive vertical slice (schema → RBAC → module → route → UI). It does touch `packages/core/src/rbac` (two small, additive changes: one new action, a few matrix entries — no solver/nutrition-math code), so CODEOWNERS review is still required, but the surface area and risk are far smaller than ADR-0015's solver work. Suggested sequencing within the PR:

1. Migration + schema (`packages/db`): enum value, two columns, index.
2. RBAC (`packages/core/src/rbac`): new action, matrix grants.
3. Module (`packages/modules/src/nutrition`): `coach-foods.ts` + the two `opts` additions to `foods.ts` + the one-line `principal.userId` thread-through in `plans.ts`.
4. API (`apps/api/src/routes/coach-foods.ts`) + OpenAPI spec update.
5. UI (`packages/app/src/features/settings/coach-foods/` + new web/mobile route + `PlanFoodPicker` badge).

**Required outputs** (per `AGENTS.md`): a `docs/specs/` entry (e.g. `fr-c13-coach-custom-foods.md`, continuing the existing `fr-c*` series alongside the three ADR-0015 introduces) with Given/When/Then acceptance criteria covering at minimum: a coach can create, edit, and archive their own food; a second coach's plan generation and food search never see it (extend `apps/api/tests/tenant-isolation.test.ts` — already the exact PGlite + seeded-second-org pattern needed for a "must never appear in the other coach's roster/candidates" assertion, or add a sibling `coach-foods-isolation.test.ts` following its structure); an archived food disappears from search/candidates but historical plan items referencing it still resolve; the allergen post-check still catches a restricted allergen on a custom food exactly as it does on a catalog food. Scoped `pnpm lint` / `pnpm typecheck` / `pnpm test` for `packages/core`, `packages/db`, `packages/modules`, `packages/contracts`, `apps/api`, `packages/app` (full workspace run, since `packages/contracts` changes).
