'use client';

import { Body, SegmentedControl, YStack } from '@gymos/ui';
import { ACTIVITY_LEVELS } from '../../lib/activity-levels';
import type { OnboardingDraft } from './onboarding-types';

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
      options={[...ACTIVITY_LEVELS]}
      value={draft.activityLevel}
      onChange={(activityLevel) => onPatch({ activityLevel })}
    />
  </YStack>
);
