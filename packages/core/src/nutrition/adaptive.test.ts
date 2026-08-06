import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ADAPTIVE,
  evaluateProgress,
  netTrendChangeKg,
  retargetMacros,
  trendWeights,
  weeklySlope,
  type AdaptiveInput,
  type WeighIn,
} from './adaptive';
import { CALORIE_FLOOR_KCAL, MAX_DEFICIT_FRACTION } from './floors';
import { type MacroTargets } from './types';

const DAY = 86_400_000;
const NOW = 1_750_000_000_000;

/** Daily weigh-ins ending at NOW: weight drifts by deltaPerDay each day. */
const daily = (startKg: number, deltaPerDay: number, days: number): WeighIn[] =>
  Array.from({ length: days }, (_, i) => ({
    t: NOW - (days - 1 - i) * DAY,
    weightKg: startKg + i * deltaPerDay,
  }));

const TARGETS: MacroTargets = { kcal: 2400, proteinG: 176, fatG: 72, carbsG: 262, fiberG: 34 };

const baseInput = (over: Partial<AdaptiveInput> = {}): AdaptiveInput => ({
  sex: 'M',
  weightKg: 80,
  goal: { preset: 'LOSE', rate: 'STANDARD', expectedWeeklyDeltaKg: -0.5 },
  currentTargets: TARGETS,
  tdeeEstimate: 2900,
  weighIns: daily(80, -0.5 / 7, 21),
  adherenceRatings: [4, 5, 4],
  hasMedicalFlags: false,
  now: NOW,
  ...over,
});

describe('trendWeights', () => {
  it('starts at the first weight and smooths subsequent points', () => {
    const trend = trendWeights(
      [
        { t: 0, weightKg: 100 },
        { t: DAY, weightKg: 90 },
      ],
      0.25,
    );
    expect(trend.map((p) => p.weightKg)).toEqual([100, 97.5]);
  });

  it('sorts chronologically before smoothing', () => {
    const trend = trendWeights(
      [
        { t: DAY, weightKg: 90 },
        { t: 0, weightKg: 100 },
      ],
      0.25,
    );
    expect(trend[0]?.weightKg).toBe(100);
  });
});

describe('weeklySlope', () => {
  it('returns 0 for empty and single-point series', () => {
    expect(weeklySlope([])).toBe(0);
    expect(weeklySlope([{ t: 0, weightKg: 80 }])).toBe(0);
  });

  it('computes kg/week from a linear series', () => {
    expect(
      weeklySlope([
        { t: 0, weightKg: 100 },
        { t: DAY, weightKg: 99 },
      ]),
    ).toBeCloseTo(-7, 6);
  });

  it('returns 0 when all points share a timestamp (zero variance)', () => {
    expect(
      weeklySlope([
        { t: 0, weightKg: 100 },
        { t: 0, weightKg: 90 },
      ]),
    ).toBe(0);
  });
});

describe('netTrendChangeKg', () => {
  it('is 0 for empty input and |last − first| otherwise', () => {
    expect(netTrendChangeKg([])).toBe(0);
    expect(
      netTrendChangeKg([
        { t: 0, weightKg: 80 },
        { t: DAY, weightKg: 79.2 },
      ]),
    ).toBeCloseTo(0.8, 6);
  });
});

describe('retargetMacros', () => {
  it('keeps protein fixed and absorbs the change into carbs', () => {
    const next = retargetMacros(TARGETS, 2200, 80);
    expect(next.proteinG).toBe(TARGETS.proteinG);
    expect(next.fatG).toBe(TARGETS.fatG);
    expect(next.kcal).toBe(2200);
    expect(next.carbsG).toBe(Math.round((2200 - 176 * 4 - 72 * 9) / 4));
  });

  it('degrades fat toward its 0.8 g/kg floor when carbs run out', () => {
    // 1300 kcal < protein(704) + current fat(648): fat must shrink, carbs near zero.
    const next = retargetMacros(TARGETS, 1300, 80);
    expect(next.proteinG).toBe(176);
    expect(next.fatG).toBe(Math.floor((1300 - 176 * 4) / 9)); // 66g — above the 64g floor
    expect(next.fatG).toBeGreaterThanOrEqual(Math.round(0.8 * 80));
    expect(next.carbsG).toBeLessThanOrEqual(1);
  });

  it('clamps carbs at zero when even floor fat cannot fit', () => {
    const next = retargetMacros(TARGETS, 1200, 80);
    expect(next.fatG).toBe(Math.round(0.8 * 80));
    expect(next.carbsG).toBe(0);
  });
});

