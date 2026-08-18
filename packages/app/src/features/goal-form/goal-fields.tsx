'use client';

import type { GoalPreset, GoalRate } from '@gymos/core/nutrition';
import type { UnitPrefs } from '@gymos/core/units';
import { Body, FormField, SegmentedControl, YStack, type FocusChainBind } from '@gymos/ui';
import { ACTIVITY_LEVELS, type ActivityLevelValue } from '../../lib/activity-levels';
import { GOAL_PRESET_OPTIONS } from '../../lib/goal-options';
import type { PaceControlView } from '../../lib/pace-control';
import { PaceField } from './pace-field';

export type GoalFieldsValue = {
  activityLevel: ActivityLevelValue;
  goalPreset: GoalPreset;
  goalRate: GoalRate;
  startWeightKg: string;
  targetWeightKg: string;
  targetKcal: number | null;
};

type Props = {
  value: GoalFieldsValue;
  errors: Record<string, string>;
  prefs: UnitPrefs;
  startWeightPlaceholder?: string;
  startWeightHint?: string;
  onChange: (partial: Partial<GoalFieldsValue>) => void;
  onClearError: (key: string) => void;
  bind?: (name: 'startWeightKg' | 'targetWeightKg') => FocusChainBind;
  pace?: PaceControlView | null;
};

export const GoalFields = ({
  value,
  errors,
  prefs,
  startWeightPlaceholder,
  startWeightHint,
  onChange,
  onClearError,
  bind,
  pace = null,
}: Props) => (
  <YStack gap="$4">
    <YStack gap="$2">
      <Body fontFamily="$heading" fontWeight="700" fontSize={13}>
        Typical week
      </Body>
      <SegmentedControl
        ariaLabel="Activity level"
        options={[...ACTIVITY_LEVELS]}
        value={value.activityLevel}
        onChange={(activityLevel) => onChange({ activityLevel, targetKcal: null })}
      />
    </YStack>

    <YStack gap="$2">
      <Body fontFamily="$heading" fontWeight="700" fontSize={13}>
        Goal
      </Body>
      <SegmentedControl
        ariaLabel="Goal preset"
        options={GOAL_PRESET_OPTIONS}
        value={value.goalPreset}
        onChange={(goalPreset) => onChange({ goalPreset, goalRate: 'STANDARD', targetKcal: null })}
      />
    </YStack>

    <PaceField
      pace={pace}
      onChange={({ targetKcal, goalRate }) => onChange({ targetKcal, goalRate })}
    />

    <FormField
      label="Start weight"
      value={value.startWeightKg}
      onChangeText={(startWeightKg) => {
        onChange({ startWeightKg, targetKcal: null });
        onClearError('startWeightKg');
      }}
      placeholder={startWeightPlaceholder ?? (prefs.weight === 'kg' ? '80' : '176')}
      inputMode="decimal"
      required
      error={errors.startWeightKg ?? null}
      hint={startWeightHint ?? null}
      unit={prefs.weight}
      {...(bind?.('startWeightKg') ?? {})}
    />

    <FormField
      label="Target weight"
      value={value.targetWeightKg}
      onChangeText={(targetWeightKg) => {
        onChange({ targetWeightKg });
        onClearError('targetWeightKg');
      }}
      placeholder={prefs.weight === 'kg' ? '75' : '165'}
      inputMode="decimal"
      required
      error={errors.targetWeightKg ?? null}
      unit={prefs.weight}
      {...(bind?.('targetWeightKg') ?? {})}
    />
  </YStack>
);
