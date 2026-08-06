import { err, ok, type Result } from '../shared/result';
import { type NutritionRefusal, type Sex } from './types';

/** Hard safety floors — never behind a model, never configurable downward. */
export const CALORIE_FLOOR_KCAL: Record<Sex, number> = { F: 1200, M: 1500 };

/** Maximum allowed deficit as a fraction of TDEE. */
export const MAX_DEFICIT_FRACTION = 0.25;

export const calorieFloor = (sex: Sex): number => CALORIE_FLOOR_KCAL[sex];

/**
 * Generation-path guard: refuses (never silently adjusts) when a target
 * breaches a floor or the deficit cap. Correct-and-loud beats fast-and-wrong.
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
 * Adjustment-path guard: clamps into the safe band instead of refusing —
 * used by the adaptive engine, which must always produce a safe suggestion.
 */
export const clampToSafeKcal = (kcal: number, tdee: number, sex: Sex): number => {
  const floor = calorieFloor(sex);
  const deficitFloor = Math.ceil(tdee * (1 - MAX_DEFICIT_FRACTION));
  return Math.max(kcal, floor, deficitFloor);
};
