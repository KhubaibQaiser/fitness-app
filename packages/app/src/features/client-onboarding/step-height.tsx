'use client';

import { Body, FormField, SegmentedControl, XStack, YStack } from '@gymos/ui';
import { cmToFtIn, ftInToCm } from './height-units';
import type { HeightUnit, OnboardingDraft } from './onboarding-types';

export const StepHeight = ({
  draft,
  errors,
  onPatch,
  onClearError,
}: {
  draft: OnboardingDraft;
  errors: Record<string, string>;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
  onClearError: (key: string) => void;
}) => {
  const setUnit = (unit: HeightUnit) => {
    if (unit === draft.heightUnit) return;
    if (unit === 'ft_in') {
      const cm = Number(draft.heightCm);
      if (Number.isFinite(cm) && cm > 0) {
        const { ft, inches } = cmToFtIn(cm);
        onPatch({
          heightUnit: unit,
          heightFt: String(ft),
          heightIn: String(inches),
        });
        return;
      }
    } else {
      const ft = Number(draft.heightFt);
      const inches = Number(draft.heightIn || '0');
      if (Number.isFinite(ft) && ft > 0) {
        onPatch({
          heightUnit: unit,
          heightCm: String(ftInToCm(ft, Number.isFinite(inches) ? inches : 0)),
        });
        return;
      }
    }
    onPatch({ heightUnit: unit });
  };

  return (
    <YStack gap="$4">
      <YStack gap="$2">
        <Body fontFamily="$heading" fontWeight="700" fontSize={13}>
          Units
        </Body>
        <SegmentedControl
          ariaLabel="Height units"
          options={[
            { value: 'cm', label: 'cm' },
            { value: 'ft_in', label: 'ft / in' },
          ]}
          value={draft.heightUnit}
          onChange={setUnit}
        />
      </YStack>

      {draft.heightUnit === 'cm' ? (
        <FormField
          label="Height"
          value={draft.heightCm}
          onChangeText={(t) => {
            onPatch({ heightCm: t });
            onClearError('height');
          }}
          placeholder="175"
          inputMode="decimal"
          required
          error={errors.height ?? null}
          hint="Centimeters"
        />
      ) : (
        <XStack gap="$3">
          <YStack flex={1}>
            <FormField
              label="Feet"
              value={draft.heightFt}
              onChangeText={(t) => {
                onPatch({ heightFt: t });
                onClearError('height');
              }}
              placeholder="5"
              inputMode="numeric"
              required
              error={errors.height ?? null}
            />
          </YStack>
          <YStack flex={1}>
            <FormField
              label="Inches"
              value={draft.heightIn}
              onChangeText={(t) => {
                onPatch({ heightIn: t });
                onClearError('height');
              }}
              placeholder="9"
              inputMode="decimal"
            />
          </YStack>
        </XStack>
      )}
    </YStack>
  );
};
