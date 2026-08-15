'use client';

import { GhostButton, PrimaryButton, StickyFormFooter } from '@gymos/ui';

export const OnboardingFooter = ({
  canGoBack,
  isLast,
  pending,
  nextDisabled,
  onBack,
  onNext,
}: {
  canGoBack: boolean;
  isLast: boolean;
  pending?: boolean;
  nextDisabled?: boolean;
  onBack: () => void;
  onNext: () => void;
}) => (
  <StickyFormFooter>
    {canGoBack ? (
      <GhostButton flex={1} onPress={onBack} disabled={pending === true}>
        Back
      </GhostButton>
    ) : null}
    <PrimaryButton flex={1} onPress={onNext} disabled={pending === true || nextDisabled === true}>
      {pending === true ? 'Saving…' : isLast ? 'Create client' : 'Continue'}
    </PrimaryButton>
  </StickyFormFooter>
);
