import { describe, expect, it } from 'vitest';
import type { Goal, Vitals } from '@gymos/contracts';
import { buildJourneyChartModel } from './journey-chart-model';

const loseGoal: Goal = {
  id: 'goal-1',
  preset: 'LOSE',
  rate: 'CONSERVATIVE',
  startDate: '2026-08-01',
  startWeightKg: 80,
  targetWeightKg: 70,
  targetDate: null,
  expectedWeeklyDeltaKg: -0.5,
  initialTargets: null,
  tdeeEstimate: 2500,
  checkinWeekday: 1,
  status: 'ACTIVE',
};

const vital = (id: string, recordedAt: string, weightKg: number): Vitals => ({
  id,
  recordedAt,
  weightKg,
  bodyFatPct: null,
  muscleMassKg: null,
  chestCm: null,
  waistCm: null,
  hipCm: null,
  armCm: null,
  armLeftCm: null,
  armRightCm: null,
  thighCm: null,
  thighLeftCm: null,
  thighRightCm: null,
  restingHr: null,
  bpSystolic: null,
  bpDiastolic: null,
  notes: null,
});

describe('buildJourneyChartModel', () => {
  it('returns null for maintain, missing target, or wrong-direction goals', () => {
    expect(
      buildJourneyChartModel({
        goal: { ...loseGoal, targetWeightKg: 80, expectedWeeklyDeltaKg: 0, preset: 'MAINTAIN' },
        vitals: [],
        latestWeightKg: 80,
        weightUnit: 'kg',
      }),
    ).toBeNull();
    expect(
      buildJourneyChartModel({
        goal: { ...loseGoal, targetWeightKg: null },
        vitals: [],
        latestWeightKg: 80,
        weightUnit: 'kg',
      }),
    ).toBeNull();
    expect(
      buildJourneyChartModel({
        goal: { ...loseGoal, expectedWeeklyDeltaKg: 0.5 },
        vitals: [],
        latestWeightKg: 80,
        weightUnit: 'kg',
      }),
    ).toBeNull();
  });

  it('plots a start-only loss path with expected line, milestones, and no projection', () => {
    const model = buildJourneyChartModel({
      goal: loseGoal,
      vitals: [],
      latestWeightKg: 80,
      weightUnit: 'kg',
      today: new Date('2026-08-15T00:00:00Z'),
    });
    expect(model).not.toBeNull();
    if (model === null) return;
    expect(model.direction).toBe('loss');
    expect(model.unitLabel).toBe('kg');
    expect(model.actual).toEqual([{ t: Date.parse('2026-08-01T00:00:00Z'), weightKg: 80 }]);
    expect(model.expected).toEqual([
      { t: Date.parse('2026-08-01T00:00:00Z'), weightKg: 80 },
      { t: Date.parse('2026-08-01T00:00:00Z') + 20 * 7 * 86_400_000, weightKg: 70 },
    ]);
    expect(model.projected).toEqual([]);
    expect(model.milestones.map((item) => item.label)).toEqual(['25%', '50%', '75%']);
    expect(model.milestones[1]?.weightKg).toBe(75);
    expect(model.current.weightKg).toBe(80);
    expect(model.target.weightKg).toBe(70);
    expect(model.trackStatus).toBe('behind');
  });

  it('overlays vitals on a gain goal and projects from the last weigh-in', () => {
    const gain: Goal = {
      ...loseGoal,
      preset: 'GAIN',
      startWeightKg: 70,
      targetWeightKg: 74,
      expectedWeeklyDeltaKg: 0.5,
    };
    const model = buildJourneyChartModel({
      goal: gain,
      vitals: [vital('v1', '2026-08-15T10:00:00Z', 71)],
      latestWeightKg: 71,
      weightUnit: 'kg',
      today: new Date('2026-08-15T00:00:00Z'),
    });
    expect(model).not.toBeNull();
    if (model === null) return;
    expect(model.direction).toBe('gain');
    expect(model.actual.map((p) => p.weightKg)).toEqual([70, 71]);
    expect(model.projected).toHaveLength(2);
    expect(model.projected[0]?.weightKg).toBe(71);
    expect(model.projected[1]?.weightKg).toBe(74);
    expect(model.trackStatus).toBe('on-track');
  });

  it('converts the series into pounds before the chart renders', () => {
    const model = buildJourneyChartModel({
      goal: loseGoal,
      vitals: [vital('v1', '2026-08-15T10:00:00Z', 80)],
      latestWeightKg: 80,
      weightUnit: 'lb',
    });
    expect(model).not.toBeNull();
    if (model === null) return;
    expect(model.unitLabel).toBe('lb');
    expect(model.start.weightKg).toBe(176.4);
    expect(model.target.weightKg).toBe(154.3);
    expect(model.actual[0]?.weightKg).toBe(176.4);
  });

  it('does not duplicate start when a vital lands on the start day', () => {
    const model = buildJourneyChartModel({
      goal: loseGoal,
      vitals: [vital('v1', '2026-08-01T08:00:00Z', 79.8)],
      latestWeightKg: 79.8,
      weightUnit: 'kg',
    });
    expect(model).not.toBeNull();
    if (model === null) return;
    expect(model.actual).toHaveLength(1);
    expect(model.actual[0]?.weightKg).toBe(79.8);
  });
});
