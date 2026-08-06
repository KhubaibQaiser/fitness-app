'use client';

import { FormField, FormSection, YStack } from '@gymos/ui';
import type { OnboardingDraft } from './onboarding-types';

export const StepBody = ({
  draft,
  errors,
  onPatch,
  onClearError,
}: {
  draft: OnboardingDraft;
  errors: Record<string, string>;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
  onClearError: (key: string) => void;
}) => (
  <YStack gap="$4">
    <FormField
      label="Weight"
      value={draft.weightKg}
      onChangeText={(t) => {
        onPatch({
          weightKg: t,
          startWeightKg: draft.startWeightKg === '' ? t : draft.startWeightKg,
        });
        onClearError('weightKg');
      }}
      placeholder="80"
      inputMode="decimal"
      required
      error={errors.weightKg ?? null}
      hint="Kilograms"
    />

    <FormSection title="Measurements (cm, optional)">
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
        />
      ))}
    </FormSection>
  </YStack>
);
