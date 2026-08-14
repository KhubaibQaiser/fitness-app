'use client';

import type { UnitPrefs } from '@gymos/core/units';
import { FormField, FormSection, XStack, YStack } from '@gymos/ui';
import type { OnboardingDraft } from './onboarding-types';

const MIDLINE = [
  ['waistCm', 'Waist'],
  ['chestCm', 'Chest'],
  ['hipCm', 'Hip'],
] as const;

const BILATERAL = [
  [
    ['armLeftCm', 'Arm left'],
    ['armRightCm', 'Arm right'],
  ],
  [
    ['thighLeftCm', 'Thigh left'],
    ['thighRightCm', 'Thigh right'],
  ],
] as const;

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
      {MIDLINE.map(([key, label]) => (
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
      {BILATERAL.map(([left, right]) => (
        <XStack key={left[0]} gap="$3" width="100%">
          {([left, right] as const).map(([key, label]) => (
            <YStack key={key} flex={1}>
              <FormField
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
            </YStack>
          ))}
        </XStack>
      ))}
    </FormSection>
  </YStack>
);
