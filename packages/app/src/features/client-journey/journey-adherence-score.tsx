'use client';

import { Text, YStack } from '@gymos/ui';
import { adherenceScoreTone } from './client-journey';

const TONE = {
  danger: { background: '$dangerMuted', foreground: '$danger' },
  warning: { background: '$warningMuted', foreground: '$warning' },
  success: { background: '$successMuted', foreground: '$success' },
} as const;

export const JourneyAdherenceScore = ({ score }: { score: number }) => {
  const tone = TONE[adherenceScoreTone(score)];
  return (
    <YStack
      width={48}
      height={48}
      borderRadius={24}
      alignItems="center"
      justifyContent="center"
      backgroundColor={tone.background}
      accessibilityLabel={`Plan adherence ${score} out of 10`}
      role="img"
    >
      <Text fontFamily="$heading" fontWeight="800" fontSize={17} color={tone.foreground}>
        {score}
      </Text>
      <Text fontFamily="$body" fontWeight="600" fontSize={8} color={tone.foreground}>
        / 10
      </Text>
    </YStack>
  );
};
