'use client';

import type { UnitPrefs } from '@gymos/core/units';
import { FormField, FormSection, YStack } from '@gymos/ui';
import type { OnboardingDraft } from './onboarding-types';

export const StepBody = ({
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
  <YStack gap="$4">
    <FormField
      label="Weight"
      value={draft.weightKg}
      onChangeText={(t) => {
        onPatch({ weightKg: t });
        onClearError('weightKg');
      }}
      placeholder={prefs.weight === 'kg' ? '80' : '176'}
      inputMode="decimal"
      required
      error={errors.weightKg ?? null}
      hint={prefs.weight === 'kg' ? 'Kilograms' : 'Pounds'}
      unit={prefs.weight}
    />

    <FormSection title={`Measurements (${prefs.length}, optional)`}>
      {(
        [
          ['waistCm', 'Waist'],
          ['chestCm', 'Chest'],
          ['hipCm', 'Hip'],
          ['armCm', 'Arm'],
          ['thighCm', 'Thigh'],
        ] as const
      ).map(([key, label]) => (
        <FormField
          key={key}
          label={label}
          value={draft[key]}
          onChangeText={(t) => {
            onPatch({ [key]: t });
            onClearError(key);
          }}
          placeholder="—"
          inputMode="decimal"
          error={errors[key] ?? null}
          unit={prefs.length}
        />
      ))}
    </FormSection>
  </YStack>
);
