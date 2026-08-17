import { err, ok, type Result } from '../shared/result';
import { clampToSafeKcal, explainPaceClamp, safeKcalBand } from './floors';
import {
  type GoalPreset,
  type GoalRate,
  type MacroTargets,
  type NutritionRefusal,
  type PaceClampReason,
  type PhysiologyInput,
  type Sex,
  type TargetComputation,
} from './types';

/** ~kcal stored per kg of body-weight change (energy-balance approximation). */
export const KCAL_PER_KG = 7700;

/**
 * BMR — Mifflin-St Jeor by default; Katch-McArdle when body fat % is known.
 * Deterministic, auditable arithmetic. Never behind a model (spec §11).
 */
export const bmr = (input: PhysiologyInput): number => {
  const { sex, ageYears, heightCm, weightKg, bodyFatPct } = input;
  if (bodyFatPct !== undefined) {
    const leanMassKg = weightKg * (1 - bodyFatPct / 100);
    return 370 + 21.6 * leanMassKg;
  }
  const sexTerm = sex === 'M' ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + sexTerm;
};

export const tdee = (input: PhysiologyInput): number => bmr(input) * input.activity;

/**
 * Goal adjustment as a fraction of TDEE, by preset and rate.
 * Exported so coach-facing explainers stay in lockstep with the engine.
 */
export const GOAL_DELTA: Record<GoalPreset, Record<GoalRate, number>> = {
  LOSE: { CONSERVATIVE: -0.1, STANDARD: -0.2, AGGRESSIVE: -0.25 },
  RECOMP: { CONSERVATIVE: -0.05, STANDARD: -0.1, AGGRESSIVE: -0.15 },
  MAINTAIN: { CONSERVATIVE: 0, STANDARD: 0, AGGRESSIVE: 0 },
  GAIN: { CONSERVATIVE: 0.05, STANDARD: 0.1, AGGRESSIVE: 0.15 },
};

export const goalDeltaFraction = (preset: GoalPreset, rate: GoalRate): number =>
  GOAL_DELTA[preset][rate];

/**
 * Optional tenant override table: *desired* kg/week by preset × rate.
 * Layer 1 converts that to kcal, then clamps into the safety band. kg/week
 * displayed to coaches is always derived from the clamped target.
 */
export type WeeklyDeltaKgTable = Partial<Record<GoalPreset, Partial<Record<GoalRate, number>>>>;

export const resolveWeeklyDeltaKg = (
  table: WeeklyDeltaKgTable | undefined,
  preset: GoalPreset,
  rate: GoalRate,
): number | undefined => table?.[preset]?.[rate];

export type ComputeTargetsOptions = {
  /** Desired weekly weight change (kg). Negative = loss. Clamped, never echoed. */
  readonly weeklyDeltaKg?: number;
};

export type PaceEnergy = {
  readonly requestedKcal: number;
  readonly targetKcal: number;
  readonly expectedWeeklyDeltaKg: number;
  readonly clamped: boolean;
  readonly clampReasons: readonly PaceClampReason[];
};

export const weeklyDeltaKgFromKcal = (targetKcal: number, tdeeKcal: number): number =>
  Number((((targetKcal - tdeeKcal) * 7) / KCAL_PER_KG).toFixed(2));

/**
 * Named-pace energy: intent kcal → clamp → derive kg/week.
 * Single source of truth for preview, goal create, and plan generation.
 */
export const resolvePaceEnergy = (
  tdeeKcal: number,
  preset: GoalPreset,
  rate: GoalRate,
  input: { sex: Sex; weightKg: number; weeklyDeltaKg?: number },
): PaceEnergy => {
  const weeklyOverride = input.weeklyDeltaKg;
  const requestedKcal =
    weeklyOverride !== undefined
      ? Math.round(tdeeKcal + (weeklyOverride * KCAL_PER_KG) / 7)
      : Math.round(tdeeKcal * (1 + goalDeltaFraction(preset, rate)));
  const band = safeKcalBand(tdeeKcal, input.sex, {
    weightKg: input.weightKg,
    kcalPerKg: KCAL_PER_KG,
  });
  const targetKcal = clampToSafeKcal(requestedKcal, tdeeKcal, input.sex, {
    weightKg: input.weightKg,
    kcalPerKg: KCAL_PER_KG,
  });
  const clampReasons = explainPaceClamp(requestedKcal, targetKcal, band);
  return {
    requestedKcal,
    targetKcal,
    expectedWeeklyDeltaKg: weeklyDeltaKgFromKcal(targetKcal, tdeeKcal),
    clamped: clampReasons.length > 0,
    clampReasons,
  };
};

