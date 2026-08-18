'use client';

import { useState } from 'react';
import {
  bmr as calcBmr,
  tdee as calcTdee,
  type GoalPreset,
  type GoalRate,
  type Sex,
} from '@gymos/core/nutrition';
import { parseWeight } from '@gymos/core/units';
import {
  Card,
  FormField,
  FormSection,
  Muted,
  SegmentedControl,
  Stat,
  useFocusChain,
  XStack,
  YStack,
} from '@gymos/ui';
import { useMe, usePublicConfig } from '../../api';
import { ACTIVITY_OPTIONS } from '../../lib/activity-levels';
import { GOAL_PRESET_OPTIONS } from '../../lib/goal-options';
import { weeklyDeltaKgFromPublicConfig } from '../../lib/goal-pace';
import { parsePositive, resolveHeightCmInput } from '../../lib/height-units';
import { buildPaceControlView } from '../../lib/pace-control';
import { unitPrefsFrom } from '../../lib/unit-prefs';
import { PaceField } from '../goal-form/pace-field';
import { HeightFields } from '../height-fields';

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
  const [goalPreset, setGoalPreset] = useState<GoalPreset>('LOSE');
  const [goalRate, setGoalRate] = useState<GoalRate>('STANDARD');
  const [targetKcal, setTargetKcal] = useState<number | null>(null);

  const w = parsePositive(weight);
  const weightKg = w !== null ? parseWeight(w, prefs.weight) : null;

  const heightCm = resolveHeightCmInput(prefs.height, {
    cm: heightCmInput,
    ft: heightFt,
    inches: heightIn,
  });

  const ageYears = parsePositive(age);

  const valid = weightKg !== null && heightCm !== null && ageYears !== null;
  const bmrValue = valid ? calcBmr({ sex, ageYears, heightCm, weightKg, activity }) : null;
  const tdeeValue = valid ? calcTdee({ sex, ageYears, heightCm, weightKg, activity }) : null;

  const pace = valid
    ? buildPaceControlView({
        sex,
        ageYears,
        heightCm,
        weightKg,
        activity,
        preset: goalPreset,
        rate: goalRate,
        ...(targetKcal !== null ? { targetKcal } : {}),
        weeklyDeltaForRate: (rate) => weeklyDeltaKgFromPublicConfig(config.data, goalPreset, rate),
      })
    : null;
  const targetValue = pace?.value ?? null;
  const targetHint = pace === null ? 'at TDEE' : pace.hint;

  const names =
    prefs.height === 'cm'
      ? (['weight', 'heightCm', 'age'] as const)
      : (['weight', 'heightFt', 'heightIn', 'age'] as const);
  const chain = useFocusChain(names);

  return (
    <YStack gap="$4">
      {chain.toolbar}
      <FormSection title="Inputs">
        <XStack gap="$3" flexWrap="wrap">
          <YStack flex={1} minWidth={120}>
            <FormField
              label="Weight"
              value={weight}
              onChangeText={setWeight}
              inputMode="decimal"
              unit={prefs.weight}
              {...chain.bind('weight')}
            />
          </YStack>
          <YStack flex={1} minWidth={prefs.height === 'cm' ? 120 : 200}>
            <HeightFields
              unit={prefs.height}
              valueCm={heightCmInput}
              valueFt={heightFt}
              valueIn={heightIn}
              onChangeCm={setHeightCmInput}
              onChangeFt={setHeightFt}
              onChangeIn={setHeightIn}
              cmField={chain.bind('heightCm')}
              ftField={chain.bind('heightFt')}
              inField={chain.bind('heightIn')}
            />
          </YStack>
          <YStack flex={1} minWidth={120}>
            <FormField
              label="Age"
              value={age}
              onChangeText={setAge}
              inputMode="numeric"
              {...chain.bind('age')}
            />
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
            onChange={(next) => {
              setGoalPreset(next);
              setGoalRate('STANDARD');
              setTargetKcal(null);
            }}
            options={GOAL_PRESET_OPTIONS}
          />
        </YStack>

        <PaceField
          pace={pace}
          emptyHint="Enter weight, height and age to set a calorie target."
          onChange={({ targetKcal: kcal, goalRate: rate }) => {
            setTargetKcal(kcal);
            setGoalRate(rate);
          }}
        />
      </FormSection>

      <Card>
        <XStack gap="$4" flexWrap="wrap">
          <Stat
            label="BMR"
            value={bmrValue !== null ? Math.round(bmrValue).toLocaleString() : '-'}
            hint="kcal/day"
          />
          <Stat
            label="TDEE"
            value={tdeeValue !== null ? Math.round(tdeeValue).toLocaleString() : '-'}
            hint="kcal/day"
          />
          <Stat
            label="Target"
            value={targetValue !== null ? targetValue.toLocaleString() : '-'}
            hint={targetHint}
          />
        </XStack>
      </Card>
    </YStack>
  );
};
