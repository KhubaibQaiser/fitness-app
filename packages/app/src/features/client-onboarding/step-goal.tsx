'use client';

import { Body, FormField, SegmentedControl, YStack } from '@gymos/ui';
import type { GoalPreset, GoalRate, OnboardingDraft } from './onboarding-types';

const PRESETS: { value: GoalPreset; label: string }[] = [
  { value: 'LOSE', label: 'Lose fat' },
  { value: 'RECOMP', label: 'Recomp' },
  { value: 'MAINTAIN', label: 'Maintain' },
  { value: 'GAIN', label: 'Gain' },
];

const RATES: { value: GoalRate; label: string }[] = [
  { value: 'CONSERVATIVE', label: 'Gentle' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'AGGRESSIVE', label: 'Aggressive' },
];

export const StepGoal = ({
  draft,
  errors,
  onPatch,
  onClearError,
}: {
  draft: OnboardingDraft;
  errors: Record<string, string>;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
  onClearError: (key: string) => void;
}) => (
  <YStack gap="$4">
    <YStack gap="$2">
      <Body fontFamily="$heading" fontWeight="700" fontSize={13}>
        Goal
      </Body>
      <SegmentedControl
        ariaLabel="Goal preset"
        options={PRESETS}
        value={draft.goalPreset}
        onChange={(goalPreset) => onPatch({ goalPreset })}
      />
    </YStack>

    <YStack gap="$2">
      <Body fontFamily="$heading" fontWeight="700" fontSize={13}>
        Pace
      </Body>
      <SegmentedControl
        ariaLabel="Goal rate"
        options={RATES}
        value={draft.goalRate}
        onChange={(goalRate) => onPatch({ goalRate })}
      />
    </YStack>

    <FormField
      label="Start weight"
      value={draft.startWeightKg}
      onChangeText={(t) => {
        onPatch({ startWeightKg: t });
        onClearError('startWeightKg');
      }}
      placeholder={draft.weightKg || '80'}
      inputMode="decimal"
      required
      error={errors.startWeightKg ?? null}
      hint="Defaults from body step if left blank"
    />

    <FormField
      label="Target weight"
      value={draft.targetWeightKg}
      onChangeText={(t) => {
        onPatch({ targetWeightKg: t });
        onClearError('targetWeightKg');
      }}
      placeholder="Optional"
      inputMode="decimal"
      error={errors.targetWeightKg ?? null}
    />
  </YStack>
);
