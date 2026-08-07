'use client';

import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';

export type AlertBannerTone = 'danger' | 'warning' | 'success';

const TONE = {
  danger: {
    bg: '$dangerMuted',
    border: '$danger',
    fg: '$danger',
  },
  warning: {
    bg: '$warningMuted',
    border: '$warning',
    fg: '$warning',
  },
  success: {
    bg: '$successMuted',
    border: '$success',
    fg: '$success',
  },
} as const;

/** Kit-style bordered muted status banner. */
export const AlertBanner = ({
  tone,
  title,
  children,
  icon,
}: {
  tone: AlertBannerTone;
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
}) => {
  const t = TONE[tone];
  return (
    <XStack
      role="status"
      backgroundColor={t.bg}
      borderWidth={1}
      borderColor={t.border}
      borderRadius="$radiusCard"
      paddingHorizontal="$3.5"
      paddingVertical="$3"
      gap="$3"
      alignItems="flex-start"
      width="100%"
    >
      {icon}
      <YStack flex={1} gap="$1" minWidth={0}>
        {title ? (
          <Text fontFamily="$heading" fontWeight="700" fontSize={13} color={t.fg}>
            {title}
          </Text>
        ) : null}
        {typeof children === 'string' ? (
          <Text fontFamily="$body" fontSize={12.5} color="$color" lineHeight={18}>
            {children}
          </Text>
        ) : (
          children
        )}
      </YStack>
    </XStack>
  );
};
