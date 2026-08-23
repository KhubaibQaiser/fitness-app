# ADR-0015: Meal-plan portion realism, coach-level generation instructions, and per-meal regeneration

- **Status**: Proposed
- **Date**: 2026-08-23
- **Phase**: AI-native nutrition track ([ADR-0001](0001-hybrid-ai-nutrition.md) lineage), not a `CLAUDE.md` P1–P4 alignment phase. The one net-new UI surface this introduces (Settings → Meal AI Planner) must still consume the P1 token/component set — it is new functionality, not a re-skin, so it does not belong to P1 itself.

This is a planning ADR. No source files change in this PR. It sequences three follow-on implementation PRs, each scoped to its own review gate.

## Context

Three coach-reported problems, all rooted in the Layer 2 solver and the coach-facing plan workflow:

1. **Unrealistic single-item portions.** The solver (`packages/core/src/nutrition/solver.ts`) sizes each pattern slot independently: it takes the meal's kcal share, divides by the number of adjustable pattern groups, and converts to serving units, clamped only by `UNIT_MAX = 8` native servings per item (`solver.ts:217-219`, `solver.ts:329-341`). There is no ceiling tied to what a food realistically looks like on a plate. For "Egg (whole, boiled)" (`servingUnits: [{ name: 'piece', grams: 50 }]`, `packages/db/src/seed-data/foods.ts:121-131`), 8 units is 8 whole eggs — 400g — in a single breakfast slot, and the post-build hill-climb (`optimizePortions`, `solver.ts:247-276`) can push any adjustable item to that ceiling if it is the cheapest way to close a kcal gap. The mechanism generalizes: any food with a small per-100g kcal density and a request that pushes `perItemKcal` (`targets.kcal * meal.share / adjustableCount`) high gets one oversized item instead of the meal being composed of more items. This is a Layer 2 defect, not a Layer 3 one — Layer 3 (`packages/ai`) only names meals and writes prep notes and never sees or emits portion numbers (`packages/ai/src/prompts/meal-narrative.v1.ts:7-12`, `packages/ai/src/types.ts:38-55`); fixing it anywhere in Layer 3 would violate [ADR-0001](0001-hybrid-ai-nutrition.md)'s hard boundary and is not on the table.
2. **No coach-level fine-tuning of meal narration.** [ADR-0001](0001-hybrid-ai-nutrition.md) fixed the global system prompt as a versioned code artifact (`MEAL_NARRATIVE_SYSTEM`, `packages/ai/src/prompts/meal-narrative.v1.ts:7-12`) plus an optional tenant-wide cuisine pack (`packages/ai/src/prompts/packs.ts`, `resolvePromptPack`). Neither is coach-scoped. Individual coaches have preferences the global prompt should not encode (protein-forward breakfasts, specific prep styles, phrasing tone) and today the only way to express them is editing the shared code prompt or the tenant manifest — both wrong-grained and both requiring an engineering change per preference.
3. **No single-meal regeneration.** `generatePlan` (`packages/modules/src/nutrition/plans.ts:65-401`) always solves and narrates the full week from a fresh day-1 template (`solveWeek`, `solver.ts:431-459`). The only per-item control today is `patchPlan` → `applyPlanOps` (`packages/modules/src/nutrition/plan-ops.ts`) — manual `set-portion` / `swap` / `add` / `remove`, one item at a time. A coach who dislikes just breakfast on day 2 has no faster path than editing every item by hand or regenerating the entire week (`plan-editor.tsx:223-272`) and losing every other edit.

All three land in code owned by `packages/core` and/or `packages/ai`, which `CODEOWNERS` requires a human (`@KhubaibQaiser`) to review — this ADR proposes, it does not pre-approve.

## Decision

