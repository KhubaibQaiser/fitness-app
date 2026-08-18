'use client';

import type { UnitPrefs } from '@gymos/core/units';
import { FormField, FormSection, useFocusChain, XStack, YStack } from '@gymos/ui';
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

const FIELD_ORDER = [
  'weightKg',
  ...MIDLINE.map(([key]) => key),
  ...BILATERAL.flatMap(([left, right]) => [left[0], right[0]]),
] as const;

export const StepBody = ({
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
  const chain = useFocusChain(FIELD_ORDER, { onSubmit: onComplete });

  return (
    <YStack gap="$4">
      {chain.toolbar}
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
        {...chain.bind('weightKg')}
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
            {...chain.bind(key)}
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
                  {...chain.bind(key)}
                />
              </YStack>
            ))}
          </XStack>
        ))}
      </FormSection>
    </YStack>
  );
};
