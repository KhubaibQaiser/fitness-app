'use client';

import { GhostButton, PrimaryButton, XStack } from '@gymos/ui';

export const OnboardingFooter = ({
  canGoBack,
  isLast,
  pending,
  onBack,
  onNext,
}: {
  canGoBack: boolean;
  isLast: boolean;
  pending?: boolean;
  onBack: () => void;
  onNext: () => void;
}) => (
  <XStack gap="$2" width="100%" paddingTop="$2">
    {canGoBack ? (
      <GhostButton flex={1} onPress={onBack} disabled={pending === true}>
        Back
      </GhostButton>
    ) : null}
    <PrimaryButton flex={1} onPress={onNext} disabled={pending === true}>
      {pending === true ? 'Saving…' : isLast ? 'Finish' : 'Continue'}
    </PrimaryButton>
  </XStack>
);
