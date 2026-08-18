import type { PublicConfig } from '@gymos/contracts';
import type { ActivityLevel } from '@gymos/core/nutrition';
import type { UnitPrefs } from '@gymos/core/units';
import { buildGoalPreview, type GoalPreview } from '../../lib/goal-preview';
import type { OnboardingDraft } from './onboarding-types';
import { resolveHeightCm, resolveWeightKg } from './validate-step';

export const buildOnboardingPreview = (
  draft: OnboardingDraft,
  prefs: UnitPrefs,
  config?: PublicConfig,
  today?: Date,
): GoalPreview | null => {
  const heightCm = resolveHeightCm(draft, prefs);
  const weightKg = resolveWeightKg(draft.weightKg, prefs);
  const startWeightKg = resolveWeightKg(draft.startWeightKg, prefs) ?? weightKg;
  const targetWeightKg = resolveWeightKg(draft.targetWeightKg, prefs);
  if (heightCm === null || weightKg === null || startWeightKg === null) return null;
  const activity = Number(draft.activityLevel);
  if (![1.2, 1.375, 1.55, 1.725, 1.9].includes(activity)) return null;

  return buildGoalPreview({
    sex: draft.sex,
    dob: draft.dob,
    heightCm,
    weightKg,
    activity: activity as ActivityLevel,
    preset: draft.goalPreset,
    rate: draft.goalRate,
    startWeightKg,
    targetWeightKg,
    ...(draft.targetKcal !== null ? { targetKcal: draft.targetKcal } : {}),
    ...(config !== undefined ? { config } : {}),
    ...(today !== undefined ? { today } : {}),
  });
};
