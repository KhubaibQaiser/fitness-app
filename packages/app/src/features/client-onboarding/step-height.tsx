'use client';

import type { UnitPrefs } from '@gymos/core/units';
import { HeightFields } from '../height-fields';
import type { OnboardingDraft } from './onboarding-types';

export const StepHeight = ({
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
}) => (
  <HeightFields
    unit={prefs.height}
    valueCm={draft.heightCm}
    valueFt={draft.heightFt}
    valueIn={draft.heightIn}
    onChangeCm={(t) => {
      onPatch({ heightCm: t });
      onClearError('height');
    }}
    onChangeFt={(t) => {
      onPatch({ heightFt: t });
      onClearError('height');
    }}
    onChangeIn={(t) => {
      onPatch({ heightIn: t });
      onClearError('height');
    }}
    required
    error={errors.height ?? null}
  />
);
