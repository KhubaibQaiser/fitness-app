import type { PublicConfig } from '@gymos/contracts';
import {
  assertSafeTargetKcal,
  bmr,
  computeTargets,
  splitMacros,
  tdee,
  type ActivityLevel,
  type GoalPreset,
  type GoalRate,
  type NutritionRefusal,
  type Sex,
} from '@gymos/core/nutrition';
import { targetKcalFromPace, weeklyDeltaKgFromPublicConfig } from './goal-pace';

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
  config?: PublicConfig;
  today?: Date;
};

export type GoalSafetyIssue = {
  code: NutritionRefusal['code'];
  title: string;
  detail: string;
};

export type GoalPreview = {
  ageYears: number;
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  dailyEnergyDeltaKcal: number;
  deficitPct: number;
  expectedWeeklyDeltaKg: number;
  etaWeeks: number | null;
  estimatedTargetDate: string | null;
  safetyIssue: GoalSafetyIssue | null;
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

const safetyIssueFrom = (
  refusal: NutritionRefusal,
  tdeeKcal: number,
  expectedWeeklyDeltaKg: number,
): GoalSafetyIssue => {
  if (refusal.code === 'CALORIE_FLOOR_VIOLATION') {
    return {
      code: refusal.code,
      title: 'Target calories are below the safe floor',
      detail: `This pace requests ${refusal.requestedKcal.toLocaleString()} kcal/day. The minimum for this client is ${refusal.floorKcal.toLocaleString()} kcal/day. Return to Goal and choose a gentler pace.`,
    };
  }
  if (refusal.code === 'DEFICIT_CAP_EXCEEDED') {
    const maxWeeklyLossKg = (tdeeKcal * refusal.maxDeficitPct * 7) / 7700;
    return {
      code: refusal.code,
      title: 'Planned deficit is too aggressive',
      detail: `This pace requires a ${Math.round(refusal.requestedDeficitPct * 100)}% deficit. The limit is ${Math.round(refusal.maxDeficitPct * 100)}%, about ${maxWeeklyLossKg.toFixed(2)} kg/week for this client (requested ${Math.abs(expectedWeeklyDeltaKg).toFixed(2)} kg/week).`,
    };
  }
  return {
    code: refusal.code,
    title: 'Calories cannot support the minimum macros',
    detail:
      'The requested calories cannot fit minimum protein and fat targets. Return to Goal and choose a gentler pace.',
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
  const rawBmr = bmr(physiology);
  const rawTdee = tdee(physiology);
  const pace = targetKcalFromPace(rawTdee, input.preset, input.rate, input.config);
  const weeklyOverride = weeklyDeltaKgFromPublicConfig(input.config, input.preset, input.rate);
  const computation = computeTargets(
    physiology,
    input.preset,
    input.rate,
    weeklyOverride !== undefined ? { weeklyDeltaKg: weeklyOverride } : undefined,
  );

  // Preserve requested figures even when Layer 1 refuses them.
  let refusal: NutritionRefusal | null = computation.ok ? null : computation.error;
  if (refusal === null) {
    const safe = assertSafeTargetKcal(pace.targetKcal, rawTdee, input.sex);
    if (!safe.ok) refusal = safe.error;
  }
  if (refusal === null) {
    const macros = splitMacros(pace.targetKcal, input.weightKg, input.preset);
    if (!macros.ok) refusal = macros.error;
  }

  const etaWeeks = estimateGoalWeeks(input.startWeightKg, input.targetWeightKg, pace.weeklyDeltaKg);
  const targetDate =
    etaWeeks === null
      ? null
      : new Date(today.getTime() + Math.ceil(etaWeeks * 7) * MS_PER_DAY).toISOString().slice(0, 10);
  const dailyEnergyDeltaKcal = pace.targetKcal - Math.round(rawTdee);

  return {
    ageYears,
    bmrKcal: Math.round(rawBmr),
    tdeeKcal: Math.round(rawTdee),
    targetKcal: pace.targetKcal,
    dailyEnergyDeltaKcal,
    deficitPct: rawTdee > 0 ? Math.max(0, (rawTdee - pace.targetKcal) / rawTdee) : 0,
    expectedWeeklyDeltaKg: pace.weeklyDeltaKg,
    etaWeeks,
    estimatedTargetDate: targetDate,
    safetyIssue: refusal !== null ? safetyIssueFrom(refusal, rawTdee, pace.weeklyDeltaKg) : null,
  };
};