/** Protein g/kg by goal — higher in a deficit to preserve lean mass. */
export const PROTEIN_G_PER_KG: Record<GoalPreset, number> = {
  LOSE: 2.2,
  RECOMP: 2.0,
  GAIN: 1.8,
  MAINTAIN: 1.6,
};

/** Atwater energy factors used when splitting kcal into macros (kcal/g). */
export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

export const FAT_G_PER_KG_DEFAULT = 0.9;
export const FAT_G_PER_KG_MIN = 0.8;
export const PROTEIN_G_PER_KG_MIN = 1.6;

/** IOM Adequate Intake: grams of fiber per 1000 kcal of the calorie target. */
export const FIBER_G_PER_1000_KCAL = 14;

type MacroSplit = { proteinG: number; fatG: number; carbsG: number };

/**
 * Distribute kcal into macros: protein by goal, fat ~0.9 g/kg, carbs remainder.
 * If the remainder goes negative (short people at floors), degrade fat to its
 * 0.8 g/kg minimum, then protein toward 1.6 g/kg, before giving up.
 * Exported for direct testing of the degradation cascade.
 */
export const splitMacros = (
  kcal: number,
  weightKg: number,
  preset: GoalPreset,
): Result<MacroSplit, NutritionRefusal> => {
  const attempts: readonly { proteinPerKg: number; fatPerKg: number }[] = [
    { proteinPerKg: PROTEIN_G_PER_KG[preset], fatPerKg: FAT_G_PER_KG_DEFAULT },
    { proteinPerKg: PROTEIN_G_PER_KG[preset], fatPerKg: FAT_G_PER_KG_MIN },
    { proteinPerKg: PROTEIN_G_PER_KG_MIN, fatPerKg: FAT_G_PER_KG_MIN },
  ];
  for (const { proteinPerKg, fatPerKg } of attempts) {
    const proteinG = Math.round(proteinPerKg * weightKg);
    const fatG = Math.round(fatPerKg * weightKg);
    const carbsKcal = kcal - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat;
    if (carbsKcal >= 0) {
      return ok({ proteinG, fatG, carbsG: Math.round(carbsKcal / KCAL_PER_G.carbs) });
    }
  }
  return err({
    code: 'MACROS_INFEASIBLE',
    detail: `kcal=${kcal} cannot fit minimum protein/fat for weightKg=${weightKg}`,
  });
};

/**
 * Layer 1 entry point: physiology + goal preset → macro targets.
 * Named paces are clamped into the safety band; only infeasible macros refuse.
 *
 * Default pace is a fraction of TDEE (`GOAL_DELTA`). Pass `opts.weeklyDeltaKg`
 * as a desired rate — calories and displayed kg/week are derived after clamp.
 */
export const computeTargets = (
  input: PhysiologyInput,
  preset: GoalPreset,
  rate: GoalRate,
  opts?: ComputeTargetsOptions,
): Result<TargetComputation, NutritionRefusal> => {
  const bmrKcal = bmr(input);
  const tdeeKcal = bmrKcal * input.activity;
  const energy = resolvePaceEnergy(tdeeKcal, preset, rate, {
    sex: input.sex,
    weightKg: input.weightKg,
    ...(opts?.weeklyDeltaKg !== undefined ? { weeklyDeltaKg: opts.weeklyDeltaKg } : {}),
  });
  const targetKcal = energy.targetKcal;

  const macros = splitMacros(targetKcal, input.weightKg, preset);
  if (!macros.ok) return macros;

  const targets: MacroTargets = {
    kcal: targetKcal,
    ...macros.value,
    fiberG: Math.round((FIBER_G_PER_1000_KCAL * targetKcal) / 1000),
  };

  return ok({
    bmr: Math.round(bmrKcal),
    tdee: Math.round(tdeeKcal),
    targets,
    expectedWeeklyDeltaKg: energy.expectedWeeklyDeltaKg,
    requestedKcal: energy.requestedKcal,
    clamped: energy.clamped,
    clampReasons: energy.clampReasons,
  });
};
