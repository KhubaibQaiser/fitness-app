'use client';

import { GhostButton, PrimaryButton, StickyFormFooter } from '@gymos/ui';

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
  <StickyFormFooter>
    {canGoBack ? (
      <GhostButton flex={1} onPress={onBack} disabled={pending === true}>
        Back
      </GhostButton>
    ) : null}
    <PrimaryButton flex={1} onPress={onNext} disabled={pending === true}>
      {pending === true ? 'Saving…' : isLast ? 'Finish' : 'Continue'}
    </PrimaryButton>
  </StickyFormFooter>
);
