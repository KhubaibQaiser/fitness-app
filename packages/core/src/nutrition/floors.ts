import { err, ok, type Result } from '../shared/result';
import { type NutritionRefusal, type PaceClampReason, type Sex } from './types';

/** Hard safety floors — never behind a model, never configurable downward. */
export const CALORIE_FLOOR_KCAL: Record<Sex, number> = { F: 1200, M: 1500 };

/** Maximum allowed deficit as a fraction of TDEE. */
export const MAX_DEFICIT_FRACTION = 0.25;

/** Maximum allowed surplus as a fraction of TDEE (GAIN aggressive ceiling). */
export const MAX_SURPLUS_FRACTION = 0.15;

/** ISSN-aligned cap: |weekly kg| may not exceed this fraction of current body weight. */
export const MAX_WEEKLY_BW_FRACTION = 0.01;

export const calorieFloor = (sex: Sex): number => CALORIE_FLOOR_KCAL[sex];

export type SafeKcalBandOpts = {
  readonly weightKg?: number;
  readonly kcalPerKg?: number;
};

export type SafeKcalBand = {
  readonly min: number;
  readonly max: number;
  readonly sexFloor: number;
  readonly deficitFloor: number;
  readonly surplusCeil: number;
  readonly bwFloor: number | null;
  readonly bwCeil: number | null;
};

/**
 * Inclusive safe kcal interval. When `max` would fall below `min` (TDEE under the
 * sex floor), `max` is raised to `min` so the floor always wins.
 */
export const safeKcalBand = (tdee: number, sex: Sex, opts?: SafeKcalBandOpts): SafeKcalBand => {
  const sexFloor = calorieFloor(sex);
  const deficitFloor = Math.ceil(tdee * (1 - MAX_DEFICIT_FRACTION));
  const surplusCeil = Math.floor(tdee * (1 + MAX_SURPLUS_FRACTION));
  let min = Math.max(sexFloor, deficitFloor);
  let max = surplusCeil;
  let bwFloor: number | null = null;
  let bwCeil: number | null = null;
  if (opts?.weightKg !== undefined && opts.kcalPerKg !== undefined) {
    const bwKcal = (opts.weightKg * MAX_WEEKLY_BW_FRACTION * opts.kcalPerKg) / 7;
    bwFloor = Math.ceil(tdee - bwKcal);
    bwCeil = Math.floor(tdee + bwKcal);
    min = Math.max(min, bwFloor);
    max = Math.min(max, bwCeil);
  }
  if (max < min) max = min;
  return { min, max, sexFloor, deficitFloor, surplusCeil, bwFloor, bwCeil };
};

/**
 * Strict validator for a *typed* kcal figure. Named paces use `clampToSafeKcal`
 * instead — coaches pick Gentle/Standard/Aggressive, not a raw 70 kcal target.
 */
export const assertSafeTargetKcal = (
  kcal: number,
  tdee: number,
  sex: Sex,
): Result<number, NutritionRefusal> => {
  const floor = calorieFloor(sex);
  if (kcal < floor) {
    return err({ code: 'CALORIE_FLOOR_VIOLATION', floorKcal: floor, requestedKcal: kcal });
  }
  const deficitPct = (tdee - kcal) / tdee;
  if (deficitPct > MAX_DEFICIT_FRACTION) {
    return err({
      code: 'DEFICIT_CAP_EXCEEDED',
      maxDeficitPct: MAX_DEFICIT_FRACTION,
      requestedDeficitPct: Number(deficitPct.toFixed(4)),
    });
  }
  return ok(kcal);
};

/**
 * Named-pace / adaptive guard: move kcal into the safe band instead of refusing.
 */
export const clampToSafeKcal = (
  kcal: number,
  tdee: number,
  sex: Sex,
  opts?: SafeKcalBandOpts,
): number => {
  const { min, max } = safeKcalBand(tdee, sex, opts);
  return Math.min(Math.max(kcal, min), max);
};

export const explainPaceClamp = (
  requestedKcal: number,
  targetKcal: number,
  band: SafeKcalBand,
): readonly PaceClampReason[] => {
  if (Math.abs(targetKcal - requestedKcal) <= 1) return [];
  if (requestedKcal < targetKcal) {
    if (targetKcal === band.deficitFloor) return ['DEFICIT_CAP'];
    if (targetKcal === band.sexFloor) return ['CALORIE_FLOOR'];
    return ['BODY_WEIGHT_RATE'];
  }
  if (targetKcal === band.surplusCeil) return ['SURPLUS_CAP'];
  return ['BODY_WEIGHT_RATE'];
};
