# ADR-0014: Coach calorie override (warn, don't block)

- **Status**: Accepted
- **Date**: 2026-08-18
- **Phase**: P2/P3 (goal create + onboarding)

Numbers 0010–0013 were reserved during planning and never issued. This ADR is
not a replacement for missing records; the gap is intentional.

## Context

[ADR-0008](0008-pace-clamp-then-derive.md) made Gentle / Standard / Aggressive an intensity name. Calories are clamped into a safety band (25% deficit, 15% surplus, sex floor, 1% body weight). Coaches could not set a custom kcal. Aggressive Lose at TDEE 2,270 is 1,703 kcal even when the male sex floor is 1,500.

Coaches need to fine-tune the daily calorie target on a slider — including past the recommended % deficit and below the sex floor — and still create the client. Blocking create on calorie policy forced them either to accept a clamped number they did not choose or to abandon onboarding.

Named-pace taps must stay safe (0008). Overrides are an explicit coach action.

## Decision

1. **Named ticks (no override)** still clamp-then-derive per ADR-0008.
2. **Coach `targetKcal`** is first-class on the goal. The slider is continuous. Gentle / Standard / Aggressive are suggested ticks and the live label (nearest rate). Past Aggressive the label stays Aggressive.
3. **Warning thresholds, not clamps, on the override path:**
   - Recommended intensity (`GOAL_DELTA` Aggressive: −25% / −15% / +15%)
   - Sex calorie floor (1,200 F / 1,500 M)
4. **Hard minimum on override** is 800 kcal (`COACH_OVERRIDE_KCAL_MIN`) so the control cannot emit a 70 kcal target. This is below both sex floors. There is no create/save gate for going below 1,200/1,500 or past 25% deficit.
5. **Macros:** override uses a last-resort split (scale protein/fat, carbs may be 0) instead of `MACROS_INFEASIBLE`. Named-pace without override still refuses infeasible macros.
6. **Meal-plan generate** reads stored `target_kcal` so the override is not recomputed away from `rate`.
7. Onboarding **Create client** is not disabled for calorie warnings. Review shows that an override was made and may not be healthy.

## Consequences

**Easier:** Coaches can match a physician-directed calorie figure, including VLCD-adjacent values between 800 and the sex floor, without lying to the engine.

**Harder:** Stored targets can sit outside the published safety band. Check-in copy and plan generation must treat `target_kcal` as source of truth. Audit logs must record the override.

**Revisit when:** clinical policy forbids sub-floor calories even with a coach warning; or 800 kcal itself needs to move.
