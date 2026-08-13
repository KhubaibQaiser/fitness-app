'use client';

import type { HeightUnit } from '@gymos/core/units';
import { FormField, XStack, YStack } from '@gymos/ui';

type HeightFieldsProps = {
  unit: HeightUnit;
  valueCm: string;
  valueFt: string;
  valueIn: string;
  onChangeCm: (text: string) => void;
  onChangeFt: (text: string) => void;
  onChangeIn: (text: string) => void;
  error?: string | null;
  required?: boolean;
};

/** Prefs-driven height input — cm field, or ft/in side-by-side. Shared by tools + onboarding. */
export const HeightFields = ({
  unit,
  valueCm,
  valueFt,
  valueIn,
  onChangeCm,
  onChangeFt,
  onChangeIn,
  error = null,
  required = false,
}: HeightFieldsProps) => {
  if (unit === 'cm') {
    return (
      <FormField
        label="Height"
        value={valueCm}
        onChangeText={onChangeCm}
        inputMode="decimal"
        unit="cm"
        required={required}
        error={error}
      />
    );
  }

  return (
    <XStack gap="$3" width="100%">
      <YStack flex={1}>
        <FormField
          label="Height"
          value={valueFt}
          onChangeText={onChangeFt}
          inputMode="numeric"
          unit="ft"
          required={required}
          error={error}
        />
      </YStack>
      <YStack flex={1}>
        <FormField
          label={'\u00A0'}
          value={valueIn}
          onChangeText={onChangeIn}
          inputMode="decimal"
          unit="in"
        />
      </YStack>
    </XStack>
  );
};
