'use client';

import { useState } from 'react';
import {
  bmr as calcBmr,
  tdee as calcTdee,
  goalDeltaFraction,
  KCAL_PER_KG,
  type GoalPreset,
  type GoalRate,
  type Sex,
} from '@gymos/core/nutrition';
import { formatWeight, parseWeight } from '@gymos/core/units';
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
import { useMe, usePublicConfig } from '../../api';
import { ACTIVITY_OPTIONS } from '../../lib/activity-levels';
import { GOAL_PRESET_OPTIONS, GOAL_RATE_OPTIONS } from '../../lib/goal-options';
import { ftInToCm, parsePositive } from '../../lib/height-units';
import { unitPrefsFrom } from '../../lib/unit-prefs';

type Activity = 1.2 | 1.375 | 1.55 | 1.725 | 1.9;

/** Mifflin–St Jeor TDEE calculator, unit-aware and backed by the shared nutrition engine. */
export const ToolsTdee = () => {
  const me = useMe();
  const config = usePublicConfig();
  const prefs = unitPrefsFrom(me.data, config.data);

  const [weight, setWeight] = useState(() => (prefs.weight === 'kg' ? '75' : '165'));
  const [heightCmInput, setHeightCmInput] = useState('175');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('9');
  const [age, setAge] = useState('30');
  const [sex, setSex] = useState<Sex>('M');
  const [activity, setActivity] = useState<Activity>(1.55);
  const [goalPreset, setGoalPreset] = useState<GoalPreset>('MAINTAIN');
  const [goalRate, setGoalRate] = useState<GoalRate>('STANDARD');

  const w = parsePositive(weight);
  const weightKg = w !== null ? parseWeight(w, prefs.weight) : null;

  const heightCm =
    prefs.height === 'cm'
      ? parsePositive(heightCmInput)
      : (() => {
          const ft = parsePositive(heightFt);
          if (ft === null) return null;
          const inches = heightIn.trim() === '' ? 0 : Number(heightIn);
          return Number.isFinite(inches) && inches >= 0 ? ftInToCm(ft, inches) : null;
        })();

  const ageYears = parsePositive(age);

  const valid = weightKg !== null && heightCm !== null && ageYears !== null;
  const bmrValue = valid ? calcBmr({ sex, ageYears, heightCm, weightKg, activity }) : null;
  const tdeeValue = valid ? calcTdee({ sex, ageYears, heightCm, weightKg, activity }) : null;

  const deltaFraction = goalDeltaFraction(goalPreset, goalRate);
  const targetValue = tdeeValue !== null ? Math.round(tdeeValue * (1 + deltaFraction)) : null;
  const weeklyDeltaKg =
    tdeeValue !== null && targetValue !== null
      ? ((targetValue - tdeeValue) * 7) / KCAL_PER_KG
      : null;
  const weeklyDeltaDisplay =
    weeklyDeltaKg !== null ? formatWeight(Math.abs(weeklyDeltaKg), prefs.weight, 2) : null;
  const targetHint =
    weeklyDeltaDisplay === null || weeklyDeltaDisplay.value === 0
      ? 'at TDEE'
      : `${weeklyDeltaKg !== null && weeklyDeltaKg < 0 ? '−' : '+'}${weeklyDeltaDisplay.value} ${weeklyDeltaDisplay.unit}/week`;

  return (
    <YStack gap="$4">
      <FormSection title="Inputs">
        <XStack gap="$3" flexWrap="wrap">
          <YStack flex={1} minWidth={120}>
            <FormField
              label="Weight"
              value={weight}
              onChangeText={setWeight}
              inputMode="decimal"
              unit={prefs.weight}
            />
          </YStack>
          {prefs.height === 'cm' ? (
            <YStack flex={1} minWidth={120}>
              <FormField
                label="Height"
                value={heightCmInput}
                onChangeText={setHeightCmInput}
                inputMode="decimal"
                unit="cm"
              />
            </YStack>
          ) : (
            <>
              <YStack flex={1} minWidth={90}>
                <FormField
                  label="Height"
                  value={heightFt}
                  onChangeText={setHeightFt}
                  inputMode="numeric"
                  unit="ft"
                />
              </YStack>
              <YStack flex={1} minWidth={90}>
                <FormField
                  label={'\u00A0'}
                  value={heightIn}
                  onChangeText={setHeightIn}
                  inputMode="decimal"
                  unit="in"
                />
              </YStack>
            </>
          )}
          <YStack flex={1} minWidth={120}>
            <FormField label="Age" value={age} onChangeText={setAge} inputMode="numeric" />
          </YStack>
        </XStack>

        <YStack gap="$2" width="100%">
          <Muted fontSize={12} fontWeight="600">
            Sex
          </Muted>
          <SegmentedControl
            ariaLabel="Sex"
            value={sex}
            onChange={setSex}
            options={[
              { value: 'M', label: 'Male' },
              { value: 'F', label: 'Female' },
            ]}
          />
        </YStack>

        <YStack gap="$2" width="100%">
          <Muted fontSize={12} fontWeight="600">
            Activity
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
            value={goalPreset}
            onChange={setGoalPreset}
            options={GOAL_PRESET_OPTIONS}
          />
        </YStack>

        <YStack gap="$2" width="100%">
          <Muted fontSize={12} fontWeight="600">
            Pace
          </Muted>
          <SegmentedControl
            ariaLabel="Pace"
            value={goalRate}
            onChange={setGoalRate}
            options={GOAL_RATE_OPTIONS}
          />
        </YStack>
      </FormSection>

      <Card>
        <XStack gap="$4" flexWrap="wrap">
          <Stat
            label="BMR"
            value={bmrValue !== null ? Math.round(bmrValue).toLocaleString() : '—'}
            hint="kcal/day"
          />
          <Stat
            label="TDEE"
            value={tdeeValue !== null ? Math.round(tdeeValue).toLocaleString() : '—'}
            hint="kcal/day"
          />
          <Stat
            label="Target"
            value={targetValue !== null ? targetValue.toLocaleString() : '—'}
            hint={targetHint}
          />
        </XStack>
      </Card>
    </YStack>
  );
};
