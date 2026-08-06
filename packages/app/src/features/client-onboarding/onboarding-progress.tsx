'use client';

import { Body, Muted, XStack, YStack } from '@gymos/ui';
import { STEP_META } from './onboarding-types';

export const OnboardingProgress = ({ stepIndex }: { stepIndex: number }) => {
  const meta = STEP_META[stepIndex];
  const total = STEP_META.length;
  const pct = Math.round(((stepIndex + 1) / total) * 100);

  return (
    <YStack gap="$2" width="100%">
      <XStack justifyContent="space-between" alignItems="baseline">
        <Muted>
          Step {stepIndex + 1} / {total}
          {meta ? ` · ${meta.title}` : ''}
        </Muted>
        <Muted>{pct}%</Muted>
      </XStack>
      <YStack
        height={8}
        backgroundColor="$elevatedBg"
        borderRadius={999}
        overflow="hidden"
        accessibilityRole="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
      >
        <YStack height="100%" width={`${pct}%`} backgroundColor="$primary" />
      </YStack>
      {meta ? (
        <Body fontFamily="$heading" fontWeight="700" fontSize={15}>
          {meta.subtitle}
        </Body>
      ) : null}
    </YStack>
  );
};