Ship as three independently reviewable PRs, in this order (2 is not blocked by 1; 3 depends on 1's solver refactor):

- **D1** — Solver: realistic per-food serving ceilings + dynamic item-count expansion (`packages/core`).
- **D2** — Coach-level generation instructions, stored per-coach, layered under the global/tenant prompt, surfaced at Settings → Meal AI Planner (`packages/db`, `packages/modules`, `apps/api`, `packages/app`).
- **D3** — Per-meal regenerate action, reusing D1's solver entry point and D2's effective prompt (`packages/core`, `packages/modules`, `apps/api`, `packages/app`).

---

### D1 — Portion realism

**Options considered**

| Option | Performance | Determinism | Complexity | Catalog burden | Verdict |
|---|---|---|---|---|---|
| A. Global absolute gram cap (e.g. 400g/item) replacing `UNIT_MAX` | O(1), no change to hill-climb shape | Preserved | Trivial (one constant) | None | Rejected — a 400g cap is right for eggs, wrong for a rice bowl or a lean protein; a single number cannot be realistic across `FoodGroup`s. |
| B. Per-food `maxUnits` (or `maxGrams`) column on `foods`, hill-climb respects it as a ceiling, but meal composition stays fixed at the template's item count | O(1) | Preserved | Small: one migration + one solver clamp | One column to backfill per seed row | Partial fix only — stops one item from ballooning, but if the meal's kcal share can't be met within realistic caps, the day silently drifts under target or `SOLVER_INFEASIBLE` fires more often. |
| C. Full linear/integer-programming re-solve (multi-item knapsack over the whole catalog per meal) | Slower, no closed-form determinism guarantee across library versions | At risk — LP solvers are not guaranteed bit-identical across environments the way the seeded hill-climb is | Large: new dependency, new numerical-stability test surface | None | Rejected — breaks the "seeded PRNG ⇒ identical inputs + seed reproduce the identical plan" invariant this module is tested against (`solver.test.ts`), and is disproportionate to the actual defect. |
| D. Let Layer 3 (LLM) suggest a second item or adjust portions | N/A | N/A | N/A | N/A | Rejected outright — violates [ADR-0001](0001-hybrid-ai-nutrition.md): Layer 3 never emits or influences kcal/macro numbers. Not reconsidered. |
| **E. Per-food realistic serving ceiling (B) + dynamic pattern expansion: when hill-climb needs more kcal from a pattern group but every adjustable item in that group is already at its ceiling, add a second item from the same group (or its `GROUP_FALLBACKS`) instead of continuing to inflate the first** | O(1) amortized — bounded by `ATTEMPTS_PER_DAY` retries already in place | Preserved — expansion is a deterministic function of the same seeded `rand()` stream, same as `pickCandidate` | Moderate: new `foods.maxUnits` column, a bounded-items-per-slot cap (e.g. 3) to stop runaway expansion, and one new code path in `buildItems`/`optimizePortions` | One column, sane defaults derivable from existing `servingUnits[0].grams` (e.g. `maxUnits = clamp(realistic gram ceiling / unitGrams)`) | **Chosen.** |

**Decision detail (E):**

- Add `foods.max_units numeric` (nullable; solver falls back to a conservative default, e.g. `min(UNIT_MAX, round(250 / unitGrams))`, when unset) via a new migration in `packages/db/migrations/`, seeded explicitly for foods where the default would be wrong (eggs → 3 pieces / 150g; not 8).
- `buildItems`/`optimizePortions` clamp each item's `units` to `min(UNIT_MAX, food.maxUnits ?? defaultFor(food))` instead of `UNIT_MAX` alone.
- Cap items-per-slot at a small constant (e.g. 3) so a breakfast doesn't silently grow to 6 foods; when the group is already at that count and every item is at its ceiling, the day falls through to the existing `ATTEMPTS_PER_DAY` retry-with-different-seed path, and ultimately to the existing `SOLVER_INFEASIBLE` error if truly infeasible — no new failure mode, just a tighter one.
- `solver.test.ts` gets new cases: a high-kcal target that would have produced a >maxUnits single item today must produce ≥2 items in that slot instead, still within the existing kcal/macro tolerance.
- This is a `packages/core` change — CODEOWNERS review is mandatory, no exception.

---

### D2 — Coach-level generation instructions

**Options considered**

| Option | Data model fit | Auditability | Cross-platform (web + `apps/mobile`) | Blast radius | Verdict |
|---|---|---|---|---|---|
| A. Extend `tenant_configs.manifest.aiConfig` with a per-coach map | Wrong grain — manifest is tenant-scoped JSONB, keyed and versioned per org, not per coach; every coach edit would rewrite the whole tenant manifest | Manifest has no per-field history | N/A | High — couples an org-wide config surface to a per-user editing workflow it wasn't built for | Rejected. |
| B. `users.metadata`-style JSONB blob on the user/coach row | Wrong grain — mixes with unit prefs, no independent versioning, `updateUserPrefs` (`apps/api/src/routes/me.ts`) is not built for a save/cancel/regenerate-confirm flow | No revision history, so "what changed since the last plan generation" (needed for the regenerate-confirm dialog) is unanswerable | Fine | Low, but leaves us unable to build the required "instructions actually changed" diff check | Rejected. |
| C. Client-side only (localStorage / device storage) | No server grain at all | None | Breaks — instructions used server-side during generation, and `apps/mobile` and web would diverge | N/A | Rejected — also directly banned (`AGENTS.md`: no raw client-only persistence standing in for a real data layer; `packages/app` has no `localStorage` primitive to begin with). |
| **D. New versioned table `coach_meal_instructions`, one active row per coach, following the existing `client_dietary_profiles` versioning pattern (`packages/db/src/schema/nutrition.ts:33-57`: `version` + `is_active` + `created_by` + `created_at`)** | Right grain: coach-scoped, append-only history, one query for "current" | Full history for free; diffing current vs. previous active row answers "did instructions actually change" without extra bookkeeping | Server-resolved, same for web and `apps/mobile` | Contained: one new table, one new module, one new route file, one new settings screen | **Chosen.** |

**Decision detail (D):**

- **Schema** (`packages/db/src/schema/nutrition.ts`, new migration): `coach_meal_instructions(id, coach_id → coaches.id, version int, is_active bool default true, rich_text jsonb, plain_text text, created_by → users.id, created_at)`. Unique-active-per-coach index mirrors `dietary_profiles_one_active_uq`. `rich_text` stores the structured content (see editor decision below); `plain_text` is the derived, agent-readable string computed at save time — this is what actually reaches Layer 3, never the rich structure.
- **Module** (new `packages/modules/src/nutrition/coach-instructions.ts`, exported from the existing `packages/modules/src/nutrition/index.ts` barrel): `getActiveInstructions(db, coachId)`, `saveInstructions(db, principal, plainText, richDoc)` (writes a new version, flips `is_active`, `writeAudit`-logs the change same as `plan-ops.ts` does).
- **Route** (new `apps/api/src/routes/coach-instructions.ts`, registered like every other route file — never appended to `app.ts` per `AGENTS.md`): `GET /v1/me/meal-instructions`, `PUT /v1/me/meal-instructions`. Response includes the previous `plain_text` alongside the new one so the client can show the regenerate-confirm dialog only when the saved text actually changed (`before !== after`), without a second round-trip.
- **Layer-3 wiring** (`packages/ai/src/narrate.ts`): `callOpenAiCompatible` currently composes `MEAL_NARRATIVE_SYSTEM` + tenant `pack.systemAddendum` (`narrate.ts:186-189`). Add a third, coach-scoped addendum appended last (highest precedence, per the requirement that coach overrides win on conflict with global instructions): `system = [MEAL_NARRATIVE_SYSTEM, pack.systemAddendum, coachAddendum].filter(Boolean).join(' ')`. `coachAddendum` is threaded through `NarrateOptions`/`AiConfig` from `generatePlan` (and D3's per-meal path), sourced from `getActiveInstructions`. This keeps `packages/ai` prompt composition itself unchanged in shape — still versioned, still `assertDeidentified`-checked (coach text is server-authored, not client input, but it still flows through the same de-identification gate for defense in depth) — only the input to that composition grows a new field.
- **Guardrail reuse, not new guardrails.** A coach could write "say each meal is 400 kcal" into their instructions. The existing `numeric_claim` guardrail (`packages/ai/src/guardrails.ts`, `containsNumericClaim`) already scans every LLM *output* regardless of what produced it, so a coach cannot get a number into a published meal name/prep note this way — any such output guardrail-fails and falls back to `fallbackNarrative`. Additionally, run the same `containsNumericClaim` check against the instructions text at **save time** as a non-blocking warning ("Your instructions mention numbers — GymOS never lets the AI state calories or macros, so this line may be ignored or cause the AI to fall back to plain meal names"). Warn, don't block — a coach might legitimately write "focus on high-protein options," which is fine and contains no digits; blocking on any digit would be too broad in the other direction (order-of-magnitude annoying for phrases like "3 eggs is a good staple").
- **Settings UI** (`packages/app/src/features/settings/`, new sub-feature `meal-instructions/`; route `apps/web/app/(coach)/settings/meal-planner/page.tsx` following the existing `settings/nutrition/page.tsx` sub-route convention): a button on the flat `SettingsScreen` ("Meal AI Planner →") navigates to the sub-route. That screen:
  - Shows only the coach's own override text — never the global prompt or tenant pack, per the requirement that this surface is coach-scoped only.
  - Editor: see "Rich text" decision below.
  - **Save** / **Cancel** buttons, `PrimaryButton` / `GhostButton` per existing convention (`plan-editor.tsx`).
  - On **Save**, if the new `plain_text` differs from what was active before the edit, show a confirm dialog before committing: *"Regenerate all client meal plans with these instructions? This resets any manual food swaps or portion edits on their current draft/published plans."* Two actions: *Regenerate all plans* (calls save, then triggers a batch regenerate — see rollout note below) and *Save without regenerating* (saves the instructions; existing plans keep their current narration until each is next regenerated normally). This mirrors the existing inline-card confirm pattern (`PlanPublishConfirm`, `override-prompt.tsx`) rather than introducing a new modal/dialog primitive — the codebase has none today, and adding one is out of scope for this feature.
  - **Rollout note:** a "regenerate all plans" bulk action is a queue/background-job concern (N clients × `generatePlan`), not a synchronous request. Scope D2 to *offer* the choice and persist it (e.g. queue a `coach_id`-scoped batch job processed by the existing generation pipeline, one `generatePlan(kind: 'ADJUSTMENT')` call per active client), but do not block D2's merge on building new job infrastructure if none exists — flag this explicitly as a D2 sub-item to confirm against the actual job/worker setup (`ADR-0001`'s "learning.ranking-refresh" nightly worker is the closest existing precedent) before implementation, rather than assuming a synchronous fan-out is safe at scale.

**Rich text → plain text: options considered**

| Option | New dependency | RN + web parity | Editing power vs. ask | Verdict |
|---|---|---|---|---|
| A. TipTap / Slate / Lexical (DOM-based rich text) | Yes — none currently in the repo (verified: no `tiptap`/`slate`/`lexical`/`quill`/`draft-js` in any `package.json`) | Breaks — these are web/DOM editors; `apps/mobile` would need a second, divergent implementation, which is exactly the "divergent-capability" anti-pattern `CLAUDE.md`/v4 flags | High | Rejected — new heavy dependency with no concrete cross-platform story, against `surgical-changes` ("no new dependencies without a concrete reason") and the `gymos-boundaries` "no raw `<div>`" constraint for `packages/app`. |
| B. Plain multiline `FormField` (already used for the override-reason textarea, `override-prompt.tsx:34-46`) | No | Full parity | None — no formatting at all | Rejected on its own — the user explicitly asked for "good formatting," and a flat textarea for multi-paragraph coaching instructions with lists is a worse authoring experience than the ask calls for. |
| **C. Lightweight Markdown authoring: a toolbar of insert-shortcuts (bold/italic/heading/bullet) over a multiline `FormField`/`TextInput`, plus a live preview rendered with existing Tamagui `Text`/`Body`/`SectionTitle` primitives via a small first-party markdown→RN-element mapper (bold/italic/headings/lists only — a deliberately small subset, not a general parser)** | No — the subset needed (bold, italic, one heading level, bullet lists) is under ~80 lines of parsing logic, well inside "reuse existing functions... do not add a parallel utility" once written once in `packages/core` or `packages/ui` | Full — `TextInput`/`Text` are RN primitives already used on both platforms | Matches the ask: "rich text field... good formatting" while staying parseable to a clean plain string | **Chosen.** |

- `plain_text` derivation is then close to identity: strip the markdown syntax characters coaches typed (`**`, `_`, `#`, leading `- `) and join with newlines — trivial, deterministic, unit-testable, and exactly what "parse the rich text to plain agent-readable string" asks for. No HTML sanitization surface to maintain (a real risk with any DOM-based rich text lib feeding user content into a stored field).
- `rich_text` column stores the raw markdown-subset string (not a bespoke JSON doc) — since the "rich" representation and the editable text are the same string here, there is no separate document model to keep in sync, no lossy round-trip, and no serialization format to version. `plain_text` remains a separately stored, denormalized field purely so the Layer-3 wiring never has to re-run the stripper on every generation call.

---

### D3 — Per-meal regenerate

**Options considered**

| Option | Reuses D1/D2 | Atomicity | UX clarity | Verdict |
|---|---|---|---|---|
| A. Client repeatedly calls existing `swap` `PlanOp`s with random reselection until the meal "looks different" | No — bypasses the solver's kcal-share targeting entirely | Non-atomic: N separate patch calls, partial-failure states possible | Poor — "regenerate" implies solver-quality targeting, not repeated random swaps | Rejected. |
| B. Scope a full `generatePlan` call down to `kind: 'MEAL'` conceptually, but actually still solve/narrate the whole week and discard everything except the target meal | Reuses generation pipeline wholesale | Wasteful — solves 7 days × N meals to keep 1 | Confusing audit trail (`plan_generations` row would claim a full-week generation) | Rejected — correct in spirit but wrong grain; disproportionate cost and a misleading audit record. |
| **C. Factor `solveDay`'s per-slot logic into a reusable `solveMealItems(mealTemplateEntry, targets, candidates, config)` (used both by the existing `buildItems`/`optimizePortions` loop and by a new, narrower entry point), add a `regenerate-meal` operation, and narrate only that one meal** | Directly reuses D1's per-food ceilings and D2's coach addendum (same `narrate()` call, one-meal `NarrativeInput`) | Single transactional unit: one solve, one narrate call, one item-replace within the existing plan-editing transaction pattern (`patchPlan`/`applyPlanOps`) | Matches the ask exactly: one action button per meal | **Chosen.** |

**Decision detail (C):**

- **Solver** (`packages/core/src/nutrition/solver.ts`): extract the per-`MealTemplateEntry` body of `buildItems`'s loop plus a scoped `optimizePortions` pass into an exported `solveMeal(entry: MealTemplateEntry, targets: MacroTargets, candidates, config, usedElsewhereThatDay: ReadonlySet<string>)`. `solveDay` becomes a thin wrapper calling `solveMeal` per template entry — a refactor, not new behavior, so `solver.test.ts`'s existing determinism/tolerance assertions must keep passing unmodified as the regression check for "no behavior change from the extraction," with new tests added specifically for `solveMeal` in isolation.
- **Target share for a single-meal regenerate:** reuse that meal's existing `share` from `MEAL_TEMPLATES`, applied against the plan's stored `targets` (`meal_plans.targets`) — not the day's current totals — so the regenerated meal is evaluated against the same tolerance the original generation used, and the day-level `drift` check in `publishPlan`/`driftedDays` (`plans.ts:620-646`) remains meaningful afterward.
- **Module** (`packages/modules/src/nutrition/plans.ts` or a new sibling `plan-meal-regenerate.ts` kept behind the existing `nutrition/index.ts` barrel): `regenerateMeal(db, principal, planId, day, mealIndex)` — loads the plan and its items, re-solves just that slot with a fresh sub-seed (`${plan.generationId}:regen:${day}:${mealIndex}:${nextRegenSequence}`, so repeated regenerates of the same meal are reproducible per attempt but not identical to each other), calls `narrate()` for that single meal with the coach's current effective addendum from D2, replaces that meal's `meal_plan_items` rows within a transaction, and logs a new `feedback_kind` value `REGENERATE_MEAL` (extends the existing `feedbackKindEnum`, `packages/db/src/schema/enums.ts:65-73`) to `ai_feedback_events` — distinct from the existing plan-level `REGENERATE`, so Layer-4 learning and reporting can tell the two apart.
- **API**: new operation on the existing plans route file (`apps/api/src/routes/plans.ts`) — `POST /v1/meal-plans/{planId}/days/{day}/meals/{mealIndex}/regenerate` — not a new route file, since it is a natural extension of the existing plan-editing surface `plans.ts` already owns; add to `packages/contracts/openapi/` per the committed-spec workflow (query via the `gymos-openapi` MCP server before hand-writing types, per `AGENTS.md`'s context-budget rule) rather than hand-inventing the route shape.
- **UI**: one new action per meal section in `plan-editor.tsx`'s meal loop (`plan-editor.tsx:331-376`) — a `GhostButton` ("Regenerate meal") next to the existing "Add food" toggle, editable-gated the same way, calling the new mutation and replacing that meal's `PlanItemCard`s on success. No new confirm dialog needed here: unlike D2's "regenerate everything" (which destroys all manual edits across every client), a single-meal regenerate only discards manual edits within that one meal, which is the same blast radius as an existing `swap`, so it does not warrant a different confirmation bar than the other in-place edits `plan-editor.tsx` already allows without a dialog.

## Consequences

**Easier:**

- Coaches get realistic multi-item meals without any change to how they read a plan (still `meal_plan_items` rows, still the same `PlanItemCard` UI).
- Per-coach narration preference is now a first-class, audited, versioned setting instead of an engineering ticket to edit a shared prompt file.
- Single-meal iteration no longer requires either full-week regeneration (losing all edits) or slow manual food-by-food editing.
- D1's `solveMeal` extraction is reused directly by D3 — no duplicated solving logic between full-plan and single-meal generation.

**Harder:**

- `packages/core`'s solver picks up a new per-food data dependency (`maxUnits`) that must be seeded thoughtfully for every catalog food, and a new bounded-expansion code path that widens the solver's test surface (`solver.test.ts` grows meaningfully; CODEOWNERS review load on `packages/core` increases for this PR).
- A new persistence/version/audit surface (`coach_meal_instructions`) is one more coach-scoped table to reason about in tenancy/RLS review, on top of `client_dietary_profiles`' existing pattern.
- Prompt composition (`narrate.ts`) now has three layers to reason about (global → tenant pack → coach) instead of two; prompt-quality regressions become slightly harder to attribute to a single layer, which argues for logging which layers were non-empty on each `plan_generations.validation` row (cheap addition, should be included in D2's implementation, not deferred).
- The "regenerate all plans" bulk action in D2 is explicitly *not* fully specified here (see rollout note) — it is a real dependency that must be resolved (against actual worker/queue infrastructure) before D2's UI can safely offer that button, or D2 ships with that button disabled/deferred and only "save without regenerating" live.
- `REGENERATE_MEAL` is a new enum value — Postgres enum additions are forward-only (no easy removal), so it should land in the same migration as D3's other schema needs, reviewed once.

## Alternatives Considered

Captured per-decision above (D1/D2/D3 comparison tables) rather than duplicated here. Alternatives that were rejected outright across all three decisions, not just one option row: putting any nutrition number under Layer 3's control (violates [ADR-0001](0001-hybrid-ai-nutrition.md) unconditionally, regardless of which of the three problems it would appear to solve), and introducing a new client-only or DOM-only UI primitive to solve a formatting/interaction need that the existing Tamagui/RN component set can solve with a small, first-party addition instead (`gymos-boundaries`: no raw `<div>`, and `surgical-changes`: no new dependency without a concrete reason).

## Implementation guidance

| If shipping | Changes | Depends on |
|---|---|---|
| D1 only | `packages/core` (solver + tests), one migration + seed backfill (`packages/db`) | Nothing else in this ADR |
| D2 only | `packages/db` (new table + migration), `packages/modules/src/nutrition`, `apps/api/src/routes/coach-instructions.ts`, `packages/ai/src/narrate.ts` (thread-through only, no prompt-shape change), `packages/app/src/features/settings/meal-instructions/`, new web route | D1 not required, but ships more usefully after D1 (coach instructions are about narration quality; portion realism is the more visible fix) |
| D3 only | `packages/core` (solver extraction — do this *as* D1's refactor, not twice), `packages/modules`, `apps/api/src/routes/plans.ts`, OpenAPI spec update, `packages/app/src/features/plan/plan-editor.tsx` | **Blocked on D1's `solveMeal` extraction** — do not implement D3's regenerate path against the current monolithic `buildItems`/`optimizePortions` loop and refactor later; extract once, in D1, and have D3 consume it. |

**Required outputs for each implementation PR** (per `AGENTS.md`): a `docs/specs/` entry (e.g. `fr-c10-meal-portion-realism.md`, `fr-c11-coach-meal-instructions.md`, `fr-c12-meal-regenerate.md` — numbered continuing from the existing `fr-c*` spec series) with Given/When/Then acceptance criteria, a test that fails before the change, and scoped `pnpm lint` / `pnpm typecheck` / `pnpm test` for every touched package (full workspace run if `packages/contracts` changes, which D3 requires).

**Blocking issues to resolve before implementation starts:**

1. D2's "regenerate all plans" bulk action needs a real job/worker decision (synchronous fan-out is not acceptable past a handful of clients) — resolve against whatever the nightly `learning.ranking-refresh` job runs on, before building the UI's "Regenerate all" path.
2. D1's default `maxUnits` backfill needs a nutrition-literate pass over the seed catalog (the seed data is already flagged in-repo as needing exactly this kind of review: `packages/db/src/seed-data/foods.ts:24-28`) — do not ship silent, guessed per-food ceilings as the permanent values without that review.
3. D3's new route needs an OpenAPI contract entry authored against the committed spec via the `gymos-openapi` MCP server, not hand-invented, per the context-budget rule.
