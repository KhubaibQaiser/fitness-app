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

/** Why a named-pace kcal intent was moved into the safe band. */
export type PaceClampReason = 'CALORIE_FLOOR' | 'DEFICIT_CAP' | 'SURPLUS_CAP' | 'BODY_WEIGHT_RATE';

/** Coach override warnings — never refuse create/save on these. */
export type PaceOverrideWarning =
  'KCAL_OVERRIDDEN' | 'BEYOND_RECOMMENDED' | 'BELOW_SEX_FLOOR' | 'MACROS_DEGRADED';

export type TargetComputation = {
  readonly bmr: number;
  readonly tdee: number;
  readonly targets: MacroTargets;
  /** kg per week implied by the resolved kcal delta; negative = loss. */
  readonly expectedWeeklyDeltaKg: number;
  /** Kcal before safety clamp (tenant kg/week, GOAL_DELTA, or coach override). */
  readonly requestedKcal: number;
  readonly clamped: boolean;
  readonly clampReasons: readonly PaceClampReason[];
  /** Clamped named-pace suggestion for the stored rate (tick the coach left). */
  readonly recommendedKcal: number;
  readonly kcalOverridden: boolean;
  readonly beyondRecommended: boolean;
  readonly belowSexFloor: boolean;
  readonly macrosDegraded: boolean;
  readonly overrideWarnings: readonly PaceOverrideWarning[];
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