describe('evaluateProgress — data sufficiency', () => {
  it('needs enough weigh-ins', () => {
    const verdict = evaluateProgress(baseInput({ weighIns: daily(80, -0.1, 3) }));
    expect(verdict.type).toBe('INSUFFICIENT_DATA');
  });

  it('needs enough span even with enough points', () => {
    const verdict = evaluateProgress(baseInput({ weighIns: daily(80, -0.1, 5) }));
    expect(verdict.type).toBe('INSUFFICIENT_DATA');
  });

  it('handles an empty series', () => {
    const verdict = evaluateProgress(baseInput({ weighIns: [] }));
    expect(verdict.type).toBe('INSUFFICIENT_DATA');
    expect(verdict.confidence).toBeGreaterThanOrEqual(0);
    expect(verdict.confidence).toBeLessThanOrEqual(1);
  });

  it('ignores weigh-ins outside the window', () => {
    const stale = daily(80, -0.1, 21).map((w) => ({ ...w, t: w.t - 60 * DAY }));
    const verdict = evaluateProgress(baseInput({ weighIns: stale }));
    expect(verdict.type).toBe('INSUFFICIENT_DATA');
  });
});

describe('evaluateProgress — verdicts', () => {
  it('HOLDs when actual tracks expected within the band', () => {
    const verdict = evaluateProgress(baseInput());
    expect(verdict.type).toBe('HOLD');
    if (verdict.type === 'HOLD') {
      expect(
        Math.abs(verdict.actualWeeklyDeltaKg - verdict.expectedWeeklyDeltaKg),
      ).toBeLessThanOrEqual(ADAPTIVE.holdBandKgPerWeek);
      expect(verdict.observedTdeeEstimate).toBeGreaterThan(0);
    }
  });

  it('ADJUSTs down (damped, uncapped) when losing slower than expected with good adherence', () => {
    const verdict = evaluateProgress(
      baseInput({ weighIns: daily(80, -0.25 / 7, 21), adherenceRatings: [5, 5, 5] }),
    );
    expect(verdict.type).toBe('ADJUST_TARGETS');
    if (verdict.type === 'ADJUST_TARGETS') {
      expect(verdict.deltaKcalPerDay).toBeLessThan(0);
      expect(verdict.deltaKcalPerDay).toBeGreaterThanOrEqual(-ADAPTIVE.maxStepKcalPerDay);
      expect(verdict.clampedBySafety).toBe(false);
      expect(verdict.newTargets.kcal).toBe(TARGETS.kcal + verdict.deltaKcalPerDay);
      expect(verdict.newTargets.proteinG).toBe(TARGETS.proteinG);
    }
  });

  it('caps a single adjustment step at ±200 kcal/day', () => {
    const verdict = evaluateProgress(
      baseInput({ weighIns: daily(80, 0.1 / 7, 21), adherenceRatings: [5, 5, 5] }),
    );
    expect(verdict.type).toBe('ADJUST_TARGETS');
    if (verdict.type === 'ADJUST_TARGETS') {
      expect(verdict.deltaKcalPerDay).toBe(-ADAPTIVE.maxStepKcalPerDay);
      expect(verdict.clampedBySafety).toBe(false);
    }
  });

  it('clamps into the safe band instead of breaching floors/deficit cap', () => {
    const verdict = evaluateProgress(
      baseInput({
        currentTargets: { ...TARGETS, kcal: 2200 },
        weighIns: daily(80, 0.1 / 7, 21),
        adherenceRatings: [5, 5, 5],
      }),
    );
    expect(verdict.type).toBe('ADJUST_TARGETS');
    if (verdict.type === 'ADJUST_TARGETS') {
      const deficitFloor = Math.ceil(2900 * (1 - MAX_DEFICIT_FRACTION));
      expect(verdict.clampedBySafety).toBe(true);
      expect(verdict.newTargets.kcal).toBe(deficitFloor);
    }
  });

  it('ADJUSTs up when gaining slower than expected (GAIN direction sign)', () => {
    const verdict = evaluateProgress(
      baseInput({
        goal: { preset: 'GAIN', rate: 'STANDARD', expectedWeeklyDeltaKg: 0.25 },
        weighIns: daily(80, 0.04 / 7, 21),
        adherenceRatings: [5, 5, 5],
      }),
    );
    expect(verdict.type).toBe('ADJUST_TARGETS');
    if (verdict.type === 'ADJUST_TARGETS') {
      expect(verdict.deltaKcalPerDay).toBeGreaterThan(0);
    }
  });

  it('prescribes ADHERENCE_FOCUS instead of cutting targets when adherence is low', () => {
    const verdict = evaluateProgress(
      baseInput({ weighIns: daily(80, -0.25 / 7, 21), adherenceRatings: [2, 3, 2] }),
    );
    expect(verdict.type).toBe('ADHERENCE_FOCUS');
    if (verdict.type === 'ADHERENCE_FOCUS') {
      expect(verdict.meanAdherence).toBeLessThan(ADAPTIVE.adherenceFocusBelow);
    }
  });

  it('skips the adherence gate when no ratings exist and adjusts directly', () => {
    const verdict = evaluateProgress(
      baseInput({ weighIns: daily(80, -0.25 / 7, 21), adherenceRatings: [] }),
    );
    expect(verdict.type).toBe('ADJUST_TARGETS');
  });

  it('detects a LOSE plateau with high adherence and suggests the protocol', () => {
    const verdict = evaluateProgress(
      baseInput({ weighIns: daily(80, 0, 22), adherenceRatings: [4, 5, 4] }),
    );
    expect(verdict.type).toBe('PLATEAU_PROTOCOL');
  });

  it('does not run the plateau protocol for GAIN goals', () => {
    const verdict = evaluateProgress(
      baseInput({
        goal: { preset: 'GAIN', rate: 'STANDARD', expectedWeeklyDeltaKg: 0.25 },
        weighIns: daily(80, 0, 22),
        adherenceRatings: [4, 5, 4],
      }),
    );
    expect(verdict.type).toBe('ADJUST_TARGETS');
    if (verdict.type === 'ADJUST_TARGETS') expect(verdict.deltaKcalPerDay).toBeGreaterThan(0);
  });
});

