'use client';

import { Body, SegmentedControl, YStack } from '@gymos/ui';
import type { ActivityLevel, OnboardingDraft } from './onboarding-types';

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: '1.2', label: 'Sedentary' },
  { value: '1.375', label: 'Light' },
  { value: '1.55', label: 'Moderate' },
  { value: '1.725', label: 'Very' },
  { value: '1.9', label: 'Athlete' },
];

export const StepActivity = ({
  draft,
  onPatch,
}: {
  draft: OnboardingDraft;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
}) => (
  <YStack gap="$3">
    <Body fontFamily="$heading" fontWeight="700" fontSize={13}>
      Typical week
    </Body>
    <SegmentedControl
      ariaLabel="Activity level"
      options={ACTIVITY_LEVELS}
      value={draft.activityLevel}
      onChange={(activityLevel) => onPatch({ activityLevel })}
    />
  </YStack>
);
