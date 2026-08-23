# ADR-0015: Meal-plan portion realism, coach-level generation instructions, and per-meal regeneration

- **Status**: Accepted
- **Date**: 2026-08-23
- **Approved**: 2026-08-23 — the recommended options (D1-E, D2-D + rich-text-C, D3-C) are confirmed as written. This revision adds the engineering-principles rationale ("Design principles applied") and concrete smoke-test specifications ("Smoke tests") requested at approval; it does not change which option was chosen in any decision.
- **Phase**: AI-native nutrition track ([ADR-0001](0001-hybrid-ai-nutrition.md) lineage), not a `CLAUDE.md` P1–P4 alignment phase. The one net-new UI surface this introduces (Settings → Meal AI Planner) must still consume the P1 token/component set — it is new functionality, not a re-skin, so it does not belong to P1 itself.

This is a planning ADR — the architecture is accepted for implementation as written. No source files change in _this_ PR; it sequences three follow-on implementation PRs, each scoped to its own CODEOWNERS review gate, and each is expected to ship with the smoke test(s) specified for it below, not just the `docs/specs/` acceptance criteria.

## Context

Three coach-reported problems, all rooted in the Layer 2 solver and the coach-facing plan workflow:

1. **Unrealistic single-item portions — every meal slot, not a breakfast-only bug.** The solver (`packages/core/src/nutrition/solver.ts`) sizes each pattern slot independently, and the same `buildItems`/`optimizePortions` code path runs for every entry in `MEAL_TEMPLATES` (`solver.ts:106-125`) — breakfast, lunch, dinner, and snack alike: it takes that meal's kcal share, divides by the number of adjustable pattern groups, and converts to serving units, clamped only by `UNIT_MAX = 8` native servings per item (`solver.ts:217-219`, `solver.ts:329-341`). There is no ceiling tied to what a food realistically looks like on a plate, in any slot. "Egg (whole, boiled)" at breakfast (`servingUnits: [{ name: 'piece', grams: 50 }]`, `packages/db/src/seed-data/foods.ts:121-131`) ballooning to 8 units — 400g, 8 whole eggs — in a single slot is the reported symptom, but the identical mechanism applies to lunch's `protein`/`staple`/`vegetable`/`fat` pattern and dinner's `protein`/`vegetable` pattern (`MEAL_TEMPLATES`, `solver.ts:106-125`) — e.g. "Chicken breast (skinless, cooked)" at lunch (`servingUnits: [{ name: 'piece', grams: 120 }]`) can equally be pushed to 8 pieces (960g) if that closes lunch's kcal gap cheapest. The post-build hill-climb (`optimizePortions`, `solver.ts:247-276`) pushes _any_ adjustable item in _any_ slot to that ceiling if it is the cheapest way to close a kcal gap; any food with a small per-100g kcal density relative to `perItemKcal` (`targets.kcal * meal.share / adjustableCount`) is at risk, regardless of which meal it is in. D1's fix below is therefore scoped to the shared solver mechanism, not to breakfast or to eggs specifically — the illustrative numbers throughout this ADR (eggs, breakfast) are the reported case, and every example is re-run against a lunch/dinner protein below to keep that generality explicit rather than assumed. This is a Layer 2 defect, not a Layer 3 one — Layer 3 (`packages/ai`) only names meals and writes prep notes and never sees or emits portion numbers (`packages/ai/src/prompts/meal-narrative.v1.ts:7-12`, `packages/ai/src/types.ts:38-55`); fixing it anywhere in Layer 3 would violate [ADR-0001](0001-hybrid-ai-nutrition.md)'s hard boundary and is not on the table.
2. **No coach-level fine-tuning of meal narration.** [ADR-0001](0001-hybrid-ai-nutrition.md) fixed the global system prompt as a versioned code artifact (`MEAL_NARRATIVE_SYSTEM`, `packages/ai/src/prompts/meal-narrative.v1.ts:7-12`) plus an optional tenant-wide cuisine pack (`packages/ai/src/prompts/packs.ts`, `resolvePromptPack`). Neither is coach-scoped. Individual coaches have preferences the global prompt should not encode (protein-forward breakfasts, specific prep styles, phrasing tone) and today the only way to express them is editing the shared code prompt or the tenant manifest — both wrong-grained and both requiring an engineering change per preference.
3. **No single-meal regeneration.** `generatePlan` (`packages/modules/src/nutrition/plans.ts:65-401`) always solves and narrates the full week from a fresh day-1 template (`solveWeek`, `solver.ts:431-459`). The only per-item control today is `patchPlan` → `applyPlanOps` (`packages/modules/src/nutrition/plan-ops.ts`) — manual `set-portion` / `swap` / `add` / `remove`, one item at a time. A coach who dislikes just breakfast on day 2 has no faster path than editing every item by hand or regenerating the entire week (`plan-editor.tsx:223-272`) and losing every other edit.

All three land in code owned by `packages/core` and/or `packages/ai`, which `CODEOWNERS` requires a human (`@KhubaibQaiser`) to review. Approving this ADR accepts the _architecture_ below; it does not substitute for that CODEOWNERS review on the actual implementation PRs, which still happens per PR as normal.

## Decision

