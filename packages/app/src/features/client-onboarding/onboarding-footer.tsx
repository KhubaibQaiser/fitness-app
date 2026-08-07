'use client';

import { GhostButton, PrimaryButton, StickyFormFooter } from '@gymos/ui';
import { useAppChrome } from '../shell/use-app-chrome';

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
}) => {
  const { showMobileTabBar } = useAppChrome();
  const bottomInset = showMobileTabBar ? 72 : 12;

  return (
    <StickyFormFooter bottomInset={bottomInset}>
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
};
