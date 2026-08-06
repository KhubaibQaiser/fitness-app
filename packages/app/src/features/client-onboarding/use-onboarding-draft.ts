'use client';

import { useState } from 'react';
import type { OnboardingDraft } from './onboarding-types';
import { INITIAL_DRAFT } from './onboarding-types';

export const useOnboardingDraft = () => {
  const [draft, setDraft] = useState<OnboardingDraft>(INITIAL_DRAFT);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const patch = (partial: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  return {
    draft,
    patch,
    stepIndex,
    setStepIndex,
    errors,
    setErrors,
    clearError,
  };
};
