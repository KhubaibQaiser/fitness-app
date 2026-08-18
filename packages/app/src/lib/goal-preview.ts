import type { PublicConfig } from '@gymos/contracts';
import {
  bmr,
  computeTargets,
  resolvePaceEnergy,
  tdee,
  type ActivityLevel,
  type GoalPreset,
  type GoalRate,
  type NutritionRefusal,
  type PaceClampReason,
  type Sex,
} from '@gymos/core/nutrition';
import { formatPaceKgPerWeek, weeklyDeltaKgFromPublicConfig } from './goal-pace';

const MS_PER_DAY = 86_400_000;

export type GoalPreviewInput = {
  sex: Sex;
  dob?: string | null;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  preset: GoalPreset;
  rate: GoalRate;
  startWeightKg: number;
  targetWeightKg: number | null;
  targetKcal?: number;
  config?: PublicConfig;
  today?: Date;
};

export type GoalSafetyIssue = {
  code: NutritionRefusal['code'];
  title: string;
  detail: string;
};

export type GoalPaceAdjustment = {
  reasons: readonly PaceClampReason[];
  title: string;
  detail: string;
};

export type GoalPreview = {
  ageYears: number;
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  requestedKcal: number;
  dailyEnergyDeltaKcal: number;
  deficitPct: number;
  expectedWeeklyDeltaKg: number;
  etaWeeks: number | null;
  estimatedTargetDate: string | null;
  safetyIssue: GoalSafetyIssue | null;
  paceAdjustment: GoalPaceAdjustment | null;
  recommendedKcal: number;
  kcalOverridden: boolean;
  beyondRecommended: boolean;
  belowSexFloor: boolean;
  macrosDegraded: boolean;
};

export const ageYearsFromDob = (dob: string | null | undefined, today = new Date()): number => {
  if (dob === null || dob === undefined || dob.trim() === '') return 30;
  const birth = new Date(`${dob}T00:00:00Z`);
  if (!Number.isFinite(birth.getTime()) || birth.getTime() >= today.getTime()) return 30;
  let years = today.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) years -= 1;
  return years > 0 ? years : 30;
};

export const estimateGoalWeeks = (
  startWeightKg: number,
  targetWeightKg: number | null,
  weeklyDeltaKg: number,
): number | null => {
  if (targetWeightKg === null || weeklyDeltaKg === 0) return null;
  const requiredDelta = targetWeightKg - startWeightKg;
  if (requiredDelta === 0) return 0;
  if (Math.sign(requiredDelta) !== Math.sign(weeklyDeltaKg)) return null;
  const weeks = Math.abs(requiredDelta / weeklyDeltaKg);
  return Number.isFinite(weeks) ? weeks : null;
};

export const formatGoalEta = (weeks: number | null): string => {
  if (weeks === null) return 'Not available';
  if (weeks === 0) return 'Goal reached';
  const roundedWeeks = Math.max(1, Math.ceil(weeks));
  if (roundedWeeks > 104) return 'More than 2 years';
  if (roundedWeeks >= 8) {
    const months = Math.max(2, Math.round(roundedWeeks / 4.345));
    return `About ${months} months`;
  }
  return `About ${roundedWeeks} ${roundedWeeks === 1 ? 'week' : 'weeks'}`;
};