Ship as three independently reviewable PRs, in this order (2 is not blocked by 1; 3 depends on 1's solver refactor):

- **D1** — Solver: realistic per-food serving ceilings + dynamic item-count expansion (`packages/core`).
- **D2** — Coach-level generation instructions, stored per-coach, layered under the global/tenant prompt, surfaced at Settings → Meal AI Planner (`packages/db`, `packages/modules`, `apps/api`, `packages/app`).
- **D3** — Per-meal regenerate action, reusing D1's solver entry point and D2's effective prompt (`packages/core`, `packages/modules`, `apps/api`, `packages/app`).

### Design principles applied

Each decision below was already screened against these before being marked "Chosen" — this section names the principle explicitly so the rationale doesn't have to be re-derived from the comparison tables during review:

- **DRY.** D1's `solveMeal` extraction is consumed by both the full-week solver (`solveDay`'s loop) and D3's single-meal regenerate path — one portion-solving implementation, not two that could drift apart. D2's coach addendum reuses the exact `MEAL_NARRATIVE_SYSTEM` / `pack.systemAddendum` join pattern already in `narrate.ts`, and its safety checks reuse the existing `containsNumericClaim` / `assertDeidentified` guardrails rather than duplicating that pattern-matching logic a third time.
- **KISS.** D1 rejects the LP/knapsack re-solve (option C) — a bounded-expansion rule over the existing deterministic hill-climb solves the actual defect without a new dependency or a new class of non-determinism to reason about. D2 rejects a DOM rich-text library (option A) for an ~80-line first-party markdown-subset stripper — the simplest mechanism that satisfies "good formatting" and "parses to plain text" without taking on an HTML-sanitization surface to maintain. D3 is scoped to exactly one meal, not a generalized "regenerate any subset of a plan" abstraction nobody asked for.
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
- The "regenerate all plans" bulk action in D2 is explicitly _not_ fully specified here (see rollout note) — it is a real dependency that must be resolved (against actual worker/queue infrastructure) before D2's UI can safely offer that button, or D2 ships with that button disabled/deferred and only "save without regenerating" live.
- `REGENERATE_MEAL` is a new enum value — Postgres enum additions are forward-only (no easy removal), so it should land in the same migration as D3's other schema needs, reviewed once.
- `sanitizeInstructionsText` is new hand-written text-processing logic with its own edge cases (Unicode ranges, markdown-subset stripping order, length-cap interaction with multi-byte characters) — it needs dedicated unit tests for adversarial input (raw `<script>` tags, zero-width-obfuscated text, oversized strings) as part of D2's test surface. This is separate from, and does not get folded into, the existing guardrail tests in `packages/ai`, which cover LLM _output_, not coach-authored _input_.

## Alternatives Considered

Captured per-decision above (D1/D2/D3 comparison tables) rather than duplicated here. Alternatives that were rejected outright across all three decisions, not just one option row: putting any nutrition number under Layer 3's control (violates [ADR-0001](0001-hybrid-ai-nutrition.md) unconditionally, regardless of which of the three problems it would appear to solve), and introducing a new client-only or DOM-only UI primitive to solve a formatting/interaction need that the existing Tamagui/RN component set can solve with a small, first-party addition instead (`gymos-boundaries`: no raw `<div>`, and `surgical-changes`: no new dependency without a concrete reason).

## Implementation guidance

| If shipping | Changes                                                                                                                                                                                                                                                                  | Depends on                                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 only     | `packages/core` (solver + tests), one migration + seed backfill (`packages/db`)                                                                                                                                                                                          | Nothing else in this ADR                                                                                                                                                                                                |
| D2 only     | `packages/db` (new table + migration), `packages/modules/src/nutrition`, `apps/api/src/routes/coach-instructions.ts`, `packages/ai/src/narrate.ts` (thread-through only, no prompt-shape change), `packages/app/src/features/settings/meal-instructions/`, new web route | D1 not required, but ships more usefully after D1 (coach instructions are about narration quality; portion realism is the more visible fix)                                                                             |
| D3 only     | `packages/core` (solver extraction — do this _as_ D1's refactor, not twice), `packages/modules`, `apps/api/src/routes/plans.ts`, OpenAPI spec update, `packages/app/src/features/plan/plan-editor.tsx`                                                                   | **Blocked on D1's `solveMeal` extraction** — do not implement D3's regenerate path against the current monolithic `buildItems`/`optimizePortions` loop and refactor later; extract once, in D1, and have D3 consume it. |

**Required outputs for each implementation PR** (per `AGENTS.md`): a `docs/specs/` entry (e.g. `fr-c10-meal-portion-realism.md`, `fr-c11-coach-meal-instructions.md`, `fr-c12-meal-regenerate.md` — numbered continuing from the existing `fr-c*` spec series) with Given/When/Then acceptance criteria, a test that fails before the change, and scoped `pnpm lint` / `pnpm typecheck` / `pnpm test` for every touched package (full workspace run if `packages/contracts` changes, which D3 requires). For D2 specifically, the acceptance criteria must include save-time sanitization cases: a submitted instruction containing raw HTML/script-like markup, zero-width or control Unicode characters, or a string past the length cap is neutralized/truncated before it is persisted and before it can reach `narrate.ts` — proven by a test that saves an adversarial input and asserts on the stored `plain_text`/`rich_text`, not just on final LLM output. The concrete smoke test for each decision, verifying the user-visible behavior end-to-end rather than an internal implementation detail, is specified below.

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

## Blocking issues to resolve before implementation starts

1. D2's "regenerate all plans" bulk action needs a real job/worker decision (synchronous fan-out is not acceptable past a handful of clients) — resolve against whatever the nightly `learning.ranking-refresh` job runs on, before building the UI's "Regenerate all" path.
2. D1's default `maxUnits` backfill needs a nutrition-literate pass over the seed catalog (the seed data is already flagged in-repo as needing exactly this kind of review: `packages/db/src/seed-data/foods.ts:24-28`) — do not ship silent, guessed per-food ceilings as the permanent values without that review.
3. D3's new route needs an OpenAPI contract entry authored against the committed spec via the `gymos-openapi` MCP server, not hand-invented, per the context-budget rule.
