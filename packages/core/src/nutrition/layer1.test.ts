import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { assertSafeTargetKcal, CALORIE_FLOOR_KCAL, clampToSafeKcal } from './floors';
import { bmr, computeTargets, goalDeltaFraction, splitMacros, tdee } from './layer1';
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

  it('refuses when the target lands below the calorie floor', () => {
    const petite: PhysiologyInput = {
      sex: 'F',
      ageYears: 55,
      heightCm: 150,
      weightKg: 45,
      activity: 1.2,
    };
    const result = computeTargets(petite, 'LOSE', 'AGGRESSIVE');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CALORIE_FLOOR_VIOLATION');
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
          // Macro energy reconciles with the kcal target (rounding tolerance).
          const macroKcal = targets.proteinG * 4 + targets.fatG * 9 + targets.carbsG * 4;
          expect(Math.abs(macroKcal - targets.kcal)).toBeLessThanOrEqual(12);
          return true;
        },
      ),
    );
  });
});
