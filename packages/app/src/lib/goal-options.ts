import type { GoalPreset, GoalRate } from '@gymos/core/nutrition';

/**
 * Shared goal preset/pace labels — reused by client onboarding and Tools so the
 * language a coach sees when setting a client's goal matches the calculators.
 */
export const GOAL_PRESET_OPTIONS: { value: GoalPreset; label: string }[] = [
  { value: 'LOSE', label: 'Lose fat' },
  { value: 'RECOMP', label: 'Recomp' },
  { value: 'MAINTAIN', label: 'Maintain' },
  { value: 'GAIN', label: 'Gain' },
];

export const GOAL_RATE_OPTIONS: { value: GoalRate; label: string }[] = [
  { value: 'CONSERVATIVE', label: 'Gentle' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'AGGRESSIVE', label: 'Aggressive' },
];
