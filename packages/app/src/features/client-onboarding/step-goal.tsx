'use client';

import { useEffect, useRef } from 'react';
import type { ActivityLevel } from '@gymos/core/nutrition';
import type { UnitPrefs } from '@gymos/core/units';
import { useFocusChain, YStack } from '@gymos/ui';
import { usePublicConfig } from '../../api';
import { weeklyDeltaKgFromPublicConfig } from '../../lib/goal-pace';
import { ageYearsFromDob } from '../../lib/goal-preview';
import { buildPaceControlView } from '../../lib/pace-control';
import { GoalFields } from '../goal-form/goal-fields';
import type { OnboardingDraft } from './onboarding-types';
import { resolveHeightCm, resolveWeightKg } from './validate-step';

export const StepGoal = ({
  draft,
  errors,
  prefs,
  onPatch,
  onClearError,
  onComplete,
}: {
  draft: OnboardingDraft;
  errors: Record<string, string>;
  prefs: UnitPrefs;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
  onClearError: (key: string) => void;
  onComplete: () => void;
}) => {
  const prefilled = useRef(false);
  const chain = useFocusChain(['startWeightKg', 'targetWeightKg'], { onSubmit: onComplete });
  const config = usePublicConfig();

  useEffect(() => {
    if (prefilled.current) return;
    if (draft.startWeightKg === '' && draft.weightKg !== '') {
      onPatch({ startWeightKg: draft.weightKg });
    }
    prefilled.current = true;
  }, [draft.startWeightKg, draft.weightKg, onPatch]);

  const heightCm = resolveHeightCm(draft, prefs);
  const weightKg =
    resolveWeightKg(draft.startWeightKg, prefs) ?? resolveWeightKg(draft.weightKg, prefs);
  const activity = Number(draft.activityLevel) as ActivityLevel;
  const pace =
    heightCm !== null && weightKg !== null
      ? buildPaceControlView({
          sex: draft.sex,
          ageYears: ageYearsFromDob(draft.dob),
          heightCm,
          weightKg,
          activity,
          preset: draft.goalPreset,
          rate: draft.goalRate,
          ...(draft.targetKcal !== null ? { targetKcal: draft.targetKcal } : {}),
          weeklyDeltaForRate: (rate) =>
            weeklyDeltaKgFromPublicConfig(config.data, draft.goalPreset, rate),
        })
      : null;

  return (
    <YStack gap="$4">
      {chain.toolbar}
      <GoalFields
        value={draft}
        errors={errors}
        prefs={prefs}
        {...(draft.weightKg !== '' ? { startWeightPlaceholder: draft.weightKg } : {})}
        startWeightHint="Prefills from the body step"
        onChange={onPatch}
        onClearError={onClearError}
        bind={chain.bind}
        pace={pace}
      />
    </YStack>
  );
};