describe('evaluateProgress — red flags', () => {
  it('refers on hypertensive-crisis blood pressure (systolic or diastolic)', () => {
    const systolic = evaluateProgress(baseInput({ vitals: { bpSystolic: 185, bpDiastolic: 95 } }));
    expect(systolic.type).toBe('REFER_REVIEW');
    if (systolic.type === 'REFER_REVIEW') expect(systolic.flags).toContain('BP_CRISIS');

    const diastolic = evaluateProgress(
      baseInput({ vitals: { bpSystolic: 130, bpDiastolic: 125 } }),
    );
    expect(diastolic.type).toBe('REFER_REVIEW');
    if (diastolic.type === 'REFER_REVIEW') expect(diastolic.flags).toContain('BP_CRISIS');
  });

  it('refers on elevated BP only when medical flags are present', () => {
    const withMedical = evaluateProgress(
      baseInput({ hasMedicalFlags: true, vitals: { bpSystolic: 145, bpDiastolic: 85 } }),
    );
    expect(withMedical.type).toBe('REFER_REVIEW');
    if (withMedical.type === 'REFER_REVIEW') {
      expect(withMedical.flags).toContain('BP_ELEVATED_WITH_MEDICAL');
    }

    const diastolicOnly = evaluateProgress(
      baseInput({ hasMedicalFlags: true, vitals: { bpSystolic: 120, bpDiastolic: 95 } }),
    );
    expect(diastolicOnly.type).toBe('REFER_REVIEW');
    if (diastolicOnly.type === 'REFER_REVIEW') {
      expect(diastolicOnly.flags).toContain('BP_ELEVATED_WITH_MEDICAL');
    }

    const withoutMedical = evaluateProgress(
      baseInput({ vitals: { bpSystolic: 145, bpDiastolic: 91 } }),
    );
    expect(withoutMedical.type).toBe('HOLD');
  });

  it('ignores partial BP readings', () => {
    const verdict = evaluateProgress(baseInput({ vitals: { bpSystolic: 190 } }));
    expect(verdict.type).toBe('HOLD');
  });

  it('refers on resting-HR spike over baseline; ignores missing baseline', () => {
    const spike = evaluateProgress(baseInput({ vitals: { restingHr: 75, baselineRestingHr: 58 } }));
    expect(spike.type).toBe('REFER_REVIEW');
    if (spike.type === 'REFER_REVIEW') expect(spike.flags).toContain('RHR_SPIKE');

    const noBaseline = evaluateProgress(baseInput({ vitals: { restingHr: 75 } }));
    expect(noBaseline.type).toBe('HOLD');
  });

  it('refers on sustained rapid loss (>1.5% BW/week over ≥14 days)', () => {
    const verdict = evaluateProgress(
      baseInput({ weighIns: daily(80, -0.22, 21), adherenceRatings: [5, 5] }),
    );
    expect(verdict.type).toBe('REFER_REVIEW');
    if (verdict.type === 'REFER_REVIEW') expect(verdict.flags).toContain('RAPID_LOSS');
  });

  it('does not flag rapid loss on short spans', () => {
    const verdict = evaluateProgress(
      baseInput({ weighIns: daily(80, -0.22, 13), adherenceRatings: [5, 5] }),
    );
    expect(verdict.type).not.toBe('REFER_REVIEW');
  });
});

