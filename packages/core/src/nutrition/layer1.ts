import { err, ok, type Result } from '../shared/result';
import {
  calorieFloor,
  clampToSafeKcal,
  COACH_OVERRIDE_KCAL_MIN,
  explainPaceClamp,
  safeKcalBand,
} from './floors';
import {
  type GoalPreset,
  type GoalRate,
  type MacroTargets,
  type NutritionRefusal,
  type PaceClampReason,
  type PaceOverrideWarning,
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
  /** Desired weekly weight change (kg). Negative = loss. Clamped on the named-pace path. */
  readonly weeklyDeltaKg?: number;
  /**
   * Coach-chosen daily kcal. Skips the 25%/15%/sex-floor clamps; only
   * `COACH_OVERRIDE_KCAL_MIN` (800) binds. Warnings, not refusals.
   */
  readonly targetKcal?: number;
};

export type PaceEnergy = {
  readonly requestedKcal: number;
  readonly targetKcal: number;
  readonly expectedWeeklyDeltaKg: number;
  readonly clamped: boolean;
  readonly clampReasons: readonly PaceClampReason[];
  readonly recommendedKcal: number;
  readonly kcalOverridden: boolean;
  readonly beyondRecommended: boolean;
  readonly belowSexFloor: boolean;
  readonly overrideWarnings: readonly PaceOverrideWarning[];
};

export const weeklyDeltaKgFromKcal = (targetKcal: number, tdeeKcal: number): number =>
  Number((((targetKcal - tdeeKcal) * 7) / KCAL_PER_KG).toFixed(2));

export const intentKcalFromNamedPace = (
  tdeeKcal: number,
  preset: GoalPreset,
  rate: GoalRate,
  weeklyDeltaKg?: number,
): number => {
  if (weeklyDeltaKg !== undefined) {
    return Math.round(tdeeKcal + (weeklyDeltaKg * KCAL_PER_KG) / 7);
  }
  return Math.round(tdeeKcal * (1 + goalDeltaFraction(preset, rate)));
};

export const recommendedKcalForPace = (
  tdeeKcal: number,
  preset: GoalPreset,
  rate: GoalRate,
  input: { sex: Sex; weightKg: number; weeklyDeltaKg?: number },
): number => {
  const requested = intentKcalFromNamedPace(tdeeKcal, preset, rate, input.weeklyDeltaKg);
  return clampToSafeKcal(requested, tdeeKcal, input.sex, {
    weightKg: input.weightKg,
    kcalPerKg: KCAL_PER_KG,
  });
};

const overrideWarningsFor = (input: {
  sex: Sex;
  targetKcal: number;
  recommendedKcal: number;
  aggressiveKcal: number;
  preset: GoalPreset;
  hasExplicitTarget: boolean;
}): readonly PaceOverrideWarning[] => {
  const warnings: PaceOverrideWarning[] = [];
  if (input.hasExplicitTarget && Math.abs(input.targetKcal - input.recommendedKcal) > 1) {
    warnings.push('KCAL_OVERRIDDEN');
  }
  const beyond =
    input.preset === 'GAIN'
      ? input.targetKcal > input.aggressiveKcal + 1
      : input.preset === 'MAINTAIN'
        ? Math.abs(input.targetKcal - input.recommendedKcal) > 1
        : input.targetKcal < input.aggressiveKcal - 1;
  if (input.hasExplicitTarget && beyond) warnings.push('BEYOND_RECOMMENDED');
  if (input.hasExplicitTarget && input.targetKcal < calorieFloor(input.sex)) {
    warnings.push('BELOW_SEX_FLOOR');
  }
  return warnings;
};

/**
 * Named-pace energy: intent kcal → clamp → derive kg/week.
 * Pass `targetKcal` for a coach override: no 25%/sex-floor clamp, min 800 kcal.
 */
export const resolvePaceEnergy = (
  tdeeKcal: number,
  preset: GoalPreset,
  rate: GoalRate,
  input: { sex: Sex; weightKg: number; weeklyDeltaKg?: number; targetKcal?: number },
): PaceEnergy => {
  const recommendedKcal = recommendedKcalForPace(tdeeKcal, preset, rate, input);
  const aggressiveKcal = recommendedKcalForPace(tdeeKcal, preset, 'AGGRESSIVE', input);

  if (input.targetKcal !== undefined) {
    const requestedKcal = Math.round(input.targetKcal);
    const targetKcal = Math.max(COACH_OVERRIDE_KCAL_MIN, requestedKcal);
    const warnings = overrideWarningsFor({
      sex: input.sex,
      targetKcal,
      recommendedKcal,
      aggressiveKcal,
      preset,
      hasExplicitTarget: true,
    });
    return {
      requestedKcal,
      targetKcal,
      expectedWeeklyDeltaKg: weeklyDeltaKgFromKcal(targetKcal, tdeeKcal),
      clamped: targetKcal !== requestedKcal,
      clampReasons: [],
      recommendedKcal,
      kcalOverridden: warnings.includes('KCAL_OVERRIDDEN'),
      beyondRecommended: warnings.includes('BEYOND_RECOMMENDED'),
      belowSexFloor: warnings.includes('BELOW_SEX_FLOOR'),
      overrideWarnings: warnings,
    };
  }

  const weeklyOverride = input.weeklyDeltaKg;
  const requestedKcal = intentKcalFromNamedPace(tdeeKcal, preset, rate, weeklyOverride);
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
    recommendedKcal: targetKcal,
    kcalOverridden: false,
    beyondRecommended: false,
    belowSexFloor: false,
    overrideWarnings: [],
  };
};

