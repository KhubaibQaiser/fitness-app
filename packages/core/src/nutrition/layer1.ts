import { err, ok, type Result } from '../shared/result';
import { assertSafeTargetKcal } from './floors';
import {
  type GoalPreset,
  type GoalRate,
  type MacroTargets,
  type NutritionRefusal,
  type PhysiologyInput,
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

/** Goal adjustment as a fraction of TDEE, by preset and rate. */
const GOAL_DELTA: Record<GoalPreset, Record<GoalRate, number>> = {
  LOSE: { CONSERVATIVE: -0.1, STANDARD: -0.2, AGGRESSIVE: -0.25 },
  RECOMP: { CONSERVATIVE: -0.05, STANDARD: -0.1, AGGRESSIVE: -0.15 },
  MAINTAIN: { CONSERVATIVE: 0, STANDARD: 0, AGGRESSIVE: 0 },
  GAIN: { CONSERVATIVE: 0.05, STANDARD: 0.1, AGGRESSIVE: 0.15 },
};

export const goalDeltaFraction = (preset: GoalPreset, rate: GoalRate): number =>
  GOAL_DELTA[preset][rate];

/** Protein g/kg by goal — higher in a deficit to preserve lean mass. */
const PROTEIN_G_PER_KG: Record<GoalPreset, number> = {
  LOSE: 2.2,
  RECOMP: 2.0,
  GAIN: 1.8,
  MAINTAIN: 1.6,
};

const FAT_G_PER_KG_DEFAULT = 0.9;
const FAT_G_PER_KG_MIN = 0.8;
const PROTEIN_G_PER_KG_MIN = 1.6;

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
    const carbsKcal = kcal - proteinG * 4 - fatG * 9;
    if (carbsKcal >= 0) {
      return ok({ proteinG, fatG, carbsG: Math.round(carbsKcal / 4) });
    }
  }
  return err({
    code: 'MACROS_INFEASIBLE',
    detail: `kcal=${kcal} cannot fit minimum protein/fat for weightKg=${weightKg}`,
  });
};

/**
 * Layer 1 entry point: physiology + goal preset → macro targets.
 * Refuses loudly on floor/deficit/feasibility violations.
 */
export const computeTargets = (
  input: PhysiologyInput,
  preset: GoalPreset,
  rate: GoalRate,
): Result<TargetComputation, NutritionRefusal> => {
  const bmrKcal = bmr(input);
  const tdeeKcal = bmrKcal * input.activity;
  const targetKcal = Math.round(tdeeKcal * (1 + goalDeltaFraction(preset, rate)));

  const safe = assertSafeTargetKcal(targetKcal, tdeeKcal, input.sex);
  if (!safe.ok) return safe;

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
    expectedWeeklyDeltaKg: Number((((targetKcal - tdeeKcal) * 7) / KCAL_PER_KG).toFixed(2)),
  });
};
