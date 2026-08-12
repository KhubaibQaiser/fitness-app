'use client';

import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { Muted } from './typography';

export const PageHeader = ({
  title,
  subtitle,
  action,
  leading,
  eyebrow,
  strip = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  leading?: ReactNode;
  eyebrow?: string;
  strip?: boolean;
}) => {
  const inner = (
    <XStack alignItems="flex-start" justifyContent="space-between" gap="$3" width="100%">
      <XStack flex={1} gap="$3" alignItems="center" minWidth={0}>
        {leading}
        <YStack flex={1} gap={2} minWidth={0}>
          {eyebrow ? (
            <Muted fontSize={11} fontWeight="500" textTransform="uppercase" letterSpacing={1.2}>
              {eyebrow}
            </Muted>
          ) : null}
          <Text
            fontFamily="$heading"
            fontWeight="700"
            fontSize={strip ? 22 : 20}
            color="$color"
            letterSpacing={-0.3}
            numberOfLines={2}
          >
            {title}
          </Text>
          {subtitle ? (
            <Muted fontSize={13} marginTop={2}>
              {subtitle}
            </Muted>
          ) : null}
        </YStack>
      </XStack>
      {action}
    </XStack>
  );

  if (!strip) return inner;

  return (
    <YStack
      paddingHorizontal="$4"
      paddingTop="$6"
      paddingBottom="$5"
      width="100%"
      alignSelf="stretch"
      $md={{ paddingHorizontal: '$8', paddingTop: '$7' }}
    >
      {inner}
    </YStack>
  );
};
