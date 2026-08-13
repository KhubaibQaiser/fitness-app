'use client';

import { useState } from 'react';
import { parseWeight } from '@gymos/core/units';
import { AlertBanner, Card, FormField, Stat, XStack, YStack } from '@gymos/ui';
import { useMe, usePublicConfig } from '../../api';
import { parsePositive, resolveHeightCmInput } from '../../lib/height-units';
import { unitPrefsFrom } from '../../lib/unit-prefs';
import { HeightFields } from '../height-fields';

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

/** WHO BMI calculator, unit-aware — reads weight/height in the user's unit prefs. */
export const ToolsBmi = () => {
  const me = useMe();
  const config = usePublicConfig();
  const prefs = unitPrefsFrom(me.data, config.data);

  const [weight, setWeight] = useState(() => (prefs.weight === 'kg' ? '75' : '165'));
  const [heightCmInput, setHeightCmInput] = useState('175');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('9');

  const w = parsePositive(weight);
  const weightKg = w !== null ? parseWeight(w, prefs.weight) : null;

  const heightCm = resolveHeightCmInput(prefs.height, {
    cm: heightCmInput,
    ft: heightFt,
    inches: heightIn,
  });

  const heightM = heightCm !== null ? heightCm / 100 : null;
  const bmi =
    weightKg !== null && heightM !== null && heightM > 0 ? weightKg / (heightM * heightM) : null;
  const category = bmi !== null ? categorize(bmi) : null;

  return (
    <YStack gap="$4">
      <XStack gap="$3" flexWrap="wrap">
        <YStack flex={1} minWidth={140}>
          <FormField
            label="Weight"
            value={weight}
            onChangeText={setWeight}
            inputMode="decimal"
            unit={prefs.weight}
          />
        </YStack>
        <YStack flex={1} minWidth={prefs.height === 'cm' ? 140 : 200}>
          <HeightFields
            unit={prefs.height}
            valueCm={heightCmInput}
            valueFt={heightFt}
            valueIn={heightIn}
            onChangeCm={setHeightCmInput}
            onChangeFt={setHeightFt}
            onChangeIn={setHeightIn}
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
