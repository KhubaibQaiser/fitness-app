'use client';

import type { UnitPrefs } from '@gymos/core/units';
import { formatWeight } from '@gymos/core/units';
import { Card, Muted, SectionTitle, Text, XStack, YStack } from '@gymos/ui';
import { GOAL_PRESET_OPTIONS, GOAL_RATE_OPTIONS } from '../../lib/goal-options';
import type { GoalPreview } from '../../lib/goal-preview';
import { formatGoalEta } from '../../lib/goal-preview';
import type { OnboardingDraft } from './onboarding-types';
import { resolveWeightKg } from './validate-step';

const optionLabel = <T extends string>(
  options: readonly { value: T; label: string }[],
  value: T,
): string => options.find((option) => option.value === value)?.label ?? value;

export const OnboardingGoalSummary = ({
  draft,
  prefs,
  preview,
}: {
  draft: OnboardingDraft;
  prefs: UnitPrefs;
  preview: GoalPreview;
}) => {
  const startKg =
    resolveWeightKg(draft.startWeightKg, prefs) ?? resolveWeightKg(draft.weightKg, prefs);
  const targetKg = resolveWeightKg(draft.targetWeightKg, prefs);
  const start = startKg !== null ? formatWeight(startKg, prefs.weight, 1) : null;
  const target = targetKg !== null ? formatWeight(targetKg, prefs.weight, 1) : null;
  const pace = formatWeight(Math.abs(preview.expectedWeeklyDeltaKg), prefs.weight, 2);

  return (
    <YStack gap="$3">
      <YStack gap="$1">
        <SectionTitle>Expected plan</SectionTitle>
        <Text fontFamily="$heading" fontSize={22} fontWeight="800" color="$color">
          The path you’re agreeing to
        </Text>
        <Muted>These estimates set the starting direction and adapt at check-ins.</Muted>
      </YStack>

      <Card padding="$4" gap="$4">
        <XStack flexWrap="wrap" gap="$4">
          {[
            {
              label: 'Goal',
              value: optionLabel(GOAL_PRESET_OPTIONS, draft.goalPreset),
            },
            {
              label: 'Pace',
              value: `${optionLabel(GOAL_RATE_OPTIONS, draft.goalRate)} · ${preview.expectedWeeklyDeltaKg < 0 ? '−' : preview.expectedWeeklyDeltaKg > 0 ? '+' : ''}${pace.value} ${pace.unit}/wk`,
            },
            {
              label: 'Starting weight',
              value: start !== null ? `${start.value} ${start.unit}` : '-',
            },
            {
              label: 'Target weight',
              value: target !== null ? `${target.value} ${target.unit}` : '-',
            },
            {
              label: 'Estimated duration',
              value: formatGoalEta(preview.etaWeeks),
            },
          ].map((item) => (
            <YStack key={item.label} minWidth={145} flexBasis="28%" flexGrow={1} gap={2}>
              <Muted fontSize={11} fontWeight="600" textTransform="uppercase" letterSpacing={0.5}>
                {item.label}
              </Muted>
              <Text fontFamily="$body" fontSize={14} fontWeight="700" color="$color">
                {item.value}
              </Text>
            </YStack>
          ))}
        </XStack>
      </Card>
    </YStack>
  );
};
