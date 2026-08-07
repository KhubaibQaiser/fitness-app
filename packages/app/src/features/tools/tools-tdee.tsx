'use client';

import { useState } from 'react';
import {
  Card,
  FormField,
  FormSection,
  Muted,
  SegmentedControl,
  Stat,
  XStack,
  YStack,
} from '@gymos/ui';

type Gender = 'M' | 'F';
type Goal = 'maintain' | 'cut' | 'bulk';
type Activity = 1.2 | 1.375 | 1.55 | 1.725 | 1.9;

const ACTIVITY_OPTIONS: { value: Activity; label: string }[] = [
  { value: 1.2, label: '1.2' },
  { value: 1.375, label: '1.375' },
  { value: 1.55, label: '1.55' },
  { value: 1.725, label: '1.725' },
  { value: 1.9, label: '1.9' },
];

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'maintain', label: 'Maintain' },
  { value: 'cut', label: 'Cut' },
  { value: 'bulk', label: 'Bulk' },
];

const parsePositive = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Mifflin–St Jeor TDEE calculator — client-side only. */
export const ToolsTdee = () => {
  const [weightKg, setWeightKg] = useState('75');
  const [heightCm, setHeightCm] = useState('175');
  const [age, setAge] = useState('30');
  const [gender, setGender] = useState<Gender>('M');
  const [activity, setActivity] = useState<Activity>(1.55);
  const [goal, setGoal] = useState<Goal>('maintain');

  const w = parsePositive(weightKg);
  const h = parsePositive(heightCm);
  const a = parsePositive(age);

  const valid = w !== null && h !== null && a !== null;
  const bmr = valid
    ? gender === 'M'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161
    : null;
  const tdee = bmr !== null ? bmr * activity : null;
  const target =
    tdee === null ? null : goal === 'cut' ? tdee - 500 : goal === 'bulk' ? tdee + 300 : tdee;

  return (
    <YStack gap="$4">
      <FormSection title="Inputs">
        <XStack gap="$3" flexWrap="wrap">
          <YStack flex={1} minWidth={120}>
            <FormField
              label="Weight"
              value={weightKg}
              onChangeText={setWeightKg}
              inputMode="decimal"
              unit="kg"
            />
          </YStack>
          <YStack flex={1} minWidth={120}>
            <FormField
              label="Height"
              value={heightCm}
              onChangeText={setHeightCm}
              inputMode="decimal"
              unit="cm"
            />
          </YStack>
          <YStack flex={1} minWidth={120}>
            <FormField label="Age" value={age} onChangeText={setAge} inputMode="numeric" />
          </YStack>
        </XStack>

        <YStack gap="$2" width="100%">
          <Muted fontSize={12} fontWeight="600">
            Gender
          </Muted>
          <SegmentedControl
            ariaLabel="Gender"
            value={gender}
            onChange={setGender}
            options={[
              { value: 'M', label: 'Male' },
              { value: 'F', label: 'Female' },
            ]}
          />
        </YStack>

        <YStack gap="$2" width="100%">
          <Muted fontSize={12} fontWeight="600">
            Activity multiplier
          </Muted>
          <SegmentedControl
            ariaLabel="Activity"
            value={activity}
            onChange={setActivity}
            options={ACTIVITY_OPTIONS}
          />
        </YStack>

        <YStack gap="$2" width="100%">
          <Muted fontSize={12} fontWeight="600">
            Goal
          </Muted>
          <SegmentedControl
            ariaLabel="Goal"
            value={goal}
            onChange={setGoal}
            options={GOAL_OPTIONS}
          />
        </YStack>
      </FormSection>

      <Card>
        <XStack gap="$4" flexWrap="wrap">
          <Stat
            label="BMR"
            value={bmr !== null ? Math.round(bmr).toLocaleString() : '—'}
            hint="kcal/day"
          />
          <Stat
            label="TDEE"
            value={tdee !== null ? Math.round(tdee).toLocaleString() : '—'}
            hint="kcal/day"
          />
          <Stat
            label="Target"
            value={target !== null ? Math.round(target).toLocaleString() : '—'}
            hint={goal === 'cut' ? 'TDEE − 500' : goal === 'bulk' ? 'TDEE + 300' : 'at TDEE'}
          />
        </XStack>
      </Card>
    </YStack>
  );
};
