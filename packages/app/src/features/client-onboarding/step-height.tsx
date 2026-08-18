'use client';

import type { UnitPrefs } from '@gymos/core/units';
import { useFocusChain } from '@gymos/ui';
import { HeightFields } from '../height-fields';
import type { OnboardingDraft } from './onboarding-types';

export const StepHeight = ({
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
  const names =
    prefs.height === 'cm' ? (['heightCm'] as const) : (['heightFt', 'heightIn'] as const);
  const chain = useFocusChain(names, { onSubmit: onComplete });

  return (
    <>
      {chain.toolbar}
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
        cmField={chain.bind('heightCm')}
        ftField={chain.bind('heightFt')}
        inField={chain.bind('heightIn')}
      />
    </>
  );
};
