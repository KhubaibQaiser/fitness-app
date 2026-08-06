export type Sex = 'F' | 'M';

export const ACTIVITY_LEVELS = [1.2, 1.375, 1.55, 1.725, 1.9] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const GOAL_PRESETS = ['LOSE', 'GAIN', 'MAINTAIN', 'RECOMP'] as const;
export type GoalPreset = (typeof GOAL_PRESETS)[number];

export const GOAL_RATES = ['CONSERVATIVE', 'STANDARD', 'AGGRESSIVE'] as const;
export type GoalRate = (typeof GOAL_RATES)[number];

export type PhysiologyInput = {
  readonly sex: Sex;
  readonly ageYears: number;
  readonly heightCm: number;
  readonly weightKg: number;
  /** When known, BMR uses Katch-McArdle instead of Mifflin-St Jeor. */
  readonly bodyFatPct?: number;
  readonly activity: ActivityLevel;
};

export type MacroTargets = {
  readonly kcal: number;
  readonly proteinG: number;
  readonly fatG: number;
  readonly carbsG: number;
  readonly fiberG: number;
};

export type TargetComputation = {
  readonly bmr: number;
  readonly tdee: number;
  readonly targets: MacroTargets;
  /** kg per week implied by the kcal delta; negative = loss. */
  readonly expectedWeeklyDeltaKg: number;
};

export type NutritionRefusal =
  | {
      readonly code: 'CALORIE_FLOOR_VIOLATION';
      readonly floorKcal: number;
      readonly requestedKcal: number;
    }
  | {
      readonly code: 'DEFICIT_CAP_EXCEEDED';
      readonly maxDeficitPct: number;
      readonly requestedDeficitPct: number;
    }
  | { readonly code: 'MACROS_INFEASIBLE'; readonly detail: string };
