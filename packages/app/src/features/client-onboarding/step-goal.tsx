'use client';

import { useEffect, useRef } from 'react';
import type { UnitPrefs } from '@gymos/core/units';
import { GoalFields } from '../goal-form/goal-fields';
import type { OnboardingDraft } from './onboarding-types';

export const StepGoal = ({
  draft,
  errors,
  prefs,
  onPatch,
  onClearError,
}: {
  draft: OnboardingDraft;
  errors: Record<string, string>;
  prefs: UnitPrefs;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
  onClearError: (key: string) => void;
}) => {
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    if (draft.startWeightKg === '' && draft.weightKg !== '') {
      onPatch({ startWeightKg: draft.weightKg });
    }
    prefilled.current = true;
  }, [draft.startWeightKg, draft.weightKg, onPatch]);

  return (
    <GoalFields
      value={draft}
      errors={errors}
      prefs={prefs}
      {...(draft.weightKg !== '' ? { startWeightPlaceholder: draft.weightKg } : {})}
      startWeightHint="Prefills from the body step"
      onChange={onPatch}
      onClearError={onClearError}
    />
  );
};
