'use client';

import type { ReactNode } from 'react';
import { XStack, YStack } from 'tamagui';
import { Muted, Title } from './typography';

export const PageHeader = ({
  title,
  subtitle,
  action,
  leading,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  leading?: ReactNode;
}) => (
  <XStack alignItems="flex-start" justifyContent="space-between" gap="$3" width="100%">
    <XStack flex={1} gap="$3" alignItems="center" minWidth={0}>
      {leading}
      <YStack flex={1} gap="$1" minWidth={0}>
        <Title numberOfLines={2}>{title}</Title>
        {subtitle ? <Muted>{subtitle}</Muted> : null}
      </YStack>
    </XStack>
    {action}
  </XStack>
);
