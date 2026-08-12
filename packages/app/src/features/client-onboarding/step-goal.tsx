'use client';

import { useEffect, useRef } from 'react';
import type { UnitPrefs } from '@gymos/core/units';
import { Body, FormField, SegmentedControl, YStack } from '@gymos/ui';
import { GOAL_PRESET_OPTIONS, GOAL_RATE_OPTIONS } from '../../lib/goal-options';
import type { OnboardingDraft } from './onboarding-types';

export const StepGoal = ({
  draft,
  errors,
  prefs,
  onPatch,
  onClearError,
}: {
  draft: OnboardingDraft;
  errors: Record<string, string>;
  prefs: UnitPrefs;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
  onClearError: (key: string) => void;
}) => {
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    if (draft.startWeightKg === '' && draft.weightKg !== '') {
      onPatch({ startWeightKg: draft.weightKg });
    }
    prefilled.current = true;
  }, [draft.startWeightKg, draft.weightKg, onPatch]);

  return (
    <YStack gap="$4">
      <YStack gap="$2">
        <Body fontFamily="$heading" fontWeight="700" fontSize={13}>
          Goal
        </Body>
        <SegmentedControl
          ariaLabel="Goal preset"
          options={GOAL_PRESET_OPTIONS}
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
          options={GOAL_RATE_OPTIONS}
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
        placeholder={draft.weightKg || (prefs.weight === 'kg' ? '80' : '176')}
        inputMode="decimal"
        required
        error={errors.startWeightKg ?? null}
        hint="Prefills from the body step"
        unit={prefs.weight}
      />

      <FormField
        label="Target weight"
        value={draft.targetWeightKg}
        onChangeText={(t) => {
          onPatch({ targetWeightKg: t });
          onClearError('targetWeightKg');
        }}
        placeholder={prefs.weight === 'kg' ? '75' : '165'}
        inputMode="decimal"
        required
        error={errors.targetWeightKg ?? null}
        unit={prefs.weight}
      />
    </YStack>
  );
};
