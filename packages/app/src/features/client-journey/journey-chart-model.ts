import type { Goal, Vitals } from '@gymos/contracts';
import { formatWeight, type WeightUnit } from '@gymos/core/units';
import {
  journeyTrackStatus,
  type JourneyProjectionInput,
  type JourneyTrackStatus,
} from './client-journey';

const MS_PER_WEEK = 86_400_000 * 7;
const MILESTONES = [0.25, 0.5, 0.75] as const;
const SAME_DAY_MS = 86_400_000;

export type JourneyChartPoint = { t: number; weightKg: number };

export type JourneyChartMilestone = JourneyChartPoint & {
  ratio: number;
  label: string;
};

export type JourneyChartDirection = 'loss' | 'gain';

export type JourneyChartModel = {
  actual: JourneyChartPoint[];
  expected: JourneyChartPoint[];
  projected: JourneyChartPoint[];
  milestones: JourneyChartMilestone[];
  start: JourneyChartPoint;
  current: JourneyChartPoint;
  target: JourneyChartPoint;
  unitLabel: WeightUnit;
  direction: JourneyChartDirection;
  trackStatus: JourneyTrackStatus;
};

const parseDate = (value: string): Date | null => {
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) ? date : null;
};

const toDisplay = (kg: number, unit: WeightUnit): number => formatWeight(kg, unit, 1).value;

const chartableProjection = (goal: Goal): JourneyProjectionInput | null => {
  if (goal.targetWeightKg === null || goal.expectedWeeklyDeltaKg === 0) return null;
  const requiredDelta = goal.targetWeightKg - goal.startWeightKg;
  if (requiredDelta !== 0 && Math.sign(requiredDelta) !== Math.sign(goal.expectedWeeklyDeltaKg)) {
    return null;
  }
  return {
    startDate: goal.startDate,
    startWeightKg: goal.startWeightKg,
    targetWeightKg: goal.targetWeightKg,
    expectedWeeklyDeltaKg: goal.expectedWeeklyDeltaKg,
  };
};

const weeksToTarget = (fromKg: number, targetKg: number, weeklyDeltaKg: number): number | null => {
  const remaining = targetKg - fromKg;
  if (remaining === 0 || Math.sign(remaining) !== Math.sign(weeklyDeltaKg)) return null;
  const weeks = Math.abs(remaining / weeklyDeltaKg);
  return Number.isFinite(weeks) ? weeks : null;
};

const uniqueByTime = (points: JourneyChartPoint[]): JourneyChartPoint[] => {
  const byDay = new Map<number, JourneyChartPoint>();
  for (const point of [...points].sort((a, b) => a.t - b.t)) {
    byDay.set(Math.floor(point.t / SAME_DAY_MS), point);
  }
  return [...byDay.values()].sort((a, b) => a.t - b.t);
};

/** Build the presentational journey chart series in the coach's display unit. */
export const buildJourneyChartModel = ({
  goal,
  vitals,
  latestWeightKg,
  weightUnit,
  today = new Date(),
}: {
  goal: Goal;
  vitals: Vitals[];
  latestWeightKg: number | null;
  weightUnit: WeightUnit;
  today?: Date;
}): JourneyChartModel | null => {
  const projection = chartableProjection(goal);
  if (projection?.targetWeightKg == null) return null;

  const startDate = parseDate(goal.startDate);
  if (startDate === null) return null;

  const weeks = weeksToTarget(
    goal.startWeightKg,
    projection.targetWeightKg,
    goal.expectedWeeklyDeltaKg,
  );
  if (weeks === null) return null;

  const startT = startDate.getTime();
  const targetT = startT + weeks * MS_PER_WEEK;
  const startKg = goal.startWeightKg;
  const targetKg = projection.targetWeightKg;
  const direction: JourneyChartDirection = goal.expectedWeeklyDeltaKg < 0 ? 'loss' : 'gain';

  const vitalPoints = vitals
    .filter((row): row is Vitals & { weightKg: number } => row.weightKg !== null)
    .map((row) => ({ t: Date.parse(row.recordedAt), weightKg: row.weightKg }))
    .filter((row) => Number.isFinite(row.t));

  const startPoint = { t: startT, weightKg: startKg };
  const hasStartDayVital = vitalPoints.some((point) => Math.abs(point.t - startT) < SAME_DAY_MS);
  const actualKg = uniqueByTime(hasStartDayVital ? vitalPoints : [startPoint, ...vitalPoints]);
  const lastActual = actualKg[actualKg.length - 1] ?? startPoint;
  const currentKg = latestWeightKg ?? lastActual.weightKg;
  const current = { t: lastActual.t, weightKg: currentKg };

  const expectedKg: JourneyChartPoint[] = [
    { t: startT, weightKg: startKg },
    { t: targetT, weightKg: targetKg },
  ];

  const remainingWeeks = weeksToTarget(lastActual.weightKg, targetKg, goal.expectedWeeklyDeltaKg);
  const projectedKg: JourneyChartPoint[] =
    actualKg.length > 1 && remainingWeeks !== null
      ? [
          { t: lastActual.t, weightKg: lastActual.weightKg },
          { t: lastActual.t + remainingWeeks * MS_PER_WEEK, weightKg: targetKg },
        ]
      : [];

  const fullDelta = targetKg - startKg;
  const milestonesKg: JourneyChartMilestone[] = MILESTONES.map((ratio) => {
    const weightKg = startKg + fullDelta * ratio;
    const milestoneWeeks = Math.abs((weightKg - startKg) / goal.expectedWeeklyDeltaKg);
    return {
      t: startT + milestoneWeeks * MS_PER_WEEK,
      weightKg,
      ratio,
      label: `${Math.round(ratio * 100)}%`,
    };
  });

  const toUnit = (point: JourneyChartPoint): JourneyChartPoint => ({
    t: point.t,
    weightKg: toDisplay(point.weightKg, weightUnit),
  });

  return {
    actual: actualKg.map(toUnit),
    expected: expectedKg.map(toUnit),
    projected: projectedKg.map(toUnit),
    milestones: milestonesKg.map((item) => ({
      ...toUnit(item),
      ratio: item.ratio,
      label: item.label,
    })),
    start: toUnit(startPoint),
    current: toUnit(current),
    target: toUnit({ t: targetT, weightKg: targetKg }),
    unitLabel: weightUnit,
    direction,
    trackStatus: journeyTrackStatus(projection, currentKg, today),
  };
};
