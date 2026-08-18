'use client';

import type { GoalPreset, GoalRate } from '@gymos/core/nutrition';
import type { UnitPrefs } from '@gymos/core/units';
import {
  Body,
  FormField,
  PaceSlider,
  SegmentedControl,
  YStack,
  type FocusChainBind,
} from '@gymos/ui';
import { ACTIVITY_LEVELS, type ActivityLevelValue } from '../../lib/activity-levels';
import { GOAL_PRESET_OPTIONS, GOAL_RATE_OPTIONS } from '../../lib/goal-options';
import type { PaceControlView } from '../../lib/pace-control';

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

    <YStack gap="$2">
      <Body fontFamily="$heading" fontWeight="700" fontSize={13}>
        Pace
      </Body>
      {pace !== null ? (
        <PaceSlider
          ariaLabel="Target calories"
          min={pace.min}
          max={pace.max}
          value={pace.value}
          ticks={pace.ticks}
          suggestedValue={pace.suggestedValue}
          tone={pace.tone}
          hint={pace.hint}
          helper={pace.helper}
          warning={pace.warning}
          onChange={(targetKcal) => {
            const unique = new Set(pace.ticks.map((tick) => tick.value));
            if (unique.size === 1) {
              onChange({ targetKcal, goalRate: 'STANDARD' });
              return;
            }
            const nearest = pace.ticks.reduce((best, tick) =>
              Math.abs(tick.value - targetKcal) < Math.abs(best.value - targetKcal) ? tick : best,
            );
            const rate =
              GOAL_RATE_OPTIONS.find((option) => option.label === nearest.label)?.value ??
              'AGGRESSIVE';
            onChange({ targetKcal, goalRate: rate });
          }}
        />
      ) : (
        <Body color="$textMuted" fontSize={13}>
          Enter height, weight and activity to fine-tune target calories.
        </Body>
      )}
    </YStack>

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
