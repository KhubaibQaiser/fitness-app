'use client';

import { useState } from 'react';
import { AlertBanner, Card, FormField, Stat, XStack, YStack } from '@gymos/ui';

type BmiCategory = {
  label: string;
  tone: 'danger' | 'success' | 'warning';
};

const categorize = (bmi: number): BmiCategory => {
  if (bmi < 18.5) return { label: 'Underweight', tone: 'warning' };
  if (bmi < 25) return { label: 'Normal', tone: 'success' };
  if (bmi < 30) return { label: 'Overweight', tone: 'warning' };
  return { label: 'Obese', tone: 'danger' };
};

const parsePositive = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** WHO BMI calculator — client-side only. */
export const ToolsBmi = () => {
  const [weightKg, setWeightKg] = useState('75');
  const [heightCm, setHeightCm] = useState('175');

  const w = parsePositive(weightKg);
  const hCm = parsePositive(heightCm);
  const hM = hCm !== null ? hCm / 100 : null;
  const bmi = w !== null && hM !== null && hM > 0 ? w / (hM * hM) : null;
  const category = bmi !== null ? categorize(bmi) : null;

  return (
    <YStack gap="$4">
      <XStack gap="$3" flexWrap="wrap">
        <YStack flex={1} minWidth={140}>
          <FormField
            label="Weight"
            value={weightKg}
            onChangeText={setWeightKg}
            inputMode="decimal"
            unit="kg"
          />
        </YStack>
        <YStack flex={1} minWidth={140}>
          <FormField
            label="Height"
            value={heightCm}
            onChangeText={setHeightCm}
            inputMode="decimal"
            unit="cm"
          />
        </YStack>
      </XStack>

      <Card>
        <Stat
          label="BMI"
          value={bmi !== null ? bmi.toFixed(1) : '—'}
          {...(category
            ? { hint: category.label, tone: category.tone }
            : { hint: 'Enter weight and height' })}
        />
      </Card>

      {category ? (
        <AlertBanner tone={category.tone} title={category.label}>
          WHO adult categories: underweight {'<'} 18.5 · normal 18.5–24.9 · overweight 25–29.9 ·
          obese ≥ 30.
        </AlertBanner>
      ) : null}
    </YStack>
  );
};
