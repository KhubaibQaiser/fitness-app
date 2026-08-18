import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { assertSafeTargetKcal, CALORIE_FLOOR_KCAL, clampToSafeKcal } from './floors';
import {
  bmr,
  computeTargets,
  goalDeltaFraction,
  nearestGoalRate,
  paceSliderBounds,
  resolvePaceEnergy,
  resolveWeeklyDeltaKg,
  splitMacros,
  splitMacrosForOverride,
  tdee,
} from './layer1';
import { ACTIVITY_LEVELS, GOAL_PRESETS, GOAL_RATES, type PhysiologyInput } from './types';

const male30: PhysiologyInput = {
  sex: 'M',
  ageYears: 30,
  heightCm: 180,
  weightKg: 80,
  activity: 1.55,
};

describe('bmr', () => {
  it('computes Mifflin-St Jeor for males', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(bmr(male30)).toBe(1780);
  });

  it('computes Mifflin-St Jeor for females', () => {
    // 10*60 + 6.25*165 - 5*28 - 161 = 1330.25
    expect(
      bmr({ sex: 'F', ageYears: 28, heightCm: 165, weightKg: 60, activity: 1.375 }),
    ).toBeCloseTo(1330.25, 2);
  });

  it('switches to Katch-McArdle when body fat is known', () => {
    // LBM = 80*(1-0.20) = 64 → 370 + 21.6*64 = 1752.4
    expect(bmr({ ...male30, bodyFatPct: 20 })).toBeCloseTo(1752.4, 1);
  });
});

describe('tdee', () => {
  it('multiplies BMR by the activity factor', () => {
    expect(tdee(male30)).toBeCloseTo(1780 * 1.55, 5);
  });
});

describe('goalDeltaFraction', () => {
  it('matches the preset/rate table', () => {
    expect(goalDeltaFraction('LOSE', 'STANDARD')).toBe(-0.2);
    expect(goalDeltaFraction('LOSE', 'AGGRESSIVE')).toBe(-0.25);
    expect(goalDeltaFraction('GAIN', 'CONSERVATIVE')).toBe(0.05);
    expect(goalDeltaFraction('MAINTAIN', 'AGGRESSIVE')).toBe(0);
    expect(goalDeltaFraction('RECOMP', 'STANDARD')).toBe(-0.1);
  });
});

describe('floors', () => {
  it('passes safe targets through', () => {
    expect(assertSafeTargetKcal(2000, 2500, 'M')).toEqual({ ok: true, value: 2000 });
  });

  it('refuses below the sex-specific calorie floor', () => {
    const result = assertSafeTargetKcal(1100, 1400, 'F');
    expect(result).toEqual({
      ok: false,
      error: { code: 'CALORIE_FLOOR_VIOLATION', floorKcal: 1200, requestedKcal: 1100 },
    });
  });

  it('refuses deficits beyond 25% of TDEE', () => {
    const result = assertSafeTargetKcal(1600, 2400, 'M');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DEFICIT_CAP_EXCEEDED');
  });

  it('clamps instead of refusing on the adjustment path', () => {
    expect(clampToSafeKcal(1100, 2000, 'F')).toBe(1500); // deficit cap binds (0.75*2000)
    expect(clampToSafeKcal(1100, 1500, 'F')).toBe(1200); // floor binds
    expect(clampToSafeKcal(1800, 2000, 'M')).toBe(1800); // already safe
  });

  it('caps surplus at 15% of TDEE', () => {
    expect(clampToSafeKcal(4000, 2270, 'M')).toBe(Math.floor(2270 * 1.15));
  });

  it('keeps the sex floor when TDEE sits below it', () => {
    expect(clampToSafeKcal(800, 1000, 'M')).toBe(1500);
  });
});

describe('splitMacros degradation cascade', () => {
  it('uses default fat 0.9 g/kg when it fits', () => {
    const result = splitMacros(2000, 100, 'LOSE');
    expect(result).toEqual({ ok: true, value: { proteinG: 220, fatG: 90, carbsG: 78 } });
  });

  it('degrades fat to 0.8 g/kg when the default does not fit', () => {
    const result = splitMacros(1650, 100, 'LOSE');
    expect(result).toEqual({ ok: true, value: { proteinG: 220, fatG: 80, carbsG: 13 } });
  });

  it('degrades protein toward 1.6 g/kg as the last resort', () => {
    const result = splitMacros(1500, 100, 'LOSE');
    expect(result).toEqual({ ok: true, value: { proteinG: 160, fatG: 80, carbsG: 35 } });
  });

  it('refuses when minimum protein + fat still exceed the kcal budget', () => {
    const result = splitMacros(1300, 100, 'LOSE');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MACROS_INFEASIBLE');
  });
});

