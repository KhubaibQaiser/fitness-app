import {
  calorieFloor,
  nearestGoalRate,
  paceSliderBounds,
  recommendedKcalForPace,
  resolvePaceEnergy,
  tdee,
  type ActivityLevel,
  type GoalPreset,
  type GoalRate,
  type Sex,
} from '@gymos/core/nutrition';
import type { PaceSliderTone, PaceSliderWarning } from '@gymos/ui';
import { GOAL_RATE_OPTIONS } from './goal-options';
import { formatPaceKgPerWeek } from './goal-pace';

export type PaceControlInput = {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  preset: GoalPreset;
  rate: GoalRate;
  targetKcal?: number;
  weeklyDeltaForRate?: (rate: GoalRate) => number | undefined;
};

export type PaceControlView = {
  min: number;
  max: number;
  value: number;
  ticks: { value: number; label: string }[];
  suggestedValue: number;
  tone: PaceSliderTone;
  hint: string;
  helper: string;
  warning: PaceSliderWarning;
  nearestRate: GoalRate;
  recommendedKcal: number;
  sexFloorKcal: number;
  kcalOverridden: boolean;
  beyondRecommended: boolean;
  belowSexFloor: boolean;
  expectedWeeklyDeltaKg: number;
};

export const buildPaceControlView = (input: PaceControlInput): PaceControlView => {
  const physiology = {
    sex: input.sex,
    ageYears: input.ageYears,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    activity: input.activity,
  };
  const tdeeKcal = tdee(physiology);
  const weeklyFor = (rate: GoalRate): number | undefined => input.weeklyDeltaForRate?.(rate);
  const energyInputFor = (rate: GoalRate) => {
    const weeklyDeltaKg = weeklyFor(rate);
    return {
      sex: input.sex,
      weightKg: input.weightKg,
      ...(weeklyDeltaKg !== undefined ? { weeklyDeltaKg } : {}),
    };
  };
  const bounds = paceSliderBounds(tdeeKcal, input.preset);
  const ticks = GOAL_RATE_OPTIONS.map((option) => ({
    value: recommendedKcalForPace(
      tdeeKcal,
      input.preset,
      option.value,
      energyInputFor(option.value),
    ),
    label: option.label,
  }));
  const suggestedValue = recommendedKcalForPace(
    tdeeKcal,
    input.preset,
    'STANDARD',
    energyInputFor('STANDARD'),
  );
  const currentWeekly = weeklyFor(input.rate);
  const energy = resolvePaceEnergy(tdeeKcal, input.preset, input.rate, {
    sex: input.sex,
    weightKg: input.weightKg,
    ...(currentWeekly !== undefined ? { weeklyDeltaKg: currentWeekly } : {}),
    ...(input.targetKcal !== undefined ? { targetKcal: input.targetKcal } : {}),
  });
  const value = Math.min(bounds.max, Math.max(bounds.min, energy.targetKcal));
  const nearestRate = nearestGoalRate(tdeeKcal, input.preset, value, energyInputFor(input.rate));
  const recommendedKcal = recommendedKcalForPace(
    tdeeKcal,
    input.preset,
    nearestRate,
    energyInputFor(nearestRate),
  );
  const sexFloorKcal = calorieFloor(input.sex);

  let warning: PaceSliderWarning = 'none';
  if (energy.belowSexFloor) warning = 'floor';
  else if (energy.beyondRecommended) warning = 'beyond';
  else if (energy.kcalOverridden) warning = 'custom';

  let helper = 'Suggested for this goal.';
  if (warning === 'custom') {
    helper = `Custom target · suggested is ${suggestedValue.toLocaleString()} kcal.`;
  } else if (warning === 'beyond') {
    helper =
      'Beyond the recommended Aggressive pace. This may not be healthy for every client. Review at check-in.';
  } else if (warning === 'floor') {
    helper = `Below the ${sexFloorKcal.toLocaleString()} kcal minimum for this client. This may not be healthy. Review at check-in.`;
  }

  return {
    min: bounds.min,
    max: bounds.max,
    value,
    ticks,
    suggestedValue,
    tone: bounds.tone,
    hint: formatPaceKgPerWeek(energy.expectedWeeklyDeltaKg),
    helper,
    warning,
    nearestRate,
    recommendedKcal,
    sexFloorKcal,
    kcalOverridden: energy.kcalOverridden,
    beyondRecommended: energy.beyondRecommended,
    belowSexFloor: energy.belowSexFloor,
    expectedWeeklyDeltaKg: energy.expectedWeeklyDeltaKg,
  };
};

/** Map a slider kcal onto the nearest named pace (Standard when all ticks coincide). */
export const rateFromSliderKcal = (
  kcal: number,
  ticks: readonly PaceControlView['ticks'][number][],
): GoalRate => {
  const unique = new Set(ticks.map((tick) => tick.value));
  if (unique.size <= 1) return 'STANDARD';
  const first = ticks[0];
  if (first === undefined) return 'STANDARD';
  const nearest = ticks.reduce((best, tick) =>
    Math.abs(tick.value - kcal) < Math.abs(best.value - kcal) ? tick : best,
  );
  return GOAL_RATE_OPTIONS.find((option) => option.label === nearest.label)?.value ?? 'AGGRESSIVE';
};
