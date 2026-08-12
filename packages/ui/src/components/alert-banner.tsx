'use client';

import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';

export type AlertBannerTone = 'danger' | 'warning' | 'success';

const TONE = {
  danger: { bg: '$dangerMuted', bar: '$danger', fg: '$danger' },
  warning: { bg: '$warningMuted', bar: '$warning', fg: '$warning' },
  success: { bg: '$successMuted', bar: '$success', fg: '$success' },
} as const;

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
      borderRadius="$radiusCard"
      overflow="hidden"
      width="100%"
    >
      <YStack width={3} backgroundColor={t.bar} alignSelf="stretch" />
      <XStack
        paddingHorizontal="$3.5"
        paddingVertical="$3"
        gap="$3"
        alignItems="flex-start"
        flex={1}
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
    </XStack>
  );
};