export const formatPreviewDate = (isoDate: string | null): string => {
  if (isoDate === null) return 'No projected date';
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return 'No projected date';
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

const safetyIssueFrom = (refusal: NutritionRefusal): GoalSafetyIssue => {
  if (refusal.code === 'CALORIE_FLOOR_VIOLATION' || refusal.code === 'DEFICIT_CAP_EXCEEDED') {
    return {
      code: refusal.code,
      title: 'Target calories could not be computed',
      detail: 'Return to Goal and choose a different pace.',
    };
  }
  return {
    code: refusal.code,
    title: 'Calories cannot support the minimum macros',
    detail:
      'The safe calorie target cannot fit minimum protein and fat. Return to Goal and choose a gentler pace.',
  };
};

const paceAdjustmentFrom = (
  reasons: readonly PaceClampReason[],
  requestedKcal: number,
  targetKcal: number,
  expectedWeeklyDeltaKg: number,
): GoalPaceAdjustment | null => {
  if (reasons.length === 0) return null;
  const weekly = formatPaceKgPerWeek(expectedWeeklyDeltaKg);
  const requested = requestedKcal.toLocaleString();
  const target = targetKcal.toLocaleString();
  if (reasons[0] === 'DEFICIT_CAP') {
    return {
      reasons,
      title: 'Pace limited to the safe deficit',
      detail: `This pace requested ${requested} kcal/day. The 25% deficit cap sets the target at ${target} kcal/day (${weekly}).`,
    };
  }
  if (reasons[0] === 'CALORIE_FLOOR') {
    return {
      reasons,
      title: 'Pace limited by the calorie floor',
      detail: `This pace requested ${requested} kcal/day. The minimum for this client is ${target} kcal/day (${weekly}).`,
    };
  }
  if (reasons[0] === 'SURPLUS_CAP') {
    return {
      reasons,
      title: 'Pace limited to the safe surplus',
      detail: `This pace requested ${requested} kcal/day. The 15% surplus cap sets the target at ${target} kcal/day (${weekly}).`,
    };
  }
  return {
    reasons,
    title: 'Pace limited to 1% of body weight per week',
    detail: `This pace requested ${requested} kcal/day. The weekly-rate cap sets the target at ${target} kcal/day (${weekly}).`,
  };
};

export const buildGoalPreview = (input: GoalPreviewInput): GoalPreview => {
  const today = input.today ?? new Date();
  const ageYears = ageYearsFromDob(input.dob, today);
  const physiology = {
    sex: input.sex,
    ageYears,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    activity: input.activity,
  } as const;
  const rawTdee = tdee(physiology);
  const weeklyOverride = weeklyDeltaKgFromPublicConfig(input.config, input.preset, input.rate);
  const computation = computeTargets(physiology, input.preset, input.rate, {
    ...(weeklyOverride !== undefined ? { weeklyDeltaKg: weeklyOverride } : {}),
    ...(input.targetKcal !== undefined ? { targetKcal: input.targetKcal } : {}),
  });

  const energy = computation.ok
    ? {
        bmrKcal: computation.value.bmr,
        tdeeKcal: computation.value.tdee,
        targetKcal: computation.value.targets.kcal,
        requestedKcal: computation.value.requestedKcal,
        expectedWeeklyDeltaKg: computation.value.expectedWeeklyDeltaKg,
        clampReasons: computation.value.clampReasons,
        recommendedKcal: computation.value.recommendedKcal,
        kcalOverridden: computation.value.kcalOverridden,
        beyondRecommended: computation.value.beyondRecommended,
        belowSexFloor: computation.value.belowSexFloor,
        macrosDegraded: computation.value.macrosDegraded,
      }
    : (() => {
        const paced = resolvePaceEnergy(rawTdee, input.preset, input.rate, {
          sex: input.sex,
          weightKg: input.weightKg,
          ...(weeklyOverride !== undefined ? { weeklyDeltaKg: weeklyOverride } : {}),
          ...(input.targetKcal !== undefined ? { targetKcal: input.targetKcal } : {}),
        });
        return {
          bmrKcal: Math.round(bmr(physiology)),
          tdeeKcal: Math.round(rawTdee),
          targetKcal: paced.targetKcal,
          requestedKcal: paced.requestedKcal,
          expectedWeeklyDeltaKg: paced.expectedWeeklyDeltaKg,
          clampReasons: paced.clampReasons,
          recommendedKcal: paced.recommendedKcal,
          kcalOverridden: paced.kcalOverridden,
          beyondRecommended: paced.beyondRecommended,
          belowSexFloor: paced.belowSexFloor,
          macrosDegraded: false,
        };
      })();

  const refusal: NutritionRefusal | null = computation.ok ? null : computation.error;

  const etaWeeks = estimateGoalWeeks(
    input.startWeightKg,
    input.targetWeightKg,
    energy.expectedWeeklyDeltaKg,
  );
  const targetDate =
    etaWeeks === null
      ? null
      : new Date(today.getTime() + Math.ceil(etaWeeks * 7) * MS_PER_DAY).toISOString().slice(0, 10);
  const dailyEnergyDeltaKcal = energy.targetKcal - energy.tdeeKcal;

  return {
    ageYears,
    bmrKcal: energy.bmrKcal,
    tdeeKcal: energy.tdeeKcal,
    targetKcal: energy.targetKcal,
    requestedKcal: energy.requestedKcal,
    dailyEnergyDeltaKcal,
    deficitPct:
      energy.tdeeKcal > 0
        ? Math.max(0, (energy.tdeeKcal - energy.targetKcal) / energy.tdeeKcal)
        : 0,
    expectedWeeklyDeltaKg: energy.expectedWeeklyDeltaKg,
    etaWeeks,
    estimatedTargetDate: targetDate,
    safetyIssue: refusal !== null ? safetyIssueFrom(refusal) : null,
    paceAdjustment: paceAdjustmentFrom(
      energy.clampReasons,
      energy.requestedKcal,
      energy.targetKcal,
      energy.expectedWeeklyDeltaKg,
    ),
    recommendedKcal: energy.recommendedKcal,
    kcalOverridden: energy.kcalOverridden,
    beyondRecommended: energy.beyondRecommended,
    belowSexFloor: energy.belowSexFloor,
    macrosDegraded: energy.macrosDegraded,
  };
};