describe('resolveWeeklyDeltaKg', () => {
  it('returns undefined when the table or cell is missing', () => {
    expect(resolveWeeklyDeltaKg(undefined, 'LOSE', 'STANDARD')).toBeUndefined();
    expect(resolveWeeklyDeltaKg({ LOSE: {} }, 'LOSE', 'STANDARD')).toBeUndefined();
    expect(resolveWeeklyDeltaKg({ GAIN: { STANDARD: 0.5 } }, 'LOSE', 'STANDARD')).toBeUndefined();
  });

  it('returns the configured kg/week for a preset/rate cell', () => {
    expect(
      resolveWeeklyDeltaKg(
        { LOSE: { AGGRESSIVE: -2 }, GAIN: { CONSERVATIVE: 0.25 } },
        'LOSE',
        'AGGRESSIVE',
      ),
    ).toBe(-2);
    expect(
      resolveWeeklyDeltaKg(
        { LOSE: { AGGRESSIVE: -2 }, GAIN: { CONSERVATIVE: 0.25 } },
        'GAIN',
        'CONSERVATIVE',
      ),
    ).toBe(0.25);
  });
});

describe('computeTargets', () => {
  it('produces the full target computation for a standard cut', () => {
    const result = computeTargets(male30, 'LOSE', 'STANDARD');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { bmr: b, tdee: t, targets, expectedWeeklyDeltaKg } = result.value;
    expect(b).toBe(1780);
    expect(t).toBe(2759);
    expect(targets.kcal).toBe(2207); // round(2759 * 0.8)
    expect(targets.proteinG).toBe(176); // 2.2 g/kg
    expect(targets.fatG).toBe(72); // 0.9 g/kg
    expect(targets.carbsG).toBe(214); // (2207 - 704 - 648) / 4
    expect(targets.fiberG).toBe(31); // 14 per 1000 kcal
    expect(expectedWeeklyDeltaKg).toBeLessThan(0);
    expect(expectedWeeklyDeltaKg).toBeCloseTo(-0.5, 1);
  });

  it('produces a surplus for GAIN with positive expected delta', () => {
    const result = computeTargets(male30, 'GAIN', 'STANDARD');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.targets.kcal).toBeGreaterThan(result.value.tdee);
      expect(result.value.expectedWeeklyDeltaKg).toBeGreaterThan(0);
    }
  });

  it('uses desired weekly kg when the override is inside the safe band', () => {
    const result = computeTargets(male30, 'LOSE', 'STANDARD', { weeklyDeltaKg: -0.5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // TDEE 2759 → deficit 7700/7/2 = 550 → target 2209
    expect(result.value.targets.kcal).toBe(2209);
    expect(result.value.expectedWeeklyDeltaKg).toBe(-0.5);
    expect(result.value.clamped).toBe(false);
    expect(result.value.requestedKcal).toBe(2209);
  });

  it('keeps GOAL_DELTA behavior when no weekly override is passed', () => {
    const withUndefined = computeTargets(male30, 'LOSE', 'STANDARD', {});
    const withoutOpts = computeTargets(male30, 'LOSE', 'STANDARD');
    expect(withUndefined).toEqual(withoutOpts);
  });

  it('clamps a fixed loss that exceeds the deficit cap instead of refusing', () => {
    const result = computeTargets(male30, 'LOSE', 'STANDARD', { weeklyDeltaKg: -1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const deficitFloor = Math.ceil(tdee(male30) * 0.75);
    expect(result.value.targets.kcal).toBe(deficitFloor);
    expect(result.value.clamped).toBe(true);
    expect(result.value.clampReasons).toEqual(['DEFICIT_CAP']);
    expect(result.value.expectedWeeklyDeltaKg).not.toBe(-1);
  });

  it('clamps petite aggressive lose to the sex floor instead of refusing', () => {
    const petite: PhysiologyInput = {
      sex: 'F',
      ageYears: 55,
      heightCm: 150,
      weightKg: 45,
      activity: 1.2,
    };
    const result = computeTargets(petite, 'LOSE', 'AGGRESSIVE');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.targets.kcal).toBe(CALORIE_FLOOR_KCAL.F);
    expect(result.value.clamped).toBe(true);
    expect(result.value.clampReasons).toEqual(['CALORIE_FLOOR']);
  });

  it('clamps a fixed-kg override that lands below the calorie floor', () => {
    const petite: PhysiologyInput = {
      sex: 'F',
      ageYears: 55,
      heightCm: 150,
      weightKg: 45,
      activity: 1.2,
    };
    const result = computeTargets(petite, 'LOSE', 'CONSERVATIVE', { weeklyDeltaKg: -0.5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.targets.kcal).toBe(CALORIE_FLOOR_KCAL.F);
    expect(result.value.clamped).toBe(true);
  });

  it('clamps the screenshot Aggressive −2 kg/wk case to 25% of TDEE, not 70 or 1500', () => {
    const energy = resolvePaceEnergy(2270, 'LOSE', 'AGGRESSIVE', {
      sex: 'M',
      weightKg: 95,
      weeklyDeltaKg: -2,
    });
    expect(energy.requestedKcal).toBe(70);
    expect(energy.targetKcal).toBe(1703);
    expect(energy.expectedWeeklyDeltaKg).toBeCloseTo(-0.52, 2);
    expect(energy.clamped).toBe(true);
    expect(energy.clampReasons).toEqual(['DEFICIT_CAP']);
  });

  it('caps GAIN aggressive +1 kg/wk at +15% TDEE', () => {
    const energy = resolvePaceEnergy(2270, 'GAIN', 'AGGRESSIVE', {
      sex: 'M',
      weightKg: 95,
      weeklyDeltaKg: 1,
    });
    expect(energy.requestedKcal).toBe(3370);
    expect(energy.targetKcal).toBe(Math.floor(2270 * 1.15));
    expect(energy.clamped).toBe(true);
    expect(energy.clampReasons).toEqual(['SURPLUS_CAP']);
  });

  it('caps loss at 1% of body weight when that is tighter than 25% TDEE', () => {
    const energy = resolvePaceEnergy(3500, 'LOSE', 'AGGRESSIVE', {
      sex: 'M',
      weightKg: 50,
      weeklyDeltaKg: -2,
    });
    expect(energy.clampReasons).toEqual(['BODY_WEIGHT_RATE']);
    expect(energy.targetKcal).toBe(Math.ceil(3500 - (50 * 0.01 * 7700) / 7));
  });

  it('caps surplus at 1% of body weight when that is tighter than +15% TDEE', () => {
    const energy = resolvePaceEnergy(4000, 'GAIN', 'AGGRESSIVE', {
      sex: 'F',
      weightKg: 45,
      weeklyDeltaKg: 1,
    });
    expect(energy.clampReasons).toEqual(['BODY_WEIGHT_RATE']);
    expect(energy.targetKcal).toBe(Math.floor(4000 + (45 * 0.01 * 7700) / 7));
  });

  it('refuses infeasible macro splits above the floor', () => {
    const heavy: PhysiologyInput = {
      sex: 'F',
      ageYears: 60,
      heightCm: 150,
      weightKg: 200,
      activity: 1.2,
    };
    const result = computeTargets(heavy, 'LOSE', 'AGGRESSIVE');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MACROS_INFEASIBLE');
  });

  it('persists a coach override below the sex floor and past the 25% cap', () => {
    const energy = resolvePaceEnergy(2270, 'LOSE', 'STANDARD', {
      sex: 'M',
      weightKg: 95,
      targetKcal: 1100,
    });
    expect(energy.targetKcal).toBe(1100);
    expect(energy.belowSexFloor).toBe(true);
    expect(energy.beyondRecommended).toBe(true);
    expect(energy.kcalOverridden).toBe(true);
    expect(energy.overrideWarnings).toEqual(
      expect.arrayContaining(['KCAL_OVERRIDDEN', 'BEYOND_RECOMMENDED', 'BELOW_SEX_FLOOR']),
    );
  });

  it('does not let a coach override drop below 800 kcal', () => {
    const energy = resolvePaceEnergy(2270, 'LOSE', 'AGGRESSIVE', {
      sex: 'M',
      weightKg: 95,
      targetKcal: 70,
    });
    expect(energy.requestedKcal).toBe(70);
    expect(energy.targetKcal).toBe(800);
    expect(energy.clamped).toBe(true);
    expect(energy.belowSexFloor).toBe(true);
  });

  it('creates targets for a sub-floor override instead of refusing macros', () => {
    const result = computeTargets(male30, 'LOSE', 'STANDARD', { targetKcal: 1100 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.targets.kcal).toBe(1100);
    expect(result.value.belowSexFloor).toBe(true);
    expect(result.value.kcalOverridden).toBe(true);
  });

  it('maps kcal below the aggressive tick to AGGRESSIVE', () => {
    expect(nearestGoalRate(2270, 'LOSE', 900, { sex: 'M', weightKg: 95 })).toBe('AGGRESSIVE');
    expect(nearestGoalRate(2759, 'LOSE', 2500, { sex: 'M', weightKg: 80 })).toBe('CONSERVATIVE');
    expect(nearestGoalRate(2759, 'LOSE', 2207, { sex: 'M', weightKg: 80 })).toBe('STANDARD');
    expect(nearestGoalRate(2759, 'MAINTAIN', 2000, { sex: 'M', weightKg: 80 })).toBe('STANDARD');
    expect(nearestGoalRate(2759, 'GAIN', 4000, { sex: 'M', weightKg: 80 })).toBe('AGGRESSIVE');
    expect(nearestGoalRate(2759, 'GAIN', 2760, { sex: 'M', weightKg: 80 })).toBe('CONSERVATIVE');
    expect(nearestGoalRate(2759, 'GAIN', 3040, { sex: 'M', weightKg: 80 })).toBe('STANDARD');
  });

  it('warns on a maintain override without clamping named ticks', () => {
    const energy = resolvePaceEnergy(2000, 'MAINTAIN', 'STANDARD', {
      sex: 'M',
      weightKg: 80,
      targetKcal: 1800,
    });
    expect(energy.targetKcal).toBe(1800);
    expect(energy.beyondRecommended).toBe(true);
    expect(energy.kcalOverridden).toBe(true);
  });

  it('warns when a gain override exceeds the aggressive surplus tick', () => {
    const energy = resolvePaceEnergy(2000, 'GAIN', 'STANDARD', {
      sex: 'M',
      weightKg: 80,
      targetKcal: 2500,
    });
    expect(energy.beyondRecommended).toBe(true);
    expect(energy.belowSexFloor).toBe(false);
  });

  it('returns slider bounds for each preset', () => {
    expect(paceSliderBounds(2000, 'LOSE')).toEqual({ min: 800, max: 2000, tone: 'deficit' });
    expect(paceSliderBounds(2000, 'GAIN').tone).toBe('surplus');
    expect(paceSliderBounds(2000, 'GAIN').min).toBe(2000);
    expect(paceSliderBounds(2000, 'MAINTAIN').tone).toBe('neutral');
    expect(paceSliderBounds(2000, 'RECOMP').tone).toBe('deficit');
    expect(paceSliderBounds(0, 'LOSE').max).toBe(1);
  });

  it('degrades macros for an override that cannot fit protein and fat', () => {
    const split = splitMacrosForOverride(800, 100, 'LOSE');
    expect(split.degraded).toBe(true);
    expect(split.split.carbsG).toBe(0);
  });

  it('computes override targets with degraded macros instead of refusing', () => {
    const heavy: PhysiologyInput = {
      sex: 'F',
      ageYears: 60,
      heightCm: 150,
      weightKg: 200,
      activity: 1.2,
    };
    const result = computeTargets(heavy, 'LOSE', 'AGGRESSIVE', { targetKcal: 900 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.macrosDegraded).toBe(true);
    expect(result.value.overrideWarnings).toContain('MACROS_DEGRADED');
  });

  it('never emits unsafe targets across the whole input space (property)', () => {
    fc.assert(
      fc.property(
        fc.record({
          sex: fc.constantFrom('F' as const, 'M' as const),
          ageYears: fc.integer({ min: 16, max: 90 }),
          heightCm: fc.integer({ min: 140, max: 210 }),
          weightKg: fc.integer({ min: 40, max: 200 }),
          activity: fc.constantFrom(...ACTIVITY_LEVELS),
        }),
        fc.constantFrom(...GOAL_PRESETS),
        fc.constantFrom(...GOAL_RATES),
        (input, preset, rate) => {
          const result = computeTargets(input, preset, rate);
          if (!result.ok) return true; // refusals are the safe outcome
          const { targets } = result.value;
          // Check against the raw (unrounded) TDEE that assertSafeTargetKcal itself
          // validates against — result.value.tdee is rounded for display and can
          // tip the ratio a hair past the cap purely from display rounding.
          const rawTdee = tdee(input);
          expect(targets.kcal).toBeGreaterThanOrEqual(CALORIE_FLOOR_KCAL[input.sex]);
          expect((rawTdee - targets.kcal) / rawTdee).toBeLessThanOrEqual(0.2501);
          if (targets.kcal > rawTdee && targets.kcal !== CALORIE_FLOOR_KCAL[input.sex]) {
            expect((targets.kcal - rawTdee) / rawTdee).toBeLessThanOrEqual(0.1501);
          }
          // Macro energy reconciles with the kcal target (rounding tolerance).
          const macroKcal = targets.proteinG * 4 + targets.fatG * 9 + targets.carbsG * 4;
          expect(Math.abs(macroKcal - targets.kcal)).toBeLessThanOrEqual(12);
          return true;
        },
      ),
    );
  });
});