export const nearestGoalRate = (
  tdeeKcal: number,
  preset: GoalPreset,
  kcal: number,
  input: { sex: Sex; weightKg: number; weeklyDeltaKg?: number },
): GoalRate => {
  if (preset === 'MAINTAIN') return 'STANDARD';
  const gentle = recommendedKcalForPace(tdeeKcal, preset, 'CONSERVATIVE', input);
  const standard = recommendedKcalForPace(tdeeKcal, preset, 'STANDARD', input);
  const aggressive = recommendedKcalForPace(tdeeKcal, preset, 'AGGRESSIVE', input);
  if (preset === 'GAIN') {
    if (kcal > aggressive) return 'AGGRESSIVE';
    if (kcal < gentle) return 'CONSERVATIVE';
  } else {
    if (kcal < aggressive) return 'AGGRESSIVE';
    if (kcal > gentle) return 'CONSERVATIVE';
  }
  const distances: readonly { rate: GoalRate; kcal: number }[] = [
    { rate: 'CONSERVATIVE', kcal: gentle },
    { rate: 'STANDARD', kcal: standard },
    { rate: 'AGGRESSIVE', kcal: aggressive },
  ];
  let best: { rate: GoalRate; kcal: number } = { rate: 'CONSERVATIVE', kcal: gentle };
  for (const tick of distances) {
    if (Math.abs(tick.kcal - kcal) < Math.abs(best.kcal - kcal)) best = tick;
  }
  return best.rate;
};

export type PaceSliderTone = 'deficit' | 'surplus' | 'neutral';

export const paceSliderBounds = (
  tdeeKcal: number,
  preset: GoalPreset,
): { min: number; max: number; tone: PaceSliderTone } => {
  const tdee = Math.max(1, Math.round(tdeeKcal));
  if (preset === 'GAIN') {
    return {
      min: tdee,
      max: Math.max(Math.floor(tdee * 1.3), tdee + 50),
      tone: 'surplus',
    };
  }
  if (preset === 'MAINTAIN') {
    const pad = Math.max(80, Math.round(tdee * 0.08));
    return {
      min: Math.max(COACH_OVERRIDE_KCAL_MIN, tdee - pad),
      max: tdee + pad,
      tone: 'neutral',
    };
  }
  return { min: COACH_OVERRIDE_KCAL_MIN, max: tdee, tone: 'deficit' };
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

/** Last-resort split for coach overrides: scale protein/fat to fit, carbs may be 0. */
export const splitMacrosForOverride = (
  kcal: number,
  weightKg: number,
  preset: GoalPreset,
): { split: MacroSplit; degraded: boolean } => {
  const fitted = splitMacros(kcal, weightKg, preset);
  if (fitted.ok) return { split: fitted.value, degraded: false };
  const proteinG = Math.round(PROTEIN_G_PER_KG_MIN * weightKg);
  const fatG = Math.round(FAT_G_PER_KG_MIN * weightKg);
  const minKcal = proteinG * KCAL_PER_G.protein + fatG * KCAL_PER_G.fat;
  const scale = Math.min(1, kcal / minKcal);
  return {
    split: {
      proteinG: Math.max(0, Math.round(proteinG * scale)),
      fatG: Math.max(0, Math.round(fatG * scale)),
      carbsG: 0,
    },
    degraded: true,
  };
};

/**
 * Layer 1 entry point: physiology + goal preset → macro targets.
 * Named paces are clamped into the safety band; only infeasible macros refuse.
 * Coach `targetKcal` skips those clamps (min 800) and degrades macros instead of refusing.
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
    ...(opts?.targetKcal !== undefined ? { targetKcal: opts.targetKcal } : {}),
  });
  const targetKcal = energy.targetKcal;
  const isOverride = opts?.targetKcal !== undefined;

  let split: MacroSplit;
  let macrosDegraded = false;
  if (isOverride) {
    const overrideSplit = splitMacrosForOverride(targetKcal, input.weightKg, preset);
    split = overrideSplit.split;
    macrosDegraded = overrideSplit.degraded;
  } else {
    const macros = splitMacros(targetKcal, input.weightKg, preset);
    if (!macros.ok) return macros;
    split = macros.value;
  }

  const targets: MacroTargets = {
    kcal: targetKcal,
    ...split,
    fiberG: Math.round((FIBER_G_PER_1000_KCAL * targetKcal) / 1000),
  };

  const overrideWarnings: PaceOverrideWarning[] = [
    ...energy.overrideWarnings,
    ...(macrosDegraded ? (['MACROS_DEGRADED'] as const) : []),
  ];

  return ok({
    bmr: Math.round(bmrKcal),
    tdee: Math.round(tdeeKcal),
    targets,
    expectedWeeklyDeltaKg: energy.expectedWeeklyDeltaKg,
    requestedKcal: energy.requestedKcal,
    clamped: energy.clamped,
    clampReasons: energy.clampReasons,
    recommendedKcal: energy.recommendedKcal,
    kcalOverridden: energy.kcalOverridden,
    beyondRecommended: energy.beyondRecommended,
    belowSexFloor: energy.belowSexFloor,
    macrosDegraded,
    overrideWarnings,
  });
};
