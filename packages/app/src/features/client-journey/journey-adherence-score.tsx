'use client';

import { Text, YStack } from '@gymos/ui';
import { adherenceScoreTone } from './client-journey';

const TONE = {
  danger: { background: '$dangerMuted', foreground: '$danger', border: '$danger' },
  warning: { background: '$warningMuted', foreground: '$warning', border: '$warning' },
  success: { background: '$successMuted', foreground: '$success', border: '$success' },
} as const;

export const JourneyAdherenceScore = ({ score }: { score: number }) => {
  const tone = TONE[adherenceScoreTone(score)];
  return (
    <YStack alignItems="center" gap={2} flexShrink={0}>
      <YStack
        width={52}
        height={52}
        borderRadius={26}
        alignItems="center"
        justifyContent="center"
        backgroundColor={tone.background}
        borderWidth={1.5}
        borderColor={tone.border}
        accessibilityLabel={`Plan adherence ${score} out of 10`}
        role="img"
      >
        <Text
          fontFamily="$mono"
          fontWeight="700"
          fontSize={18}
          lineHeight={22}
          color={tone.foreground}
        >
          {score}
        </Text>
        <Text
          fontFamily="$mono"
          fontWeight="500"
          fontSize={9}
          lineHeight={11}
          color={tone.foreground}
          opacity={0.8}
        >
          /10
        </Text>
      </YStack>
      <Text
        fontFamily="$body"
        fontSize={9}
        lineHeight={12}
        fontWeight="600"
        letterSpacing={0.4}
        textTransform="uppercase"
        color="$textMuted"
      >
        Adherence
      </Text>
    </YStack>
  );
};