describe('evaluateProgress — safety properties', () => {
  it('never recommends targets below floors or beyond the deficit cap (property)', () => {
    fc.assert(
      fc.property(
        fc.record({
          sex: fc.constantFrom('F' as const, 'M' as const),
          currentKcal: fc.integer({ min: 1200, max: 3500 }),
          tdee: fc.integer({ min: 1600, max: 4000 }),
          deltaPerDay: fc.double({ min: -0.12, max: 0.12, noNaN: true }),
          adherence: fc.constantFrom(4, 5),
          weightKg: fc.integer({ min: 50, max: 150 }),
        }),
        ({ sex, currentKcal, tdee, deltaPerDay, adherence, weightKg }) => {
          const verdict = evaluateProgress(
            baseInput({
              sex,
              weightKg,
              tdeeEstimate: tdee,
              currentTargets: { ...TARGETS, kcal: currentKcal },
              weighIns: daily(weightKg, deltaPerDay, 21),
              adherenceRatings: [adherence, adherence],
            }),
          );
          expect(verdict.confidence).toBeGreaterThanOrEqual(0);
          expect(verdict.confidence).toBeLessThanOrEqual(1);
          if (verdict.type === 'ADJUST_TARGETS') {
            expect(verdict.newTargets.kcal).toBeGreaterThanOrEqual(CALORIE_FLOOR_KCAL[sex]);
            expect(verdict.newTargets.kcal).toBeGreaterThanOrEqual(
              Math.ceil(tdee * (1 - MAX_DEFICIT_FRACTION)),
            );
            expect(verdict.newTargets.proteinG).toBe(TARGETS.proteinG);
            if (!verdict.clampedBySafety) {
              expect(Math.abs(verdict.deltaKcalPerDay)).toBeLessThanOrEqual(
                ADAPTIVE.maxStepKcalPerDay,
              );
            }
          }
          return true;
        },
      ),
    );
  });
});
