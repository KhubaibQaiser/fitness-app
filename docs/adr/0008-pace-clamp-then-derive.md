# ADR-0008: Named pace, clamp-then-derive calories

- **Status**: Accepted
- **Date**: 2026-08-17
- **Phase**: P2 (load-bearing for P3 FR-C5 Layer 1)

## Context

Pilot tenant config treated Gentle / Standard / Aggressive as **fixed kg/week** and converted that straight into calories:

`targetKcal = round(TDEE + weeklyKg × 7700 ÷ 7)`

Aggressive −2 kg/week is a 2,200 kcal/day deficit. For a typical client (TDEE ≈ 2,270) that emitted **70 kcal/day** and a 5-week ETA for a 10 kg loss. The onboarding preview showed those figures even though goal create refused them (`NUTRITION_REFUSAL`). Coaches saw an impossible target on a screen they could not submit.

Default `GOAL_DELTA` (−10 / −20 / −25% of TDEE) was already inside the 25% deficit cap. The tenant kg/week table shadowed it. A 1,500 kcal “male floor” suggestion is still a 34% deficit and would fail the existing cap; the binding limit is `ceil(TDEE × 0.75)` (1,703 kcal at TDEE 2,270 ≈ 0.52 kg/week).

Fixed kg/week cannot be the calorie formula: −2 kg/week is VLCD-territory and is structurally incompatible with a 25% TDEE cap on typical metabolisms.

## Decision

**Pace is an intensity name. Calories are a constrained energy target. kg/week and duration are outputs.**

1. **Intent kcal** from `GOAL_DELTA` (TDEE %), or from a tenant `weeklyDeltaKg` cell treated as a _desired_ rate only.
2. **Clamp** into the safe band — do not refuse named paces:
   - calorie floor 1,200 F / 1,500 M
   - max deficit 25% of TDEE
   - max surplus 15% of TDEE
   - max |weekly kg| = 1% of current body weight (ISSN-aligned; rarely binds vs 25% TDEE)
3. **Derive** `expectedWeeklyDeltaKg` and ETA from the clamped kcal.
4. **Refuse** only `MACROS_INFEASIBLE` (protein + fat cannot fit the clamped budget).

Preview, goal create, and meal-plan generation call the same `computeTargets` / `resolvePaceEnergy` path. Unsafe requested figures are not displayed as the daily target.

Tenant `weeklyDeltaKg` remains config-not-code (no tenant-name conditionals). New org defaults omit the table so `GOAL_DELTA` owns calories; existing manifests with −2 kg/week are harmless because the engine clamps.

Safety floors themselves stay non-configurable downward. The 25% deficit cap wins over the sex floor when both would apply.

## Consequences

**Easier:** Aggressive is always creatable at the fastest _safe_ rate for that client. Preview matches persist. Labels show derived kg/week (e.g. −0.52 kg/wk) instead of tenant −2.

**Harder:** A tenant that still advertises “Aggressive = 2 kg/week” will see the label rewritten per client. That is the point — the named pace is intensity, not a promise of an unsafe rate.

**Revisit when:** clinical policy changes the 25% cap / sex floors; or we add coach-entered custom kcal (that path should still _refuse_ below the floor, not clamp a typed-in 70).
